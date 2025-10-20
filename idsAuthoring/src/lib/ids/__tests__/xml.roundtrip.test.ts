import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { exportToIDSXML, parseIDSXmlText } from '../xml';

function findPassIdsFiles(root: string, limit = 12): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    const entries = readdirSync(dir);
    for (const name of entries) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/pass-.*\.ids$/i.test(name)) results.push(full);
      if (results.length >= limit) return;
    }
  }
  walk(root);
  return results.slice(0, limit);
}

describe('IDS XML round-trip (official examples)', () => {
  const root = resolve(__dirname, '../../../../../IDS/Documentation/ImplementersDocumentation/TestCases');
  let samples: string[] = [];
  try {
    samples = findPassIdsFiles(root, 15);
  } catch {
    // no-op; tests will be skipped if path missing
  }

  if (!samples.length) {
    it('skips when official examples are not present', () => {
      expect(true).toBe(true);
    });
    return;
  }

  for (const file of samples) {
    it(`parses and re-exports ${file}`, () => {
      const xml = readFileSync(file, 'utf8');
      const model = parseIDSXmlText(xml);
      expect(model.header.title.length).toBeGreaterThan(0);
      expect(model.sections[0].specifications.length).toBeGreaterThan(0);

      const outXml = exportToIDSXML(model);
      expect(outXml).toContain('<ids:ids');
      expect(outXml).toContain('<ids:specifications>');

      const model2 = parseIDSXmlText(outXml);
      expect(model2.sections[0].specifications.length).toBeGreaterThan(0);
    });
  }
});
