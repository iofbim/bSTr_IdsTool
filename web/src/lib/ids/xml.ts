import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type {
  IDSRoot,
  IDSSpecification,
  IDSPropertyRequirement,
  IDSOptionality,
  IDSSection,
  IDSEntityFacet,
  IDSAttributeRequirement,
  IDSMaterialRequirement,
  IDSClassificationRequirement,
  IDSPartOfFacet,
} from "./types";

// Minimal IDS XML mapping (simplified for authoring/testing)
// This does not fully implement the IDS XSD. It focuses on key fields we use
// and keeps functions pure.

type IDSXMLProperty = {
  Property: {
    Name: string;
    PropertySet?: string;
    Datatype?: string;
    Operator?: IDSPropertyRequirement["operator"];
    Value?: string;
    "@_minOccurs"?: string | number;
    "@_maxOccurs"?: string | number;
  };
};

type IDSXMLClassification = { Classification: { System: string; Code?: string; Name?: string } };

type IDSXMLEntity = { Entity: { IfcClass?: string; PredefinedType?: string; "@_minOccurs"?: string | number; "@_maxOccurs"?: string | number } };
type IDSXMLAttribute = { Attribute: { Name: string; Datatype?: string; Operator?: IDSAttributeRequirement["operator"]; Value?: string; "@_minOccurs"?: string | number; "@_maxOccurs"?: string | number } };
type IDSXMLMaterial = { Material: { Operator?: IDSMaterialRequirement["operator"]; Value?: string; "@_minOccurs"?: string | number; "@_maxOccurs"?: string | number } };
type IDSXMLPartOf = { PartOf: { Relation?: string; Entity?: IDSXMLEntity["Entity"]; "@_minOccurs"?: string | number; "@_maxOccurs"?: string | number } };

type IDSXMLSpecification = {
  Specification: {
    Title: string;
    Description?: string;
    Applicability?: {
      "@_minOccurs"?: string | number;
      "@_maxOccurs"?: string | number;
      IfcClass?: string;
      Classifications?: IDSXMLClassification[];
      Entities?: IDSXMLEntity[];
      Attributes?: IDSXMLAttribute[];
      Materials?: IDSXMLMaterial[];
      PartOf?: IDSXMLPartOf[];
    };
    Requirements?: {
      Entities?: IDSXMLEntity[];
      Classifications?: IDSXMLClassification[];
      Attributes?: IDSXMLAttribute[];
      Properties?: IDSXMLProperty[];
      Materials?: IDSXMLMaterial[];
      PartOf?: IDSXMLPartOf[];
    };
  };
};

type IDSXML = {
  IDS: {
    Header: { Title: string; Description?: string; Author?: string; Date?: string; Version?: string };
    Specifications: IDSXMLSpecification[];
  };
};

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressBooleanAttributes: false,
  format: true,
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function toPropertyNode(prop: IDSPropertyRequirement): IDSXMLProperty {
  const node: IDSXMLProperty = { Property: { Name: prop.name } };
  if (prop.propertySet) node.Property.PropertySet = prop.propertySet;
  if (prop.datatype) node.Property.Datatype = prop.datatype;
  if (prop.operator) node.Property.Operator = prop.operator;
  if (prop.value !== undefined) node.Property.Value = Array.isArray(prop.value) ? prop.value.join(", ") : String(prop.value);
  if (prop.optionality) {
    const occ = optionalityToOccurs(prop.optionality);
    node.Property["@_minOccurs"] = occ.min;
    node.Property["@_maxOccurs"] = occ.max;
  }
  return node;
}

function toEntityNode(e: IDSEntityFacet, opt?: IDSOptionality): IDSXMLEntity {
  const node: IDSXMLEntity = { Entity: {} };
  if (e.ifcClass) node.Entity.IfcClass = e.ifcClass;
  if (e.predefinedType) node.Entity.PredefinedType = e.predefinedType;
  if (opt || e.optionality) {
    const occ = optionalityToOccurs((opt || e.optionality) as IDSOptionality);
    node.Entity["@_minOccurs"] = occ.min;
    node.Entity["@_maxOccurs"] = occ.max;
  }
  return node;
}

function toAttributeNode(a: IDSAttributeRequirement): IDSXMLAttribute {
  const node: IDSXMLAttribute = { Attribute: { Name: a.name } };
  if (a.datatype) node.Attribute.Datatype = a.datatype;
  if (a.operator) node.Attribute.Operator = a.operator as any;
  if (a.value !== undefined) node.Attribute.Value = Array.isArray(a.value) ? a.value.join(", ") : String(a.value);
  if (a.optionality) {
    const occ = optionalityToOccurs(a.optionality);
    node.Attribute["@_minOccurs"] = occ.min;
    node.Attribute["@_maxOccurs"] = occ.max;
  }
  return node;
}

