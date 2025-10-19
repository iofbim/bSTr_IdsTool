"use client";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { Dialog } from "@/components/ds/Dialog";
import { useIds } from "@/contexts/IdsContext";
import Image from "next/image";

export default function ImportExportPanel() {
  const {
    onImport,
    onExport,
    downloadXML,
    onValidate,
    exportOpen,
    setExportOpen,
    xmlPreview,
    validateOpen,
    setValidateOpen,
    validation,
  } = useIds();

  return (
    <div className="ds-panel p-3">
      <h2 className="text-lg font-semibold">Import / Export / Validate</h2>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          className="max-w-[12rem]"
          type="file"
          accept=".ids,.xml"
          onChange={onImport}
          aria-label="Import IDS XML"
          title="Import IDS XML"
        />
        <Button onClick={onExport}>Preview IDS</Button>
        <Button variant="secondary" onClick={downloadXML}>
          <Image src="/icons/IDS.png" alt="Download XML" width={40} height={20} />
        </Button>
        <span className="text-sm text-gray-600">IFC:</span>
        <input
          className="max-w-[12rem]"
          type="file"
          accept=".ifc,.ifczip"
          onChange={(e) => e.target.files && e.target.files[0] && onValidate(e.target.files[0])}
          aria-label="Upload IFC file for validation"
          title="Upload IFC file for validation"
        />
      </div>

      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="IDS XML Preview"
        footer={<Button onClick={() => setExportOpen(false)}>Close</Button>}
      >
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all text-xs">{xmlPreview}</pre>
      </Dialog>

      <Dialog
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        title="Validation Result"
        footer={<Button onClick={() => setValidateOpen(false)}>Close</Button>}
      >
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all text-xs">{validation}</pre>
      </Dialog>
    </div>
  );
}
