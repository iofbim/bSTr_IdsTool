import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type {
  IDSRoot,
  IDSSpecification,
  IDSPropertyRequirement,
  IDSOptionality,
  IDSSection,
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
  };
};

type IDSXMLClassification = { Classification: { System: string; Code?: string; Name?: string } };

type IDSXMLSpecification = {
  Specification: {
    Title: string;
    Description?: string;
    Applicability?: {
      "@_minOccurs"?: string | number;
      "@_maxOccurs"?: string | number;
      IfcClass?: string;
      Classifications?: IDSXMLClassification[];
    };
    Requirements?: {
      Properties?: IDSXMLProperty[];
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
      Requirements: props.length ? { Properties: props } : undefined,
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
      },
      requirements: { properties },
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