function toMaterialNode(m: IDSMaterialRequirement): IDSXMLMaterial {
  const node: IDSXMLMaterial = { Material: {} };
  if (m.operator) node.Material.Operator = m.operator as any;
  if (m.value !== undefined) node.Material.Value = Array.isArray(m.value) ? m.value.join(", ") : String(m.value);
  if (m.optionality) {
    const occ = optionalityToOccurs(m.optionality);
    node.Material["@_minOccurs"] = occ.min;
    node.Material["@_maxOccurs"] = occ.max;
  }
  return node;
}

function toPartOfNode(p: IDSPartOfFacet): IDSXMLPartOf {
  const node: IDSXMLPartOf = { PartOf: {} } as any;
  if (p.relation) node.PartOf.Relation = p.relation;
  if (p.entity) node.PartOf.Entity = toEntityNode(p.entity).Entity;
  if (p.optionality) {
    const occ = optionalityToOccurs(p.optionality);
    node.PartOf["@_minOccurs"] = occ.min;
    node.PartOf["@_maxOccurs"] = occ.max;
  }
  return node;
}

function optionalityToOccurs(opt: IDSOptionality): { min: number; max: string | number } {
  switch (opt) {
    case "required":
      return { min: 1, max: "unbounded" };
    case "optional":
      return { min: 0, max: "unbounded" };
    case "prohibited":
      return { min: 0, max: 0 };
  }
}


function occursFromAttrs(node: any): IDSOptionality | undefined {
  const min = String((node as any)?.['@_minOccurs'] ?? '');
  const max = String((node as any)?.['@_maxOccurs'] ?? '');
  if (!min && !max) return undefined;
  if (min === '1' && (max === '' || max === 'unbounded')) return 'required';
  if (min === '0' && (max === '' || max === 'unbounded')) return 'optional';
  if (min === '0' && max === '0') return 'prohibited';
  return undefined;
}
function toSpecificationNode(spec: IDSSpecification): IDSXMLSpecification {
  const props = spec.requirements?.properties?.map(toPropertyNode) ?? [];
  const occurs = optionalityToOccurs(spec.optionality);

  const applicability = spec.applicability
    ? {
        Applicability: {
          "@_minOccurs": occurs.min,
          "@_maxOccurs": occurs.max,
          IfcClass: spec.applicability.ifcClass ?? undefined,
          Classifications: spec.applicability.classifications?.map((c) => ({
            Classification: { System: c.system, Code: c.code ?? undefined, Name: c.name ?? undefined },
          })),
          Properties: spec.applicability.properties?.map(toPropertyNode),
          Entities: spec.applicability.entities?.map((e) => toEntityNode(e)),
          Attributes: spec.applicability.attributes?.map((a) => toAttributeNode(a)),
          Materials: spec.applicability.materials?.map((m) => toMaterialNode(m)),
          PartOf: spec.applicability.partOf?.map((p) => toPartOfNode(p)),
        },
      }
    : {
        Applicability: {
          "@_minOccurs": occurs.min,
          "@_maxOccurs": occurs.max,
        },
      };

  return {
    Specification: {
      Title: spec.title,
      Description: spec.description ?? undefined,
      ...(applicability ?? {}),
      Requirements:
        props.length || (spec.requirements?.entities?.length || 0) || (spec.requirements?.attributes?.length || 0) ||
        (spec.requirements?.materials?.length || 0) || (spec.requirements?.classifications?.length || 0) ||
        (spec.requirements?.partOf?.length || 0)
          ? {
              Entities: spec.requirements.entities?.map((e) => toEntityNode(e, e.optionality)),
              Classifications: spec.requirements.classifications?.map((c) => ({
                Classification: { System: c.system, Code: c.code ?? undefined, Name: c.name ?? undefined },
              })),
              Attributes: spec.requirements.attributes?.map((a) => toAttributeNode(a)),
              Properties: props,
              Materials: spec.requirements.materials?.map((m) => toMaterialNode(m)),
              PartOf: spec.requirements.partOf?.map((p) => toPartOfNode(p)),
            }
          : undefined,
    },
  };
}

