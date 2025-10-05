import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { IDSRoot, IDSRequirementGroup, IDSPropertyRequirement } from "./types";

// Minimal IDS XML mapping (simplified for authoring/testing)
// This does not fully implement the IDS XSD. It focuses on key fields we use
// and keeps functions pure.

type IDSXMLProperty = {
  Property: {
    Name: string;
    Datatype?: string;
    Operator?: IDSPropertyRequirement["operator"];
    Value?: string;
  };
};

type IDSXMLClassification = { Classification: { System: string; Code?: string; Name?: string } };

type IDSXMLRequirementGroup = {
  RequirementGroup: {
    Title: string;
    Description?: string;
    Applicability?: { IfcClass?: string; Classifications?: IDSXMLClassification[] };
    Properties: IDSXMLProperty[];
  };
};

type IDSXML = {
  IDS: {
    Header: { Title: string; Description?: string; Author?: string; Date?: string; Version?: string };
    Specification: IDSXMLRequirementGroup[];
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
  if (prop.datatype) node.Property.Datatype = prop.datatype;
  if (prop.operator) node.Property.Operator = prop.operator;
  if (prop.value !== undefined) node.Property.Value = Array.isArray(prop.value) ? prop.value.join(", ") : String(prop.value);
  return node;
}

function toRequirementGroupNode(group: IDSRequirementGroup): IDSXMLRequirementGroup {
  const props = group.properties?.map(toPropertyNode) ?? [];
  const applicability = group.applicability
    ? {
        Applicability: {
          IfcClass: group.applicability.ifcClass ?? undefined,
          Classifications: group.applicability.classifications?.map((c) => ({
            Classification: { System: c.system, Code: c.code ?? undefined, Name: c.name ?? undefined },
          })),
        },
      }
    : undefined;

  return {
    RequirementGroup: {
      Title: group.title,
      Description: group.description ?? undefined,
      ...(applicability ?? {}),
      Properties: props,
    },
  };
}

export function exportToIDSXML(idsData: IDSRoot): string {
  const xmlObject: IDSXML = {
    IDS: {
      Header: {
        Title: idsData.header.title,
        Description: idsData.header.description ?? undefined,
        Author: idsData.header.author ?? undefined,
        Date: idsData.header.date ?? undefined,
        Version: idsData.header.version ?? undefined,
      },
      Specification: idsData.requirements.map(toRequirementGroupNode),
    },
  };
  return builder.build(xmlObject);
}

export async function parseIDSXML(file: File): Promise<IDSRoot> {
  const text = await file.text();
  const parsed = parser.parse(text) as unknown;
  const idsObj = pickObject(pickObject(parsed, "IDS") ?? pickObject(parsed, "ids") ?? parsed);

  const headerNode = pickObject(idsObj?.["Header"]);
  const specsArr = asArray<Record<string, unknown>>(idsObj?.["Specification"]);

  const requirements: IDSRequirementGroup[] = specsArr.map((spec, idx) => {
    const rgObj = pickObject(spec?.["RequirementGroup"]) ?? spec;
    const propsArr = asArray<Record<string, unknown>>(rgObj?.["Properties"]);
    const properties: IDSPropertyRequirement[] = propsArr
      .map((p) => pickObject(p?.["Property"]) ?? p)
      .map((p, pidx) => ({
        id: cryptoRandomId(`prop-${idx}-${pidx}`),
        name: String((p?.["Name"] as string) ?? "Unnamed"),
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

    return {
      id: cryptoRandomId(`req-${idx}`),
      title: String((rgObj?.["Title"] as string) ?? "Untitled"),
      description: rgObj?.["Description"] ? String(rgObj?.["Description"]) : undefined,
      applicability: {
        ifcClass: applicabilityNode?.["IfcClass"] ? String(applicabilityNode?.["IfcClass"]) : undefined,
        classifications,
      },
      properties,
    };
  });

  return {
    header: {
      title: String((headerNode?.["Title"] as string) ?? "Untitled IDS"),
      description: headerNode?.["Description"] ? String(headerNode?.["Description"]) : undefined,
      author: headerNode?.["Author"] ? String(headerNode?.["Author"]) : undefined,
      date: headerNode?.["Date"] ? String(headerNode?.["Date"]) : undefined,
      version: headerNode?.["Version"] ? String(headerNode?.["Version"]) : undefined,
    },
    requirements,
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
