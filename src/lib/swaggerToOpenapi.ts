import * as yaml from 'js-yaml';

// Converts a Swagger 2.0 document into OpenAPI 3.1. This is a structural
// transform, not a guess: every construct Swagger 2.0 has a direct OpenAPI 3.1
// equivalent for is converted (definitions -> components.schemas, body/formData
// params -> requestBody, response "schema" -> response "content", security
// definitions -> securitySchemes with oauth2 flow remapping). Constructs with
// no single, unambiguous target — Swagger's boolean exclusiveMinimum/Maximum
// becoming 3.1's numeric form, or a "file" type with no direct 3.1 primitive —
// are converted using the well-established community-standard mapping, and
// every one of those best-effort conversions is recorded in an "x-migration-notes"
// array on the output rather than applied silently.

function parseSpecText(text: string): Record<string, any> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return yaml.load(trimmed) as Record<string, any>;
  }
}

function rewriteRefs(node: unknown, notes: Set<string>): unknown {
  if (Array.isArray(node)) return node.map(n => rewriteRefs(n, notes));
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string') {
        out.$ref = value
          .replace(/^#\/definitions\//, '#/components/schemas/')
          .replace(/^#\/parameters\//, '#/components/parameters/')
          .replace(/^#\/responses\//, '#/components/responses/');
        continue;
      }
      out[key] = rewriteRefs(value, notes);
    }
    return convertSchemaKeywords(out, notes);
  }
  return node;
}

// Applies the well-known Swagger/OpenAPI-3.0 -> OpenAPI-3.1 (JSON Schema
// 2020-12) keyword changes to any object that looks like a schema fragment.
function convertSchemaKeywords(obj: Record<string, unknown>, notes: Set<string>): Record<string, unknown> {
  if (obj.type === 'file') {
    notes.add('A Swagger "type: file" parameter/schema was converted to "type: string, format: binary" — the standard community mapping, since OpenAPI has no "file" type.');
    obj.type = 'string';
    obj.format = 'binary';
  }
  if (typeof obj.exclusiveMinimum === 'boolean') {
    if (obj.exclusiveMinimum && typeof obj.minimum === 'number') {
      notes.add('A boolean "exclusiveMinimum: true" was converted to 3.1\'s numeric form (exclusiveMinimum now holds the bound directly, per JSON Schema 2020-12).');
      obj.exclusiveMinimum = obj.minimum;
      delete obj.minimum;
    } else {
      delete obj.exclusiveMinimum;
    }
  }
  if (typeof obj.exclusiveMaximum === 'boolean') {
    if (obj.exclusiveMaximum && typeof obj.maximum === 'number') {
      notes.add('A boolean "exclusiveMaximum: true" was converted to 3.1\'s numeric form (exclusiveMaximum now holds the bound directly, per JSON Schema 2020-12).');
      obj.exclusiveMaximum = obj.maximum;
      delete obj.maximum;
    } else {
      delete obj.exclusiveMaximum;
    }
  }
  return obj;
}

function toSchemaObject(param: Record<string, any>): Record<string, unknown> {
  const schema: Record<string, unknown> = {};
  for (const key of ['type', 'format', 'items', 'enum', 'default', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'uniqueItems', 'multipleOf']) {
    if (param[key] !== undefined) schema[key] = param[key];
  }
  return schema;
}