export function exportToIDSXML(idsData: IDSRoot): string {
  const allSpecs: IDSSpecification[] = (idsData.sections || []).flatMap((s) => s.specifications || []);
  const xmlObject: IDSXML = {
    IDS: {
      Header: {
        Title: idsData.header.title,
        Description: idsData.header.description ?? undefined,
        Author: idsData.header.author ?? undefined,
        Date: idsData.header.date ?? undefined,
        Version: idsData.header.version ?? undefined,
      },
      Specifications: allSpecs.map(toSpecificationNode),
    },
  };
  return builder.build(xmlObject);
}

export async function parseIDSXML(file: File): Promise<IDSRoot> {
  const text = await file.text();
  const parsed = parser.parse(text) as unknown;
  const idsObj = pickObject(pickObject(parsed, "IDS") ?? pickObject(parsed, "ids") ?? parsed);

  const headerNode = pickObject(idsObj?.["Header"]);

  // Prefer new format: IDS.Specifications[].Specification
  const specsArr = asArray<Record<string, unknown>>(idsObj?.["Specifications"]) as Record<string, unknown>[];
  const specsSpecNodes = specsArr.flatMap((s) => asArray<Record<string, unknown>>(s?.["Specification"]))
    .concat(asArray<Record<string, unknown>>(idsObj?.["Specification"])) // fallback if directly under IDS
    .map((s) => pickObject(s?.["Specification"]) ?? s);

  const specifications: IDSSpecification[] = specsSpecNodes.map((spec, idx) => {
    const applicabilityNode = pickObject(spec?.["Applicability"]) || {};
    const reqsNode = pickObject(spec?.["Requirements"]) || {};
    const propsArr = asArray<Record<string, unknown>>(reqsNode?.["Properties"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["Property"]) || asArray<Record<string, unknown>>(x)
    );
    const properties: IDSPropertyRequirement[] = propsArr
      .map((p) => pickObject(p?.["Property"]) ?? p)
      .map((p, pidx) => ({
        id: cryptoRandomId(`prop-${idx}-${pidx}`),
        name: String((p?.["Name"] as string) ?? "Unnamed"),
        propertySet: p?.["PropertySet"] ? String(p?.["PropertySet"]) : undefined,
        datatype: p?.["Datatype"] ? String(p?.["Datatype"]) : undefined,
        operator: (p?.["Operator"] as IDSPropertyRequirement["operator"]) || undefined,
        value: p?.["Value"] as string | undefined,
      }));

    const appPropsArr = asArray<Record<string, unknown>>(applicabilityNode?.["Properties"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["Property"]) || asArray<Record<string, unknown>>(x)
    );
    const appProperties: IDSPropertyRequirement[] = appPropsArr
      .map((p) => pickObject(p?.["Property"]) ?? p)
      .map((p, pidx) => ({
        id: cryptoRandomId(`aprop-${idx}-${pidx}`),
        name: String((p?.["Name"] as string) ?? "Unnamed"),
        propertySet: p?.["PropertySet"] ? String(p?.["PropertySet"]) : undefined,
        datatype: p?.["Datatype"] ? String(p?.["Datatype"]) : undefined,
        operator: (p?.["Operator"] as IDSPropertyRequirement["operator"]) || undefined,
        value: p?.["Value"] as string | undefined,
      }));

    const classificationsArr = asArray<Record<string, unknown>>(applicabilityNode?.["Classifications"]);
    const classifications = classificationsArr
      .map((c) => pickObject(c?.["Classification"]) ?? c)
      .map((c, cidx) => ({
        id: cryptoRandomId(`cls-${idx}-${cidx}`),
        system: String((c?.["System"] as string) ?? ""),
        code: c?.["Code"] ? String(c?.["Code"]) : undefined,
        name: c?.["Name"] ? String(c?.["Name"]) : undefined,
      }));

    // Applicability other facets
    const entArr = asArray<Record<string, unknown>>(applicabilityNode?.["Entities"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["Entity"]) || asArray<Record<string, unknown>>(x)
    );
    const entities: IDSEntityFacet[] = entArr.map((e, eidx) => ({
      id: cryptoRandomId(`aent-${idx}-${eidx}`),
      ifcClass: e?.["IfcClass"] ? String(e?.["IfcClass"]) : undefined,
      predefinedType: e?.["PredefinedType"] ? String(e?.["PredefinedType"]) : undefined,
    }));

    const attrArr = asArray<Record<string, unknown>>(applicabilityNode?.["Attributes"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["Attribute"]) || asArray<Record<string, unknown>>(x)
    );
    const attributes: IDSAttributeRequirement[] = attrArr.map((a, aidx) => ({
      id: cryptoRandomId(`aattr-${idx}-${aidx}`),
      name: String((a?.["Name"] as string) ?? ""),
      datatype: a?.["Datatype"] ? String(a?.["Datatype"]) : undefined,
      operator: (a?.["Operator"] as IDSAttributeRequirement["operator"]) || undefined,
      value: a?.["Value"] as string | undefined,
    }));

    const matArr = asArray<Record<string, unknown>>(applicabilityNode?.["Materials"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["Material"]) || asArray<Record<string, unknown>>(x)
    );
    const materials: IDSMaterialRequirement[] = matArr.map((m, midx) => ({
      id: cryptoRandomId(`amat-${idx}-${midx}`),
      operator: (m?.["Operator"] as IDSMaterialRequirement["operator"]) || undefined,
      value: m?.["Value"] as string | undefined,
    }));

    const partArr = asArray<Record<string, unknown>>(applicabilityNode?.["PartOf"]).flatMap((x) =>
      asArray<Record<string, unknown>>(pickObject(x)?.["PartOf"]) || asArray<Record<string, unknown>>(x)
    );
    const partOf: IDSPartOfFacet[] = partArr.map((p, pidx) => ({
      id: cryptoRandomId(`apart-${idx}-${pidx}`),
      relation: p?.["Relation"] ? String(p?.["Relation"]) : undefined,
      entity: (() => {
        const en = pickObject(p?.["Entity"]);
        return en ? { id: cryptoRandomId(`ent-${idx}-${pidx}`), ifcClass: en?.["IfcClass"] as string | undefined, predefinedType: en?.["PredefinedType"] as string | undefined } : undefined;
      })(),
    }));

    // Optionality from min/max occurs
    const minOccurs = (applicabilityNode as any)?.["@_minOccurs"];
    const maxOccurs = (applicabilityNode as any)?.["@_maxOccurs"];
    let optionality: IDSOptionality = "required";
    if (String(minOccurs ?? "1") === "0" && String(maxOccurs ?? "unbounded") === "unbounded") optionality = "optional";
    if (String(minOccurs ?? "1") === "0" && String(maxOccurs ?? "unbounded") === "0") optionality = "prohibited";

    return {
      id: cryptoRandomId(`spec-${idx}`),
      title: String((spec?.["Title"] as string) ?? "Untitled"),
      description: spec?.["Description"] ? String(spec?.["Description"]) : undefined,
      optionality,
      applicability: {
        ifcClass: applicabilityNode?.["IfcClass"] ? String(applicabilityNode?.["IfcClass"]) : undefined,
        classifications,
        properties: appProperties,
        entities,
        attributes,
        materials,
        partOf,
      },
      requirements: {
        entities: asArray<Record<string, unknown>>(reqsNode?.["Entities"]) // entities in requirements
          .flatMap((x) => asArray<Record<string, unknown>>(pickObject(x)?.["Entity"]) || asArray<Record<string, unknown>>(x))
          .map((e, eidx) => ({
            id: cryptoRandomId(`rent-${idx}-${eidx}`),
            ifcClass: e?.["IfcClass"] ? String(e?.["IfcClass"]) : undefined,
            predefinedType: e?.["PredefinedType"] ? String(e?.["PredefinedType"]) : undefined,
            optionality: occursFromAttrs(e),
          } as IDSEntityFacet)),
        classifications: asArray<Record<string, unknown>>(reqsNode?.["Classifications"]) // classifications in requirements
          .flatMap((x) => asArray<Record<string, unknown>>(pickObject(x)?.["Classification"]) || asArray<Record<string, unknown>>(x))
          .map((c, cidx) => ({ id: cryptoRandomId(`rcls-${idx}-${cidx}`), system: String((c?.["System"] as string) ?? ""), code: c?.["Code"] ? String(c?.["Code"]) : undefined } as IDSClassificationRequirement)),
        attributes: asArray<Record<string, unknown>>(reqsNode?.["Attributes"]) // attributes in requirements
          .flatMap((x) => asArray<Record<string, unknown>>(pickObject(x)?.["Attribute"]) || asArray<Record<string, unknown>>(x))
          .map((a, aidx) => ({
            id: cryptoRandomId(`rattr-${idx}-${aidx}`),
            name: String((a?.["Name"] as string) ?? ""),
            datatype: a?.["Datatype"] ? String(a?.["Datatype"]) : undefined,
            operator: (a?.["Operator"] as IDSAttributeRequirement["operator"]) || undefined,
            value: a?.["Value"] as string | undefined,
            optionality: occursFromAttrs(a),
          } as IDSAttributeRequirement)),
        properties: properties,
        materials: asArray<Record<string, unknown>>(reqsNode?.["Materials"]) // materials in requirements
          .flatMap((x) => asArray<Record<string, unknown>>(pickObject(x)?.["Material"]) || asArray<Record<string, unknown>>(x))
          .map((m, midx) => ({
            id: cryptoRandomId(`rmat-${idx}-${midx}`),
            operator: (m?.["Operator"] as IDSMaterialRequirement["operator"]) || undefined,
            value: m?.["Value"] as string | undefined,
            optionality: occursFromAttrs(m),
          } as IDSMaterialRequirement)),
        partOf: asArray<Record<string, unknown>>(reqsNode?.["PartOf"]) // partOf in requirements
          .flatMap((x) => asArray<Record<string, unknown>>(pickObject(x)?.["PartOf"]) || asArray<Record<string, unknown>>(x))
          .map((p, pidx) => ({
            id: cryptoRandomId(`rpart-${idx}-${pidx}`),
            relation: p?.["Relation"] ? String(p?.["Relation"]) : undefined,
            entity: (() => {
              const en = pickObject(p?.["Entity"]);
              return en ? { id: cryptoRandomId(`rent-${idx}-${pidx}`), ifcClass: en?.["IfcClass"] as string | undefined, predefinedType: en?.["PredefinedType"] as string | undefined } : undefined;
            })(),
            optionality: occursFromAttrs(p),
          } as IDSPartOfFacet)),
      },
    };
  });

  // Backward compatibility with old minimal format: IDS.Specification[].RequirementGroup
  if (!specifications.length) {
    const oldSpecsArr = asArray<Record<string, unknown>>(idsObj?.["Specification"]);
    const converted = oldSpecsArr.map((spec, idx) => {
      const rgObj = pickObject(spec?.["RequirementGroup"]) ?? spec;
      const propsArr = asArray<Record<string, unknown>>(rgObj?.["Properties"]);
      const properties: IDSPropertyRequirement[] = propsArr
        .map((p) => pickObject(p?.["Property"]) ?? p)
        .map((p, pidx) => ({
          id: cryptoRandomId(`prop-${idx}-${pidx}`),
          name: String((p?.["Name"] as string) ?? "Unnamed"),
          propertySet: p?.["PropertySet"] ? String(p?.["PropertySet"]) : undefined,
          datatype: p?.["Datatype"] ? String(p?.["Datatype"]) : undefined,
          operator: (p?.["Operator"] as IDSPropertyRequirement["operator"]) || undefined,
          value: p?.["Value"] as string | undefined,
        }));
      const applicabilityNode = pickObject(rgObj?.["Applicability"]) || {};
      const classificationsArr = asArray<Record<string, unknown>>(applicabilityNode?.["Classifications"]);
      const classifications = classificationsArr
        .map((c) => pickObject(c?.["Classification"]) ?? c)
        .map((c, cidx) => ({
          id: cryptoRandomId(`cls-${idx}-${cidx}`),
          system: String((c?.["System"] as string) ?? ""),
          code: c?.["Code"] ? String(c?.["Code"]) : undefined,
          name: c?.["Name"] ? String(c?.["Name"]) : undefined,
        }));
      const specItem: IDSSpecification = {
        id: cryptoRandomId(`spec-${idx}`),
        title: String((rgObj?.["Title"] as string) ?? "Untitled"),
        description: rgObj?.["Description"] ? String(rgObj?.["Description"]) : undefined,
        optionality: "required",
        applicability: {
          ifcClass: applicabilityNode?.["IfcClass"] ? String(applicabilityNode?.["IfcClass"]) : undefined,
          classifications,
        },
        requirements: { properties },
      };
      return specItem;
    });
    if (converted.length) specifications.push(...converted);
  }

  const section: IDSSection = {
    id: cryptoRandomId("section"),
    title: "Default Section",
    specifications,
  };

  return {
    header: {
      title: String((headerNode?.["Title"] as string) ?? "Untitled IDS"),
      description: headerNode?.["Description"] ? String(headerNode?.["Description"]) : undefined,
      author: headerNode?.["Author"] ? String(headerNode?.["Author"]) : undefined,
      date: headerNode?.["Date"] ? String(headerNode?.["Date"]) : undefined,
      version: headerNode?.["Version"] ? String(headerNode?.["Version"]) : undefined,
    },
    sections: [section],
  };
}

function cryptoRandomId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickObject(v: unknown, key?: string): Record<string, unknown> | undefined {
  if (key === undefined) return isObject(v) ? (v as Record<string, unknown>) : undefined;
  if (!isObject(v)) return undefined;
  const val = (v as Record<string, unknown>)[key];
  return isObject(val) ? (val as Record<string, unknown>) : undefined;
}

function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return v !== undefined ? ([v] as T[]) : [];
}



