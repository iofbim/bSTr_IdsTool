// References
// - IDS/Schema/ids.xsd (official IDS 1.0 XSD)
// - IDS/Documentation/ImplementersDocumentation (test cases and guidance)
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
  IDSRelation,
} from "./types";
import { IDS_RELATIONS } from "./types";

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

// Helpers for parsing official IDS 1.0 namespaced XML (ids:*) in addition to the
// simplified legacy/XML we already support.
function nsGet<T = any>(obj: any, key: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined as any;
  return (obj as any)[`ids:${key}`] ?? (obj as any)[key];
}

function nsSimple(node: any, key: string): string | undefined {
  const v: any = nsGet(node, key);
  if (v === undefined) return undefined;
  if (typeof v === "string") return v;
  const sv = v?.["ids:simpleValue"] ?? v?.["simpleValue"];
  return typeof sv === "string" ? sv : undefined;
}

// Prefer simpleValue; otherwise, if a restriction is present, pick the first enumeration
// value or fallback to the pattern string. This is helpful for entity.name and predefinedType.
function nsFirstValueText(node: any, key: string): string | undefined {
  const v: any = nsGet(node, key);
  if (v === undefined) return undefined;
  if (typeof v === "string") return v;
  const sv = v?.["ids:simpleValue"] ?? v?.["simpleValue"];
  if (typeof sv === "string") return sv;
  const restr = v?.["xs:restriction"] ?? v?.["restriction"];
  if (restr && typeof restr === "object") {
    const enums = restr?.["xs:enumeration"] ?? restr?.["enumeration"];
    const first = Array.isArray(enums) ? enums[0] : enums;
    const value = first?.["@_value"];
    if (typeof value === "string") return value;
    const pat = restr?.["xs:pattern"] ?? restr?.["pattern"];
    const pval = Array.isArray(pat) ? pat[0]?.["@_value"] : pat?.["@_value"];
    if (typeof pval === "string") return pval;
  }
  return undefined;
}

function nsArray<T = Record<string, unknown>>(node: any, key: string): T[] {
  const v: any = nsGet(node, key);
  const arr = Array.isArray(v) ? v : v !== undefined ? [v] : [];
  return arr as T[];
}

function extractValueAndOperator(vnode: any): { operator?: IDSPropertyRequirement["operator"] | IDSAttributeRequirement["operator"]; value?: string | string[] } {
  if (!vnode) return {};
  // Direct simple value
  const simple = vnode?.["ids:simpleValue"] ?? vnode?.["simpleValue"];
  if (typeof simple === "string") return { operator: "equals", value: simple };
  const restr = vnode?.["xs:restriction"] ?? vnode?.["restriction"];
  if (restr && typeof restr === "object") {
    const enums = restr?.["xs:enumeration"] ?? restr?.["enumeration"];
    if (enums) {
      const list = (Array.isArray(enums) ? enums : [enums])
        .map((e: any) => e?.["@_value"]) // XML attribute
        .filter((x: any) => typeof x === "string");
      if (list.length) return { operator: "in", value: list as string[] };
    }
    const pat = restr?.["xs:pattern"] ?? restr?.["pattern"];
    const patternValue = Array.isArray(pat) ? pat[0]?.["@_value"] : pat?.["@_value"];
    if (typeof patternValue === "string") return { operator: "matches", value: patternValue };
  }
  return {};
}

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

// Build ids:idsValue node
function idsValue(simple?: string, enumeration?: string[], pattern?: string): Record<string, unknown> | undefined {
  if (simple && simple.length) return { "ids:simpleValue": simple };
  if (enumeration && enumeration.length) {
    return {
      "xs:restriction": {
        "@_base": "xs:string",
        "xs:enumeration": enumeration.map((v) => ({ "@_value": v })),
      },
    };
  }
  if (pattern && pattern.length) {
    return {
      "xs:restriction": {
        "@_base": "xs:string",
        "xs:pattern": { "@_value": pattern },
      },
    };
  }
  return undefined;
}

