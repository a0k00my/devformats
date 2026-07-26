import { flattenPostmanItems, type PmItem, type PmHeader } from './postmanOpenapi';

// Postman uses {{var}}; Insomnia's Nunjucks-style tags are {{ _.var }}. Neither
// format's environment-variable model maps perfectly onto the other, so this is a
// best-effort text substitution, not a full template-engine translation.
function postmanVarsToInsomnia(s: string): string {
  return s.replace(/\{\{([^}]+)\}\}/g, (_, name) => `{{ _.${name.trim()} }}`);
}
function insomniaVarsToPostman(s: string): string {
  return s.replace(/\{\{\s*_\.([^}]+?)\s*\}\}/g, (_, name) => `{{${name.trim()}}}`);
}

function pmUrlToRaw(url: string | { raw?: string } | undefined): string {
  if (!url) return '';
  return typeof url === 'string' ? url : url.raw ?? '';
}

export function postmanToInsomnia(collectionText: string): Record<string, unknown> {
  const collection = JSON.parse(collectionText);
  if (!Array.isArray(collection.item)) throw new Error('Not a Postman collection — expected a top-level "item" array.');

  const items = flattenPostmanItems(collection.item);
  const workspaceId = 'wrk_1';
  const resources: Record<string, unknown>[] = [
    { _id: workspaceId, _type: 'workspace', name: collection.info?.name ?? 'Converted Collection' },
  ];

  items.forEach((item: PmItem, i: number) => {
    const req = item.request!;
    const rawUrl = pmUrlToRaw(req.url);
    const headers = (req.header ?? []).map((h: PmHeader) => ({ name: h.key, value: postmanVarsToInsomnia(h.value) }));

    let body: Record<string, unknown> | undefined;
    if (req.body?.mode === 'raw' && req.body.raw) {
      body = { mimeType: 'application/json', text: req.body.raw };
    } else if (req.body?.mode === 'urlencoded' || req.body?.mode === 'formdata') {
      const fields = (req.body.mode === 'urlencoded' ? req.body.urlencoded : req.body.formdata) ?? [];
      body = {
        mimeType: req.body.mode === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'multipart/form-data',
        params: fields.map(f => ({ name: f.key, value: f.value })),
      };
    }

    resources.push({
      _id: `req_${i + 1}`,
      _type: 'request',
      parentId: workspaceId,
      name: item.name ?? rawUrl,
      method: (req.method ?? 'GET').toUpperCase(),
      url: postmanVarsToInsomnia(rawUrl),
      headers,
      ...(body ? { body } : {}),
    });
  });

  return { _type: 'export', __export_format: 4, resources };
}

interface InsomniaResource {
  _id?: string;
  _type: string;
  name?: string;
  method?: string;
  url?: string;
  headers?: { name: string; value: string }[];
  body?: { mimeType?: string; text?: string; params?: { name: string; value: string }[] };
}

export function insomniaToPostman(exportText: string): Record<string, unknown> {
  const doc = JSON.parse(exportText);
  const resources: InsomniaResource[] = Array.isArray(doc.resources) ? doc.resources : [];
  if (!resources.length) throw new Error('Not an Insomnia export — expected a top-level "resources" array.');

  const workspace = resources.find(r => r._type === 'workspace');
  const requests = resources.filter(r => r._type === 'request');
  if (!requests.length) throw new Error('No requests found in this Insomnia export.');

  const items = requests.map(r => {
    const header: PmHeader[] = (r.headers ?? []).map(h => ({ key: h.name, value: insomniaVarsToPostman(h.value) }));
    let body: Record<string, unknown> | undefined;

    if (r.body?.text) {
      if (!header.some(h => h.key.toLowerCase() === 'content-type')) {
        header.push({ key: 'Content-Type', value: r.body.mimeType ?? 'application/json' });
      }
      body = { mode: 'raw', raw: r.body.text, options: { raw: { language: 'json' } } };
    } else if (r.body?.params) {
      const mode = r.body.mimeType === 'multipart/form-data' ? 'formdata' : 'urlencoded';
      body = { mode, [mode]: r.body.params.map(p => ({ key: p.name, value: p.value })) };
    }

    const rawUrl = insomniaVarsToPostman(r.url ?? '');
    return {
      name: r.name ?? rawUrl,
      request: {
        method: (r.method ?? 'GET').toUpperCase(),
        header,
        ...(body ? { body } : {}),
        url: { raw: rawUrl },
      },
      response: [],
    };
  });

  return {
    info: {
      name: workspace?.name ?? 'Converted Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };
}