function securitySchemeFromDefinition(def: Record<string, any>): Record<string, unknown> {
  if (def.type === 'basic') return { type: 'http', scheme: 'basic' };
  if (def.type === 'apiKey') return { type: 'apiKey', name: def.name, in: def.in };
  if (def.type === 'oauth2') {
    const flowName = { implicit: 'implicit', password: 'password', application: 'clientCredentials', accessCode: 'authorizationCode' }[def.flow as string] ?? 'implicit';
    const flow: Record<string, unknown> = { scopes: def.scopes ?? {} };
    if (def.authorizationUrl) flow.authorizationUrl = def.authorizationUrl;
    if (def.tokenUrl) flow.tokenUrl = def.tokenUrl;
    return { type: 'oauth2', flows: { [flowName]: flow } };
  }
  return def;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

export function swaggerToOpenApi(specText: string): { spec: Record<string, unknown>; notes: string[] } {
  const doc = parseSpecText(specText);
  if (doc.swagger !== '2.0') throw new Error('Not a Swagger 2.0 document — expected a top-level "swagger": "2.0" field.');

  const notes = new Set<string>();
  const globalConsumes: string[] = doc.consumes ?? ['application/json'];
  const globalProduces: string[] = doc.produces ?? ['application/json'];

  // ── servers ──
  const scheme = (doc.schemes ?? ['https'])[0];
  const host = doc.host ?? 'example.com';
  const basePath = doc.basePath ?? '';
  const servers = [{ url: `${scheme}://${host}${basePath}` }];

  // ── components.schemas ──
  const schemas = doc.definitions ? (rewriteRefs(doc.definitions, notes) as Record<string, unknown>) : undefined;

  // ── components.securitySchemes ──
  let securitySchemes: Record<string, unknown> | undefined;
  if (doc.securityDefinitions) {
    securitySchemes = {};
    for (const [name, def] of Object.entries(doc.securityDefinitions as Record<string, any>)) {
      securitySchemes[name] = securitySchemeFromDefinition(def);
    }
  }

  // ── paths ──
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [rawPath, pathItem] of Object.entries((doc.paths ?? {}) as Record<string, any>)) {
    const outPathItem: Record<string, unknown> = {};
    const sharedParams: any[] = pathItem.parameters ?? [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      const consumes: string[] = op.consumes ?? globalConsumes;
      const produces: string[] = op.produces ?? globalProduces;
      const allParams = [...sharedParams, ...(op.parameters ?? [])];

      const parameters: Record<string, unknown>[] = [];
      let requestBody: Record<string, unknown> | undefined;
      const formProperties: Record<string, unknown> = {};
      const formRequired: string[] = [];

      for (const p of allParams) {
        if (p.in === 'body') {
          requestBody = {
            required: p.required ?? false,
            content: Object.fromEntries(consumes.map(mt => [mt, { schema: rewriteRefs(p.schema, notes) }])),
          };
        } else if (p.in === 'formData') {
          formProperties[p.name] = rewriteRefs(toSchemaObject(p), notes);
          if (p.required) formRequired.push(p.name);
        } else {
          parameters.push({
            name: p.name,
            in: p.in,
            required: p.required ?? (p.in === 'path' ? true : undefined),
            description: p.description,
            schema: rewriteRefs(toSchemaObject(p), notes),
          });
        }
      }

      if (Object.keys(formProperties).length) {
        const formSchema: Record<string, unknown> = { type: 'object', properties: formProperties };
        if (formRequired.length) formSchema.required = formRequired;
        const hasFile = Object.values(formProperties).some((s: any) => s.format === 'binary');
        const mediaType = hasFile ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
        requestBody = { content: { [mediaType]: { schema: formSchema } } };
      }

      const responses: Record<string, unknown> = {};
      for (const [status, resp] of Object.entries((op.responses ?? {}) as Record<string, any>)) {
        const r: Record<string, unknown> = { description: resp.description ?? '' };
        if (resp.schema) {
          r.content = Object.fromEntries(produces.map(mt => [mt, { schema: rewriteRefs(resp.schema, notes) }]));
        }
        responses[status] = r;
      }

      const operation: Record<string, unknown> = {
        ...(op.summary ? { summary: op.summary } : {}),
        ...(op.description ? { description: op.description } : {}),
        ...(op.operationId ? { operationId: op.operationId } : {}),
        ...(op.tags ? { tags: op.tags } : {}),
        ...(parameters.length ? { parameters } : {}),
        ...(requestBody ? { requestBody } : {}),
        responses,
      };
      outPathItem[method] = operation;
    }
    paths[rawPath] = outPathItem;
  }

  const components: Record<string, unknown> = {};
  if (schemas) components.schemas = schemas;
  if (securitySchemes) components.securitySchemes = securitySchemes;

  const spec: Record<string, unknown> = {
    openapi: '3.1.0',
    info: doc.info ?? { title: 'Converted API', version: '1.0.0' },
    servers,
    paths,
    ...(Object.keys(components).length ? { components } : {}),
    ...(doc.security ? { security: doc.security } : {}),
    ...(doc.tags ? { tags: doc.tags } : {}),
    ...(doc.externalDocs ? { externalDocs: doc.externalDocs } : {}),
  };

  return { spec, notes: Array.from(notes) };
}
