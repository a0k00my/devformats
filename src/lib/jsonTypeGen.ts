// Shared type-tree inference + per-language emitters for the JSON -> <lang type> tool cluster.
// One inference pass (inferType) feeds every emitter below, so adding a new target
// language only means adding a new emit* function, not re-deriving field types.

export type TypeNode =
  | { kind: 'string' }
  | { kind: 'number'; isInteger: boolean }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'unknown' }
  | { kind: 'array'; item: TypeNode }
  | { kind: 'object'; name: string; fields: TypeField[] };

export interface TypeField {
  key: string;
  type: TypeNode;
  optional: boolean;
}

export function toPascalCase(name: string): string {
  const p = name.replace(/[^A-Za-z0-9]+(\w)/g, (_, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');
  const capped = p.charAt(0).toUpperCase() + p.slice(1);
  return /^[A-Za-z]/.test(capped) ? capped : `T${capped}` || 'Root';
}

export function toCamelCase(name: string): string {
  const p = toPascalCase(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function toSnakeCase(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function singularize(name: string): string {
  return name.replace(/ies$/, 'y').replace(/s$/, '');
}

export function inferType(value: unknown, name: string): TypeNode {
  if (value === null) return { kind: 'null' };
  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: 'array', item: { kind: 'unknown' } };
    return { kind: 'array', item: inferType(value[0], singularize(name)) };
  }
  if (typeof value === 'object') {
    const fields: TypeField[] = Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
      key,
      type: inferType(val, key),
      optional: val === null,
    }));
    return { kind: 'object', name: toPascalCase(name), fields };
  }
  if (typeof value === 'string') return { kind: 'string' };
  if (typeof value === 'number') return { kind: 'number', isInteger: Number.isInteger(value) };
  if (typeof value === 'boolean') return { kind: 'boolean' };
  return { kind: 'unknown' };
}

// Bottom-up (children before parents) list of every object node in the tree, so an
// emitter can print nested type declarations before the types that reference them.
export function collectObjects(node: TypeNode, out: TypeNode[] = []): TypeNode[] {
  if (node.kind === 'array') collectObjects(node.item, out);
  if (node.kind === 'object') {
    for (const f of node.fields) collectObjects(f.type, out);
    out.push(node);
  }
  return out;
}

function isValidIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

// A JSON key like "list" or "string" PascalCases into a type name that collides with a
// built-in the emitted code already imports/uses (java.util.List, Rust's String/Vec, etc.).
// Mutates the shared TypeNode in place so every reference site (fields, arrays) picks up
// the renamed type — safe because each generate() call builds a fresh, single-use tree.
function renameCollisions(objects: TypeNode[], reserved: Set<string>, suffix: string): void {
  for (const o of objects) {
    if (o.kind === 'object' && reserved.has(o.name)) {
      o.name = `${o.name}${suffix}`;
    }
  }
}

// ── TypeScript (interface) ──
export function toTypeScript(root: TypeNode): string {
  const objects = collectObjects(root);
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'string';
      case 'boolean': return 'boolean';
      case 'number': return 'number';
      case 'null': return 'unknown';
      case 'unknown': return 'unknown';
      case 'array': return `${ref(t.item)}[]`;
      case 'object': return t.name;
    }
  };
  const decls = objects.map(o => {
    if (o.kind !== 'object') return '';
    const fields = o.fields.map(f => {
      const safeKey = isValidIdentifier(f.key) ? f.key : JSON.stringify(f.key);
      return `  ${safeKey}${f.optional ? '?' : ''}: ${ref(f.type)};`;
    }).join('\n');
    return `export interface ${o.name} {\n${fields}\n}`;
  });
  return decls.join('\n\n');
}

// ── Zod ──
export function toZod(root: TypeNode): string {
  const objects = collectObjects(root);
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'z.string()';
      case 'boolean': return 'z.boolean()';
      case 'number': return 'z.number()';
      case 'null': return 'z.unknown()';
      case 'unknown': return 'z.unknown()';
      case 'array': return `z.array(${ref(t.item)})`;
      case 'object': return `${t.name}Schema`;
    }
  };
  const decls = objects.map(o => {
    if (o.kind !== 'object') return '';
    const fields = o.fields.map(f => {
      const safeKey = isValidIdentifier(f.key) ? f.key : JSON.stringify(f.key);
      const base = ref(f.type);
      return `  ${safeKey}: ${f.optional ? `${base}.nullable()` : base},`;
    }).join('\n');
    return `export const ${o.name}Schema = z.object({\n${fields}\n});\nexport type ${o.name} = z.infer<typeof ${o.name}Schema>;`;
  });
  return `import { z } from 'zod';\n\n` + decls.join('\n\n');
}

// ── Java POJO ──
const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null', 'var', 'record', 'yield',
]);
const KOTLIN_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface',
  'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias',
  'val', 'var', 'when', 'while',
]);

// Shared by Java and Kotlin: both use camelCase fields and disallow keyword identifiers.
function toCamelField(key: string, keywords: Set<string> = JAVA_KEYWORDS): string {
  const camel = toCamelCase(key);
  if (!isValidIdentifier(camel)) return `field${toPascalCase(key)}`;
  return keywords.has(camel) ? `${camel}Value` : camel;
}

const JAVA_TYPE_COLLISIONS = new Set(['List', 'Object', 'String', 'Boolean', 'Integer', 'Double']);

