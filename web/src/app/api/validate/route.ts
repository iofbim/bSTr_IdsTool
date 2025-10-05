import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const idsXmlBlob = form.get("idsXml");
    const ifcFile = form.get("ifc");

    if (!(idsXmlBlob instanceof Blob) || !(ifcFile instanceof Blob)) {
      return Response.json({ ok: false, error: "Missing idsXml or ifc" }, { status: 400 });
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ids-"));
    const idsPath = path.join(tmpDir, "spec.ids.xml");
    const ifcPath = path.join(tmpDir, "model.ifc");

    await fs.writeFile(idsPath, Buffer.from(await idsXmlBlob.arrayBuffer()));
    await fs.writeFile(ifcPath, Buffer.from(await ifcFile.arrayBuffer()));

    // Attempt to run IfcTester via Python. If not installed, return an informative message.
    const result = await runIfcTester(idsPath, ifcPath);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

function runIfcTester(idsPath: string, ifcPath: string): Promise<{ ok: boolean; summary: string; details?: unknown }>{
  // Inline Python that uses IfcOpenShell's IDS validator if available.
  const pyScript = `
import json, sys
try:
    import ifcopenshell
    from ifcopenshell import ids as ids_mod
except Exception as e:
    print(json.dumps({"ok": False, "summary": "IfcOpenShell IDS not available", "details": str(e)}))
    sys.exit(0)

ids_path = sys.argv[1]
ifc_path = sys.argv[2]
try:
    spec = ids_mod.load(ids_path)
    model = ifcopenshell.open(ifc_path)
    report = spec.validate(model)
    # report is an iterator; collect minimal summary
    results = []
    ok_overall = True
    for r in report:
        item = {
            "applicability": str(getattr(r, 'applicability', None)),
            "requirement": str(getattr(r, 'requirement', None)),
            "result": getattr(r, 'result', None),
            "entities": getattr(r, 'entities', None),
        }
        ok_overall = ok_overall and bool(item["result"]) if item["result"] is not None else ok_overall
        results.append(item)
    out = {"ok": ok_overall, "summary": "Validation completed", "details": results}
    print(json.dumps(out))
except Exception as e:
    print(json.dumps({"ok": False, "summary": "Validation failed", "details": str(e)}))
`;

  return new Promise((resolve) => {
    const py = spawn(process.env.PYTHON || "python", ["-c", pyScript, idsPath, ifcPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));
    py.on("close", () => {
      try {
        const parsed = JSON.parse(out.trim() || "{}");
        if (parsed && typeof parsed === "object" && ("ok" in parsed)) {
          resolve(parsed);
        } else {
          resolve({ ok: false, summary: "IfcTester returned no result", details: err || out });
        }
      } catch {
        resolve({ ok: false, summary: "Could not parse IfcTester output", details: err || out });
      }
    });
    py.on("error", () => {
      resolve({
        ok: false,
        summary: "Python/IfcTester not available",
        details:
          "Ensure Python and IfcOpenShell with IDS module are installed: pip install ifcopenshell (or use IfcTester CLI)",
      });
    });
  });
}
