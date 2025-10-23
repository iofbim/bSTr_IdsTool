const fs = require('fs');
const path = require('path');

function replaceInFile(file, replacers) {
  const p = path.resolve(file);
  let txt = fs.readFileSync(p, 'utf8');
  for (const [from, to] of replacers) {
    txt = txt.split(from).join(to);
  }
  fs.writeFileSync(p, txt, 'utf8');
}

// 1) Fix classification parsing to retain enumerations/operator
replaceInFile('idsAuthoring/src/lib/ids/xml.ts', [
  [
    'const { value } = extractValueAndOperator(nsGet(c, "value"));\n        const v = Array.isArray(value) ? value[0] : typeof value === "string" ? value : undefined;',
    'const { operator, value } = extractValueAndOperator(nsGet(c, "value"));'
  ],
  [
    'system: nsSimple(c, "system") || "",\n          value: v,',
    'system: nsSimple(c, "system") || "",\n          operator: operator as any,\n          value: value as any,'
  ],
  [
    'const { value } = extractValueAndOperator(nsGet(c, "value"));\n        const v = Array.isArray(value) ? value[0] : typeof value === "string" ? value : undefined;',
    'const { operator, value } = extractValueAndOperator(nsGet(c, "value"));'
  ],
  [
    'system: nsSimple(c, "system") || "",\n          value: v,',
    'system: nsSimple(c, "system") || "",\n          operator: operator as any,\n          value: value as any,'
  ],
]);

console.log('Patched idsAuthoring/src/lib/ids/xml.ts');
