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
    # IDS functionality is provided by the separate 'ifctester' package
    from ifctester import ids as ids_mod
    from ifctester import reporter as ids_reporter
except Exception as e:
    print(json.dumps({"ok": False, "summary": "IfcTester IDS not available", "details": str(e)}))
    sys.exit(0)

ids_path = sys.argv[1]
ifc_path = sys.argv[2]
try:
    # Load IDS, validate, and emit IfcTester JSON report
    spec = ids_mod.open(ids_path)
    model = ifcopenshell.open(ifc_path)
    spec.validate(model)
    rep = ids_reporter.Json(spec)
    rep.report()
    print(rep.to_string())
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
        if (parsed && typeof parsed === "object") {
          if ("ok" in parsed) {
            resolve(parsed);
            return;
          }
          if ("status" in parsed) {
            resolve({ ok: Boolean(parsed.status), summary: "Validation completed", details: parsed });
            return;
          }
        }
        resolve({ ok: false, summary: "IfcTester returned no result", details: err || out });
      } catch {
        resolve({ ok: false, summary: "Could not parse IfcTester output", details: err || out });
      }
    });
    py.on("error", () => {
      resolve({
        ok: false,
        summary: "Python/IfcTester not available",
        details:
          "Ensure Python plus ifcopenshell and ifctester are installed: pip install ifcopenshell ifctester",
      });
    });
  });
}
