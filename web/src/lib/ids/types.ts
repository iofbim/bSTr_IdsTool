export type UUID = string;

export interface IDSPropertyRequirement {
  id: UUID;
  name: string; // e.g., "FireRating"
  propertySet?: string; // e.g., "Pset_WallCommon"
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
  properties?: IDSPropertyRequirement[]; // allow narrowing by Pset/Property
}

export type IDSOptionality = "required" | "optional" | "prohibited";

export interface IDSSpecification {
  id: UUID;
  title: string;
  description?: string;
  optionality: IDSOptionality; // maps to minOccurs/maxOccurs on applicability
  applicability?: IDSApplicability; // facets describing what this spec applies to
  requirements: {
    properties: IDSPropertyRequirement[]; // facets describing what is required
  };
}

export interface IDSSection {
  id: UUID;
  title: string;
  description?: string;
  specifications: IDSSpecification[];
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
  sections: IDSSection[];
}

export type IDSValidationResult = {
  ok: boolean;
  summary: string;
  details?: unknown;
};
