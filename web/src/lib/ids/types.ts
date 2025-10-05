export type UUID = string;

export interface IDSPropertyRequirement {
  id: UUID;
  name: string; // e.g., "FireRating"
  datatype?: string; // e.g., "IfcLabel"
  operator?: "equals" | "contains" | "in" | "matches" | "present";
  value?: string | number | boolean | string[];
}

export interface IDSClassificationRequirement {
  id: UUID;
  system: string; // e.g., "bSDD" or a classification system URI
  code?: string; // e.g., "21.31"
  name?: string;
}

export interface IDSApplicability {
  ifcClass?: string; // e.g., "IfcWall"
  classifications?: IDSClassificationRequirement[];
}

export interface IDSRequirementGroup {
  id: UUID;
  title: string;
  description?: string;
  applicability?: IDSApplicability;
  properties: IDSPropertyRequirement[];
}

export interface IDSHeader {
  title: string;
  description?: string;
  author?: string;
  date?: string; // ISO date
  version?: string;
}

export interface IDSRoot {
  header: IDSHeader;
  requirements: IDSRequirementGroup[];
}

export type IDSValidationResult = {
  ok: boolean;
  summary: string;
  details?: unknown;
};