function escapeRegexLiteralForContains(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function opToIdsValue(op?: IDSPropertyRequirement["operator"] | IDSAttributeRequirement["operator"], value?: string | number | boolean | string[]): Record<string, unknown> | undefined {
  if (!op || op === "present" || value === undefined || value === "") return undefined;
  if (op === "equals") return idsValue(String(value));
  if (op === "in") return idsValue(undefined, Array.isArray(value) ? value as string[] : [String(value)]);
  if (op === "matches") return idsValue(undefined, undefined, String(value));
  if (op === "contains") return idsValue(undefined, undefined, `.*${escapeRegexLiteralForContains(String(value))}.*`);
  return undefined;
}

function toNsEntity(e: IDSEntityFacet): Record<string, unknown> {
  const name = e.ifcClass ? String(e.ifcClass).toUpperCase() : undefined;
  const predefined = e.predefinedType ? String(e.predefinedType).toUpperCase() : undefined;
  return {
    "ids:name": idsValue(name),
    ...(predefined ? { "ids:predefinedType": idsValue(predefined) } : {}),
  };
}

export function exportToIDSXML(idsData: IDSRoot): string {
  const allSpecs: IDSSpecification[] = (idsData.sections || []).flatMap((s) => s.specifications || []);

  const info: Record<string, unknown> = {
    "ids:title": idsData.header.title || "Untitled IDS",
    ...(idsData.header.description ? { "ids:description": idsData.header.description } : {}),
    ...(idsData.header.version ? { "ids:version": idsData.header.version } : {}),
    ...(idsData.header.date ? { "ids:date": idsData.header.date } : {}),
  };
  // author must be an email per XSD; include only if it looks like one
  if (idsData.header.author && /@/.test(idsData.header.author)) {
    (info as any)["ids:author"] = idsData.header.author;
  } else if (idsData.header.author) {
    // best-effort put non-email author into copyright
    (info as any)["ids:copyright"] = idsData.header.author;
  }

  const specs = allSpecs.map((spec, i) => {
    const occurs = optionalityToOccurs(spec.optionality);
    const applicability: Record<string, unknown> = {
      "@_minOccurs": occurs.min,
      "@_maxOccurs": occurs.max,
    };

    // Applicability facets
    if (spec.applicability) {
      // entity: only one allowed by XSD - take first from either explicit entities[] or ifcClass quick field
      const ent =
        (spec.applicability.entities && spec.applicability.entities[0]) ||
        (spec.applicability.ifcClass ? ({ id: "ent", ifcClass: spec.applicability.ifcClass } as IDSEntityFacet) : undefined);
      if (ent) (applicability as any)["ids:entity"] = toNsEntity(ent);

      if (spec.applicability.partOf && spec.applicability.partOf.length) {
        (applicability as any)["ids:partOf"] = spec.applicability.partOf.map((p) => ({
          ...(p.relation ? { "@_relation": p.relation } : {}),
          "ids:entity": toNsEntity(p.entity || { id: "ent", ifcClass: "IFCBUILDINGELEMENT" }),
        }));
      }
      if (spec.applicability.classifications && spec.applicability.classifications.length) {
        (applicability as any)["ids:classification"] = spec.applicability.classifications.map((c) => ({
          "ids:system": idsValue(c.system || ""),
          ...(c.code ? { "ids:value": opToIdsValue("equals", c.code) } : {}),
        }));
      }
      if (spec.applicability.attributes && spec.applicability.attributes.length) {
        (applicability as any)["ids:attribute"] = spec.applicability.attributes.map((a) => ({
          "ids:name": idsValue(a.name || ""),
          ...(opToIdsValue(a.operator, a.value as any) ? { "ids:value": opToIdsValue(a.operator, a.value as any) } : {}),
        }));
      }
      if (spec.applicability.properties && spec.applicability.properties.length) {
        (applicability as any)["ids:property"] = spec.applicability.properties.map((p) => ({
          ...(p.datatype ? { "@_dataType": String(p.datatype).toUpperCase() } : {}),
          "ids:propertySet": idsValue(p.propertySet || ""),
          "ids:baseName": idsValue(p.name || ""),
          ...(opToIdsValue(p.operator, p.value as any) ? { "ids:value": opToIdsValue(p.operator, p.value as any) } : {}),
        }));
      }
      if (spec.applicability.materials && spec.applicability.materials.length) {
        (applicability as any)["ids:material"] = spec.applicability.materials.map((m) => ({
          ...(opToIdsValue(m.operator, m.value as any) ? { "ids:value": opToIdsValue(m.operator, m.value as any) } : {}),
        }));
      }
    }

    // Requirements facets
    const requirements: Record<string, unknown> = {};
    if (spec.requirements?.entities && spec.requirements.entities.length) {
      (requirements as any)["ids:entity"] = spec.requirements.entities.map((e) => ({
        ...toNsEntity(e),
      }));
    }
    if (spec.requirements?.partOf && spec.requirements.partOf.length) {
      (requirements as any)["ids:partOf"] = spec.requirements.partOf.map((p) => ({
        ...(p.relation ? { "@_cardinality": p.optionality === "prohibited" ? "prohibited" : "required" } : {}),
        ...(p.instructions ? { "@_instructions": p.instructions } : {}),
        ...(p.relation ? { "@_relation": p.relation } : {}),
        "ids:entity": toNsEntity(p.entity || { id: "ent", ifcClass: "IFCBUILDINGELEMENT" }),
      }));
    }
    if (spec.requirements?.classifications && spec.requirements.classifications.length) {
      (requirements as any)["ids:classification"] = spec.requirements.classifications.map((c) => ({
        "@_cardinality": c ? (c as any).optionality || "required" : "required",
        ...(c.uri ? { "@_uri": c.uri } : {}),
        ...(c.instructions ? { "@_instructions": c.instructions } : {}),
        "ids:system": idsValue(c.system || ""),
        ...(c.code ? { "ids:value": opToIdsValue((c.operator as any) || "equals", c.code) } : {}),
      }));
    }
    if (spec.requirements?.attributes && spec.requirements.attributes.length) {
      (requirements as any)["ids:attribute"] = spec.requirements.attributes.map((a) => ({
        "@_cardinality": a.optionality || "required",
        ...(a.instructions ? { "@_instructions": a.instructions } : {}),
        "ids:name": idsValue(a.name || ""),
        ...(opToIdsValue(a.operator, a.value as any) ? { "ids:value": opToIdsValue(a.operator, a.value as any) } : {}),
      }));
    }
    const reqProps = spec.requirements?.properties || [];
    if (reqProps.length) {
      (requirements as any)["ids:property"] = reqProps.map((p) => ({
        "@_cardinality": p.optionality || "required",
        ...(p.uri ? { "@_uri": p.uri } : {}),
        ...(p.instructions ? { "@_instructions": p.instructions } : {}),
        ...(p.datatype ? { "@_dataType": String(p.datatype).toUpperCase() } : {}),
        "ids:propertySet": idsValue(p.propertySet || ""),
        "ids:baseName": idsValue(p.name || ""),
        ...(opToIdsValue(p.operator, p.value as any) ? { "ids:value": opToIdsValue(p.operator, p.value as any) } : {}),
      }));
    }
    if (spec.requirements?.materials && spec.requirements.materials.length) {
      (requirements as any)["ids:material"] = spec.requirements.materials.map((m) => ({
        "@_cardinality": m.optionality || "required",
        ...(m.uri ? { "@_uri": m.uri } : {}),
        ...(m.instructions ? { "@_instructions": m.instructions } : {}),
        ...(opToIdsValue(m.operator, m.value as any) ? { "ids:value": opToIdsValue(m.operator, m.value as any) } : {}),
      }));
    }

    const specNode: Record<string, unknown> = {
      "@_name": (spec.name || spec.title || `Specification ${i + 1}`),
      "@_ifcVersion": (spec.ifcVersion as any) || "IFC4",
      ...(spec.description ? { "@_description": spec.description } : {}),
      ...(spec.identifier ? { "@_identifier": spec.identifier } : {}),
      ...(spec.instructions ? { "@_instructions": spec.instructions } : {}),
      "ids:applicability": applicability,
      ...(Object.keys(requirements).length ? { "ids:requirements": requirements } : {}),
    };
    return specNode;
  });

  const xmlObject = {
    "ids:ids": {
      "@_xmlns:ids": "http://standards.buildingsmart.org/IDS",
      "@_xmlns:xs": "http://www.w3.org/2001/XMLSchema",
      "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "ids:info": info,
      "ids:specifications": {
        "ids:specification": specs,
      },
    },
  } as Record<string, unknown>;

  return builder.build(xmlObject);
}

export async function parseIDSXML(file: File): Promise<IDSRoot> {
  const text = await file.text();
  const parsed = parser.parse(text) as unknown;
  // First, try official IDS 1.0 namespaced format (ids:ids ...)
  const idsNs = pickObject(parsed, "ids:ids") ?? pickObject(parsed, "ids");
  if (idsNs) {
    // Header from ids:info
    const info = pickObject(nsGet(idsNs, "info"));
    const headerTitle = nsSimple(info, "title");
    const headerDesc = nsSimple(info, "description") ?? undefined;
    const headerAuthor = nsSimple(info, "copyright") ?? undefined; // best-effort mapping
    const headerDate = nsSimple(info, "date") ?? undefined;
    const headerVersion = nsSimple(info, "version") ?? undefined;

    const specsContainer = pickObject(nsGet(idsNs, "specifications")) ?? {};
    const specNodes = nsArray<Record<string, unknown>>(specsContainer, "specification");

    const specifications: IDSSpecification[] = specNodes.map((spec, idx) => {
      const applicabilityNode = pickObject(nsGet(spec, "applicability")) || {};
      const reqsNode = pickObject(nsGet(spec, "requirements")) || {};

      // Requirements: properties
      const propNodes = nsArray<Record<string, unknown>>(reqsNode, "property");
      const properties: IDSPropertyRequirement[] = propNodes.map((p, pidx) => {
        const { operator, value } = extractValueAndOperator(nsGet(p, "value"));
        return {
          id: cryptoRandomId(`prop-${idx}-${pidx}`),
          name: nsFirstValueText(p, "baseName") || "Unnamed",
          propertySet: nsFirstValueText(p, "propertySet") || undefined,
          datatype: (p as any)?.["@_dataType"] ? String((p as any)?.["@_dataType"]) : undefined,
          operator: operator as any,
          value: value as any,
          uri: (p as any)?.["@_uri"] ? String((p as any)?.["@_uri"]) : undefined,
          instructions: (p as any)?.["@_instructions"] ? String((p as any)?.["@_instructions"]) : undefined,
        } as IDSPropertyRequirement;
      });

      // Requirements: attributes
      const attrNodes = nsArray<Record<string, unknown>>(reqsNode, "attribute");
      const attributes: IDSAttributeRequirement[] = attrNodes.map((a, aidx) => {
        const { operator, value } = extractValueAndOperator(nsGet(a, "value"));
        return {
          id: cryptoRandomId(`attr-${idx}-${aidx}`),
          name: nsSimple(a, "name") || "Unnamed",
          datatype: (a as any)?.["@_dataType"] ? String((a as any)?.["@_dataType"]) : undefined,
          operator: operator as any,
          value: value as any,
          optionality: ((a as any)?.["@_cardinality"] as any) || occursFromAttrs(a),
          instructions: (a as any)?.["@_instructions"] ? String((a as any)?.["@_instructions"]) : undefined,
        } as IDSAttributeRequirement;
      });

      // Requirements: classifications
      const classNodes = nsArray<Record<string, unknown>>(reqsNode, "classification");
      const classifications: IDSClassificationRequirement[] = classNodes.map((c, cidx) => {
        const { value } = extractValueAndOperator(nsGet(c, "value"));
        const code = Array.isArray(value) ? value[0] : typeof value === "string" ? value : undefined;
        return {
          id: cryptoRandomId(`cls-${idx}-${cidx}`),
          system: nsSimple(c, "system") || "",
          code: code,
          uri: (c as any)?.["@_uri"] ? String((c as any)?.["@_uri"]) : undefined,
          instructions: (c as any)?.["@_instructions"] ? String((c as any)?.["@_instructions"]) : undefined,
        } as IDSClassificationRequirement;
      });

      // Applicability: entities and attributes/properties if any
      const appEntities = nsArray<Record<string, unknown>>(applicabilityNode, "entity").map((e, eidx) => ({
        id: cryptoRandomId(`aent-${idx}-${eidx}`),
        ifcClass: nsFirstValueText(e, "name"),
        predefinedType: nsFirstValueText(e, "predefinedType"),
        optionality: occursFromAttrs(e),
      } as IDSEntityFacet));

      const appAttributes = nsArray<Record<string, unknown>>(applicabilityNode, "attribute").map((a, aidx) => {
        const { operator, value } = extractValueAndOperator(nsGet(a, "value"));
        return {
          id: cryptoRandomId(`aattr-${idx}-${aidx}`),
          name: nsSimple(a, "name") || "Unnamed",
          datatype: (a as any)?.["@_dataType"] ? String((a as any)?.["@_dataType"]) : undefined,
          operator: operator as any,
          value: value as any,
          optionality: occursFromAttrs(a),
        } as IDSAttributeRequirement;
      });

      const appProperties = nsArray<Record<string, unknown>>(applicabilityNode, "property").map((p, pidx) => {
        const { operator, value } = extractValueAndOperator(nsGet(p, "value"));
        return {
          id: cryptoRandomId(`aprop-${idx}-${pidx}`),
          name: nsFirstValueText(p, "baseName") || "Unnamed",
          propertySet: nsFirstValueText(p, "propertySet") || undefined,
          datatype: (p as any)?.["@_dataType"] ? String((p as any)?.["@_dataType"]) : undefined,
          operator: operator as any,
          value: value as any,
          optionality: occursFromAttrs(p),
        } as IDSPropertyRequirement;
      });

      // Requirements: entities if any
      const reqEntities = nsArray<Record<string, unknown>>(reqsNode, "entity").map((e, eidx) => ({
        id: cryptoRandomId(`rent-${idx}-${eidx}`),
        ifcClass: nsFirstValueText(e, "name"),
        predefinedType: nsFirstValueText(e, "predefinedType"),
        optionality: occursFromAttrs(e),
      } as IDSEntityFacet));

      const specItem: IDSSpecification = {
        id: cryptoRandomId(`spec-${idx}`),
        name: String((spec as any)?.["@_name"] ?? `Specification ${idx + 1}`),
        title: String((spec as any)?.["@_title"] ?? (String((spec as any)?.["@_name"] ?? `Specification ${idx + 1}`))),
        description: (spec as any)?.["@_description"] ? String((spec as any)?.["@_description"]) : undefined,
        ifcVersion: ((spec as any)?.["@_ifcVersion"] as any) || undefined,
        identifier: (spec as any)?.["@_identifier"] ? String((spec as any)?.["@_identifier"]) : undefined,
        instructions: (spec as any)?.["@_instructions"] ? String((spec as any)?.["@_instructions"]) : undefined,
        optionality: ((): IDSOptionality => {
          const occ = occursFromAttrs(applicabilityNode);
          return occ ?? "required";
        })(),
        applicability: {
          entities: appEntities,
          attributes: appAttributes,
          properties: appProperties,
        },
        requirements: {
          entities: reqEntities,
          classifications,
          attributes: attributes.map((a) => ({ ...a })),
          properties: propNodes.map((p, i2) => {
            const base = properties[i2];
            const card = (p as any)?.["@_cardinality"] as any;
            return { ...base, optionality: (card as any) || base.optionality } as IDSPropertyRequirement;
          }),
        },
      };
      return specItem;
    });

    const section: IDSSection = {
      id: cryptoRandomId("section"),
      title: "Default Section",
      specifications,
    };

    return {
      header: {
        title: headerTitle ?? "Untitled IDS",
        description: headerDesc,
        author: headerAuthor,
        date: headerDate,
        version: headerVersion,
      },
      sections: [section],
    };
  }

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
      relation: (() => { const r = p?.["Relation"] ? String(p?.["Relation"]) : undefined; return (r && (IDS_RELATIONS as readonly string[]).includes(r)) ? (r as IDSRelation) : undefined; })(),
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
      name: String((spec?.["Name"] as string) ?? ((spec?.["Title"] as string) ?? "Untitled")),
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
            relation: (() => { const r = p?.["Relation"] ? String(p?.["Relation"]) : undefined; return (r && (IDS_RELATIONS as readonly string[]).includes(r)) ? (r as IDSRelation) : undefined; })(),
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



