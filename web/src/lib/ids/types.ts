export type UUID = string;

export interface IDSPropertyRequirement {
  id: UUID;
  name: string; // e.g., "FireRating"
  propertySet?: string; // e.g., "Pset_WallCommon"
  datatype?: string; // e.g., "IfcLabel"
  operator?: "equals" | "contains" | "in" | "matches" | "present";
  value?: string | number | boolean | string[];
  optionality?: IDSOptionality; // for requirements
}

export interface IDSClassificationRequirement {
  id: UUID;
  system: string; // e.g., "bSDD" or a classification system URI
  code?: string; // e.g., "21.31"
  name?: string;
}

export interface IDSEntityFacet {
  id: UUID;
  ifcClass?: string; // e.g., "IfcWall"
  predefinedType?: string; // e.g., "SHEAR"
  optionality?: IDSOptionality; // for requirements
}

export interface IDSAttributeRequirement {
  id: UUID;
  name: string; // IFC attribute name
  datatype?: string; // inferred or chosen
  operator?: "equals" | "contains" | "in" | "matches" | "present";
  value?: string | number | boolean | string[];
  optionality?: IDSOptionality; // for requirements
}

export interface IDSMaterialRequirement {
  id: UUID;
  value?: string; // material category or name
  operator?: "equals" | "contains" | "matches" | "present";
  optionality?: IDSOptionality; // for requirements
}

export interface IDSPartOfFacet {
  id: UUID;
  relation?: string; // e.g., IFCRELAGGREGATES, IFCRELCONTAINEDINSPATIALSTRUCTURE
  entity?: IDSEntityFacet;
  optionality?: IDSOptionality; // for requirements
}

export interface IDSApplicability {
  // Legacy quick fields
  ifcClass?: string; // e.g., "IfcWall"
  classifications?: IDSClassificationRequirement[];
  properties?: IDSPropertyRequirement[]; // allow narrowing by Pset/Property
  // New richer facets
  entities?: IDSEntityFacet[];
  attributes?: IDSAttributeRequirement[];
  materials?: IDSMaterialRequirement[];
  partOf?: IDSPartOfFacet[];
}

export type IDSOptionality = "required" | "optional" | "prohibited";

export interface IDSSpecification {
  id: UUID;
  title: string;
  description?: string;
  optionality: IDSOptionality; // maps to minOccurs/maxOccurs on applicability
  applicability?: IDSApplicability; // facets describing what this spec applies to
  requirements: {
    // facets describing what is required
    entities?: IDSEntityFacet[];
    classifications?: IDSClassificationRequirement[];
    attributes?: IDSAttributeRequirement[];
    properties: IDSPropertyRequirement[];
    materials?: IDSMaterialRequirement[];
    partOf?: IDSPartOfFacet[];
    // Optional: cardinality at group/requirements level
    cardinality?: IDSOptionality;
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
