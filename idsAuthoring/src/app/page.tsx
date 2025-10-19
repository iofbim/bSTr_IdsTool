"use client";
// Bsdd pickers are hosted via BsddPickersHost; import/export logic is in IdsContext
import HeaderPanel from "@/components/ids/HeaderPanel";
import ImportExportPanel from "@/components/ids/ImportExportPanel";
import BsddLibrariesPanel from "@/components/ids/BsddLibrariesPanel";
import BsddPickersHost from "@/components/ids/BsddPickersHost";
import SectionsEditor from "@/components/ids/SectionsEditor";

export default function Page() {
  // All state and actions are provided via IdsContext; this page assembles top-level sections.

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">bSTr IDS Tool</h1>
      <p className="mt-2 text-gray-600">Create, import, export, and validate IDS specifications.</p>

      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="grid gap-3 h-[320px] overflow-hidden">
          <HeaderPanel />
          <ImportExportPanel />
        </div>
        <BsddLibrariesPanel />
      </section>

      <section className="mt-6 grid gap-4">
        <SectionsEditor />
      </section>

      {/* Preview dialog moved to ImportExportPanel */}

      <BsddPickersHost />

      {/* Validation dialog moved to ImportExportPanel */}
    </main>
  );
}