export function toJavaPojo(root: TypeNode): string {
  const objects = collectObjects(root);
  renameCollisions(objects, JAVA_TYPE_COLLISIONS, 'Model');
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'String';
      case 'boolean': return 'Boolean';
      case 'number': return t.isInteger ? 'Integer' : 'Double';
      case 'null': return 'Object';
      case 'unknown': return 'Object';
      case 'array': return `List<${ref(t.item)}>`;
      case 'object': return t.name;
    }
  };
  const classes = objects.map(o => {
    if (o.kind !== 'object') return '';
    const camelFields = o.fields.map(f => ({ ...f, camel: toCamelField(f.key) }));
    const fields = camelFields.map(f => `    private ${ref(f.type)} ${f.camel};`).join('\n');
    const accessors = camelFields.map(f => {
      const type = ref(f.type);
      const Pascal = f.camel.charAt(0).toUpperCase() + f.camel.slice(1);
      return `    public ${type} get${Pascal}() { return ${f.camel}; }\n    public void set${Pascal}(${type} ${f.camel}) { this.${f.camel} = ${f.camel}; }`;
    }).join('\n\n');
    return `public class ${o.name} {\n${fields}\n\n${accessors}\n}`;
  });
  return `import java.util.List;\n\n` + classes.join('\n\n');
}

// ── Rust struct (serde) ──
const RUST_KEYWORDS = new Set([
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for',
  'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
  'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where',
  'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do', 'final', 'macro',
  'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'try',
]);
function rustFieldName(snake: string): string {
  return RUST_KEYWORDS.has(snake) ? `r#${snake}` : snake;
}

const RUST_TYPE_COLLISIONS = new Set(['String', 'Vec', 'Option', 'Box']);

export function toRustStruct(root: TypeNode): string {
  const objects = collectObjects(root);
  renameCollisions(objects, RUST_TYPE_COLLISIONS, 'Data');
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'String';
      case 'boolean': return 'bool';
      case 'number': return t.isInteger ? 'i64' : 'f64';
      case 'null': return 'serde_json::Value';
      case 'unknown': return 'serde_json::Value';
      case 'array': return `Vec<${ref(t.item)}>`;
      case 'object': return t.name;
    }
  };
  const structs = objects.map(o => {
    if (o.kind !== 'object') return '';
    const fields = o.fields.map(f => {
      const snake = toSnakeCase(f.key) || 'field';
      const fieldName = rustFieldName(snake);
      const rename = snake !== f.key ? `    #[serde(rename = "${f.key}")]\n` : '';
      const type = f.optional ? `Option<${ref(f.type)}>` : ref(f.type);
      return `${rename}    pub ${fieldName}: ${type},`;
    }).join('\n');
    return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${o.name} {\n${fields}\n}`;
  });
  return `use serde::{Serialize, Deserialize};\n\n` + structs.join('\n\n');
}

const KOTLIN_TYPE_COLLISIONS = new Set(['List', 'Any', 'String', 'Boolean', 'Int', 'Double']);

// ── Kotlin data class ──
export function toKotlinDataClass(root: TypeNode): string {
  const objects = collectObjects(root);
  renameCollisions(objects, KOTLIN_TYPE_COLLISIONS, 'Model');
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'String';
      case 'boolean': return 'Boolean';
      case 'number': return t.isInteger ? 'Int' : 'Double';
      case 'null': return 'Any';
      case 'unknown': return 'Any?';
      case 'array': return `List<${ref(t.item)}>`;
      case 'object': return t.name;
    }
  };
  const classes = objects.map(o => {
    if (o.kind !== 'object') return '';
    const fields = o.fields.map(f => {
      const camel = toCamelField(f.key, KOTLIN_KEYWORDS);
      const type = f.optional ? `${ref(f.type)}?` : ref(f.type);
      const annotation = camel !== f.key ? `@SerialName("${f.key}") ` : '';
      return `    ${annotation}val ${camel}: ${type}${f.optional ? ' = null' : ''}`;
    }).join(',\n');
    return `data class ${o.name}(\n${fields}\n)`;
  });
  return classes.join('\n\n');
}

const CSHARP_TYPE_COLLISIONS = new Set(['List', 'Object', 'String']);

// ── C# class ──
export function toCSharpClass(root: TypeNode): string {
  const objects = collectObjects(root);
  renameCollisions(objects, CSHARP_TYPE_COLLISIONS, 'Model');
  const ref = (t: TypeNode): string => {
    switch (t.kind) {
      case 'string': return 'string';
      case 'boolean': return 'bool';
      case 'number': return t.isInteger ? 'int' : 'double';
      case 'null': return 'object';
      case 'unknown': return 'object';
      case 'array': return `List<${ref(t.item)}>`;
      case 'object': return t.name;
    }
  };
  const classes = objects.map(o => {
    if (o.kind !== 'object') return '';
    const fields = o.fields.map(f => {
      const Pascal = toPascalCase(f.key);
      const type = f.optional ? `${ref(f.type)}?` : ref(f.type);
      const jsonProp = Pascal !== f.key ? `    [JsonPropertyName("${f.key}")]\n` : '';
      return `${jsonProp}    public ${type} ${Pascal} { get; set; }`;
    }).join('\n\n');
    return `public class ${o.name}\n{\n${fields}\n}`;
  });
  return `using System.Collections.Generic;\nusing System.Text.Json.Serialization;\n\n` + classes.join('\n\n');
}
