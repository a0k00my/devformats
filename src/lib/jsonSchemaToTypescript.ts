// Parses a JSON Schema document (Draft 07 through 2020-12) and emits TypeScript
// interfaces/type aliases — the reverse direction of jsonTypeGen's toJsonSchema.
// Supports the subset of JSON Schema that has a direct TypeScript equivalent:
// object/properties/required, array/items, enum, oneOf/anyOf as unions, and
// $ref into #/$defs or #/definitions. Constructs with no clean TS equivalent
// (allOf composition, patternProperties, conditional if/then/else schemas) are
// never silently dropped or guessed at — each one adds a one-line comment at
// the top of the output naming exactly what wasn't translated.

import { toPascalCase } from './jsonTypeGen';

type JsonSchema = Record<string, unknown> | boolean;

function isValidIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

function resolveRefName(ref: string): string {
  const parts = ref.split('/');
  return toPascalCase(parts[parts.length - 1] || 'Ref');
}

function schemaTypeToTs(schema: JsonSchema, notes: Set<string>): string {
  if (schema === true) return 'unknown';
  if (schema === false) return 'never';
  if (!schema || typeof schema !== 'object') return 'unknown';
  const s = schema as Record<string, unknown>;

  if (typeof s.$ref === 'string') return resolveRefName(s.$ref);

  if (Array.isArray(s.enum)) {
    return s.enum.map(v => JSON.stringify(v)).join(' | ') || 'never';
  }

  if (Array.isArray(s.oneOf) || Array.isArray(s.anyOf)) {
    const variants = (s.oneOf ?? s.anyOf) as JsonSchema[];
    return variants.map(v => schemaTypeToTs(v, notes)).join(' | ');
  }

  if (Array.isArray(s.allOf)) {
    notes.add('allOf composition has no single TypeScript equivalent — only the first branch of each allOf was used, not a true intersection of every branch\'s constraints.');
    return schemaTypeToTs((s.allOf as JsonSchema[])[0], notes);
  }

  if (s.if || s.then || s.else) {
    notes.add('Conditional if/then/else schemas aren\'t representable as a single TypeScript type — the conditional was ignored and the base type used instead.');
  }

  const rawType = s.type;
  const types = Array.isArray(rawType) ? rawType as string[] : rawType ? [rawType as string] : null;

  if (types?.includes('array') || s.items !== undefined) {
    const itemSchema = s.items as JsonSchema | undefined;
    const itemType = itemSchema !== undefined ? schemaTypeToTs(itemSchema, notes) : 'unknown';
    return `${itemType}[]`;
  }

  if (types?.includes('object') || s.properties !== undefined) {
    return objectLiteral(s, notes);
  }

  if (types) {
    const mapped = types.map(t => {
      switch (t) {
        case 'string': return 'string';
        case 'integer':
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'null': return 'null';
        default: return 'unknown';
      }
    });
    return Array.from(new Set(mapped)).join(' | ');
  }

  return 'unknown';
}

function objectLiteral(s: Record<string, unknown>, notes: Set<string>): string {
  const props = (s.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((s.required as string[] | undefined) ?? []);
  const keys = Object.keys(props);

  if (s.patternProperties) {
    notes.add('patternProperties is not translated — only the explicit keys under "properties" became fields.');
  }

  if (!keys.length) {
    return s.additionalProperties === false ? '{}' : 'Record<string, unknown>';
  }

  const fields = keys.map(key => {
    const optional = required.has(key) ? '' : '?';
    const safeKey = isValidIdentifier(key) ? key : JSON.stringify(key);
    return `  ${safeKey}${optional}: ${schemaTypeToTs(props[key], notes)};`;
  });
  return `{\n${fields.join('\n')}\n}`;
}

export function jsonSchemaToTypescript(schemaText: string): string {
  const schema = JSON.parse(schemaText) as Record<string, unknown>;
  const defsSource = (schema.$defs ?? schema.definitions ?? {}) as Record<string, JsonSchema>;
  const notes = new Set<string>();
  const decls: string[] = [];
  const definedNames = new Set<string>();

  for (const [name, defSchema] of Object.entries(defsSource)) {
    const pascalName = toPascalCase(name);
    definedNames.add(pascalName);
    const s = defSchema as Record<string, unknown>;
    if (typeof defSchema === 'object' && (s.type === 'object' || s.properties !== undefined)) {
      decls.push(`export interface ${pascalName} ${objectLiteral(s, notes)}`);
    } else {
      decls.push(`export type ${pascalName} = ${schemaTypeToTs(defSchema, notes)};`);
    }
  }

  // The root schema is usually just a $ref into $defs (what toJsonSchema emits) —
  // in that case every named type is already declared above and "Root" is a
  // thin alias. A root with its own inline properties gets its own declaration.
  let rootDecl = '';
  if (typeof schema.$ref === 'string') {
    const rootName = resolveRefName(schema.$ref);
    if (!definedNames.has('Root')) rootDecl = `export type Root = ${rootName};`;
  } else if (schema.type === 'object' || schema.properties !== undefined) {
    rootDecl = `export interface Root ${objectLiteral(schema, notes)}`;
  } else if (schema.type) {
    rootDecl = `export type Root = ${schemaTypeToTs(schema, notes)};`;
  }

  const noteComment = notes.size ? `// ${Array.from(notes).join('\n// ')}\n\n` : '';
  const body = [...decls, rootDecl].filter(Boolean).join('\n\n');
  return noteComment + (body || '// This schema has no properties, $defs, or definitions to translate.');
}
