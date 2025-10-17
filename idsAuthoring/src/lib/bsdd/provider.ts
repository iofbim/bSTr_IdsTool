// Reference: bSDD/Documentation (official upstream documentation in repo)
import type { Library, BsddClass, BsddClassDetail } from "./types";

export interface BsddProvider {
  fetchLibraries(includeTest: boolean): Promise<Library[]>;
  searchClasses(term: string, dicts: string[], limit?: number): Promise<BsddClass[]>;
  getClass(uri: string): Promise<BsddClassDetail | null>;
}

export const BSDD_TRANSPORT = (process.env.BSDD_TRANSPORT || "rest").toLowerCase();
