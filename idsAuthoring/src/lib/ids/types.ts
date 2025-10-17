export type UUID = string;

export interface IDSPropertyRequirement {
  id: UUID;
  name: string; // e.g., "FireRating"
  propertySet?: string; // e.g., "Pset_WallCommon"
  datatype?: string; // e.g., "IfcLabel"
  operator?: "equals" | "contains" | "in" | "matches" | "present";
  value?: string | number | boolean | string[];
  optionality?: IDSOptionality; // for requirements
  uri?: string; // allowed on requirements: property
  instructions?: string; // allowed on requirements: property
}

export interface IDSClassificationRequirement {
  id: UUID;
  system: string; // e.g., "bSDD" or a classification system URI
  code?: string; // e.g., "21.31"
  name?: string;
  uri?: string; // allowed on requirements: classification
  instructions?: string; // allowed on requirements: classification
  // IDS supports cardinality on classification in requirements
  optionality?: IDSOptionality;
  // For value expression (ids:value) we support same operators
  operator?: "equals" | "contains" | "in" | "matches" | "present";
}

export interface IDSEntityFacet {
  id: UUID;
  ifcClass?: string; // e.g., "IfcWall"
  predefinedType?: string; // e.g., "SHEAR"
  optionality?: IDSOptionality; // for requirements
  uri?: string; // allowed on requirements: entity
  instructions?: string; // allowed on requirements: entity
}

export interface IDSAttributeRequirement {
  id: UUID;
  name: string; // IFC attribute name
  datatype?: string; // inferred or chosen
  operator?: "equals" | "contains" | "in" | "matches" | "present";
  value?: string | number | boolean | string[];
  optionality?: IDSOptionality; // for requirements
  uri?: string; // allowed on requirements: attribute
  instructions?: string; // allowed on requirements: attribute
}

export interface IDSMaterialRequirement {
  id: UUID;
  value?: string; // material category or name
  operator?: "equals" | "contains" | "matches" | "present";
  optionality?: IDSOptionality; // for requirements
  uri?: string; // allowed on requirements: material
  instructions?: string; // allowed on requirements: material
}

export interface IDSPartOfFacet {
  id: UUID;
  relation?: IDSRelation;
  entity?: IDSEntityFacet;
  optionality?: IDSOptionality; // for requirements
  uri?: string; // allowed on requirements: partOf
  instructions?: string; // allowed on requirements: partOf
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
  // Human-readable name of the specification (ids:@name in namespaced format)
  name?: string;
  title: string;
  description?: string;
  ifcVersion?: IDSIfcVersion; // per IDS schema enumeration
  identifier?: string; // ids:specification @identifier
  instructions?: string; // ids:specification @instructions
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

// Enumerations derived from IDS XSD
export type IDSIfcVersion = "IFC2X3" | "IFC4" | "IFC4X3_ADD2";
export const IDS_IFC_VERSIONS: IDSIfcVersion[] = ["IFC2X3", "IFC4", "IFC4X3_ADD2"];

export type IDSRelation =
  | "IFCRELAGGREGATES"
  | "IFCRELASSIGNSTOGROUP"
  | "IFCRELCONTAINEDINSPATIALSTRUCTURE"
  | "IFCRELNESTS"
  | "IFCRELVOIDSELEMENT IFCRELFILLSELEMENT";
export const IDS_RELATIONS: IDSRelation[] = [
  "IFCRELAGGREGATES",
  "IFCRELASSIGNSTOGROUP",
  "IFCRELCONTAINEDINSPATIALSTRUCTURE",
  "IFCRELNESTS",
  "IFCRELVOIDSELEMENT IFCRELFILLSELEMENT",
];
