import * as yaml from 'js-yaml';

// ── shared: JSON sample <-> OpenAPI schema ──

function sampleToSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'string', nullable: true };
  if (Array.isArray(value)) {
    return { type: 'array', items: value.length ? sampleToSchema(value[0]) : {} };
  }
  if (typeof value === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) properties[k] = sampleToSchema(v);
    return { type: 'object', properties };
  }
  if (typeof value === 'string') return { type: 'string', example: value };
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
  if (typeof value === 'boolean') return { type: 'boolean', example: value };
  return {};
}

function schemaToSample(schema: Record<string, any> | undefined): unknown {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  switch (schema.type) {
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema.properties ?? {})) out[k] = schemaToSample(v as Record<string, any>);
      return out;
    }
    case 'array': return schema.items ? [schemaToSample(schema.items)] : [];
    case 'integer': return 0;
    case 'number': return 0;
    case 'boolean': return true;
    default: return 'string';
  }
}

// ── Postman -> OpenAPI ──

interface PmHeader { key: string; value: string }
interface PmUrl { raw?: string; path?: string[]; query?: { key: string; value: string }[] }
interface PmRequest { method?: string; header?: PmHeader[]; url?: string | PmUrl; body?: { mode?: string; raw?: string; urlencoded?: PmHeader[]; formdata?: PmHeader[] } }
interface PmItem { name?: string; item?: PmItem[]; request?: PmRequest }

function flattenPostmanItems(items: PmItem[], out: PmItem[] = []): PmItem[] {
  for (const it of items) {
    if (it.item) flattenPostmanItems(it.item, out);
    else if (it.request) out.push(it);
  }
  return out;
}

function extractPathAndQuery(url: string | PmUrl | undefined): { path: string; query: { key: string; value: string }[] } {
  if (!url) return { path: '/', query: [] };
  if (typeof url === 'string') {
    const [pathPart, queryPart] = url.split('?');
    const path = '/' + pathPart
      .replace(/^\{\{[^}]+\}\}\/?/, '')
      .replace(/^https?:\/\/[^/]+\/?/, '')
      .replace(/^\/+/, '');
    const query = queryPart
      ? queryPart.split('&').filter(Boolean).map(kv => {
          const [k, v = ''] = kv.split('=');
          return { key: decodeURIComponent(k), value: decodeURIComponent(v) };
        })
      : [];
    return { path, query };
  }
  const path = '/' + (url.path ?? []).join('/');
  return { path, query: url.query ?? [] };
}

function postmanPathToOpenApi(path: string): { openApiPath: string; pathParams: string[] } {
  const pathParams: string[] = [];
  const openApiPath = path
    .split('/')
    .map(seg => {
      if (seg.startsWith(':') && seg.length > 1) {
        const name = seg.slice(1);
        pathParams.push(name);
        return `{${name}}`;
      }
      return seg;
    })
    .join('/');
  return { openApiPath, pathParams };
}

export function postmanToOpenApi(collectionText: string): Record<string, unknown> {
  const collection = JSON.parse(collectionText);
  if (!Array.isArray(collection.item)) throw new Error('Not a Postman collection — expected a top-level "item" array.');

  const items = flattenPostmanItems(collection.item);
  const paths: Record<string, Record<string, unknown>> = {};

  for (const item of items) {
    const req = item.request!;
    const method = (typeof req.method === 'string' ? req.method : 'GET').toLowerCase();
    const { path: rawPath, query } = extractPathAndQuery(req.url);
    const { openApiPath, pathParams } = postmanPathToOpenApi(rawPath || '/');

    const parameters: Record<string, unknown>[] = [];
    for (const name of pathParams) parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } });
    for (const q of query) parameters.push({ name: q.key, in: 'query', required: false, schema: { type: 'string' }, example: q.value });
    for (const h of req.header ?? []) {
      if (/^(content-type|authorization)$/i.test(h.key)) continue;
      parameters.push({ name: h.key, in: 'header', required: false, schema: { type: 'string' }, example: h.value });
    }

    const operation: Record<string, unknown> = { summary: item.name, parameters, responses: { '200': { description: 'OK' } } };

    if (req.body?.mode === 'raw' && req.body.raw?.trim()) {
      try {
        const sample = JSON.parse(req.body.raw);
        operation.requestBody = { content: { 'application/json': { schema: sampleToSchema(sample) } } };
      } catch {
        operation.requestBody = { content: { 'text/plain': { schema: { type: 'string' } } } };
      }
    } else if (req.body?.mode === 'urlencoded' || req.body?.mode === 'formdata') {
      const fields = (req.body.mode === 'urlencoded' ? req.body.urlencoded : req.body.formdata) ?? [];
      const properties: Record<string, unknown> = {};
      for (const f of fields) properties[f.key] = { type: 'string', example: f.value };
      const contentType = req.body.mode === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'multipart/form-data';
      operation.requestBody = { content: { [contentType]: { schema: { type: 'object', properties } } } };
    }

    if (!paths[openApiPath]) paths[openApiPath] = {};
    paths[openApiPath][method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: { title: collection.info?.name ?? 'Converted API', version: '1.0.0' },
    paths,
  };
}

// ── OpenAPI -> Postman ──

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function parseSpecText(text: string): Record<string, any> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return yaml.load(trimmed) as Record<string, any>;
  }
}

export function openApiToPostman(specText: string): Record<string, unknown> {
  const spec = parseSpecText(specText);
  if (!spec.paths || typeof spec.paths !== 'object') throw new Error('Not an OpenAPI spec — expected a top-level "paths" object.');

  const items: Record<string, unknown>[] = [];

  for (const [path, methods] of Object.entries<Record<string, any>>(spec.paths)) {
    for (const [method, operation] of Object.entries<any>(methods)) {
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue;

      const postmanPath = path.replace(/\{([^}]+)\}/g, ':$1');
      const header: PmHeader[] = [];
      const query: PmHeader[] = [];

      for (const p of operation.parameters ?? []) {
        const exampleVal = p.example ?? p.schema?.example ?? '';
        if (p.in === 'header') header.push({ key: p.name, value: String(exampleVal) });
        if (p.in === 'query') query.push({ key: p.name, value: String(exampleVal) });
      }

      let body: Record<string, unknown> | undefined;
      const jsonContent = operation.requestBody?.content?.['application/json'];
      if (jsonContent) {
        header.push({ key: 'Content-Type', value: 'application/json' });
        const sample = schemaToSample(jsonContent.schema);
        body = { mode: 'raw', raw: JSON.stringify(sample, null, 2), options: { raw: { language: 'json' } } };
      }

      const queryString = query.length ? '?' + query.map(q => `${q.key}=${q.value}`).join('&') : '';

      items.push({
        name: operation.summary ?? `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header,
          ...(body ? { body } : {}),
          url: {
            raw: `{{baseUrl}}${postmanPath}${queryString}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.split('/').filter(Boolean),
            query,
          },
        },
        response: [],
      });
    }
  }

  return {
    info: {
      name: spec.info?.title ?? 'Converted API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };
}
