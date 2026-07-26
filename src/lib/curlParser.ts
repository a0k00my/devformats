// Parses a curl command line into a structured request description that every
// curl-to-<language> emitter builds from. Covers the flags that show up in the
// overwhelming majority of real-world "copy as cURL" snippets (browser devtools,
// API docs, Postman exports) — an unrecognized flag is safely skipped rather than
// mis-parsed as the URL.

export interface CurlHeader { name: string; value: string }
export interface CurlFormField { key: string; value: string; isFile: boolean }

export interface ParsedCurl {
  method: string;
  url: string;
  headers: CurlHeader[];
  data: string | null;
  form: CurlFormField[] | null;
  auth: { user: string; pass: string } | null;
  cookie: string | null;
  insecure: boolean;
}

// Flags that consume the following token as a value.
const VALUE_FLAGS = new Set([
  '-X', '--request', '-H', '--header', '-d', '--data', '--data-raw', '--data-binary', '--data-ascii',
  '--data-urlencode', '-F', '--form', '-u', '--user', '-b', '--cookie', '-A', '--user-agent',
  '-e', '--referer', '-o', '--output', '--connect-timeout', '--max-time', '-x', '--proxy',
  '--cacert', '--cert', '--key', '-w', '--write-out', '--limit-rate', '--retry', '-T',
  '--upload-file', '--url',
]);

// Boolean flags that take no value.
const BOOLEAN_FLAGS = new Set([
  '-k', '--insecure', '-L', '--location', '-s', '--silent', '-S', '--show-error', '-v', '--verbose',
  '-i', '--include', '-I', '--head', '-G', '--get', '--compressed', '-f', '--fail', '-N',
  '--no-buffer', '-4', '--ipv4', '-6', '--ipv6',
]);

function tokenize(cmd: string): string[] {
  const cleaned = cmd.trim().replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
    if (i >= cleaned.length) break;
    let quote: string | null = null;
    let tok = '';
    if (cleaned[i] === '"' || cleaned[i] === "'") { quote = cleaned[i]; i++; }
    while (i < cleaned.length) {
      const c = cleaned[i];
      if (quote) {
        if (c === '\\' && quote === '"' && i + 1 < cleaned.length) { tok += cleaned[i + 1]; i += 2; continue; }
        if (c === quote) { i++; break; }
        tok += c; i++;
      } else {
        if (/\s/.test(c)) break;
        tok += c; i++;
      }
    }
    tokens.push(tok);
  }
  return tokens;
}

export function parseCurl(input: string): ParsedCurl {
  let tokens = tokenize(input);
  if (tokens[0] === 'curl') tokens = tokens.slice(1);

  const headers: CurlHeader[] = [];
  const dataParts: string[] = [];
  const form: CurlFormField[] = [];
  let method = '';
  let url = '';
  let auth: { user: string; pass: string } | null = null;
  let cookie: string | null = null;
  let insecure = false;
  let isGet = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t.startsWith('-')) {
      if (!url) url = t;
      continue;
    }
    const next = () => tokens[++i] ?? '';

    if (t === '-X' || t === '--request') { method = next(); continue; }
    if (t === '-H' || t === '--header') {
      const h = next();
      const idx = h.indexOf(':');
      if (idx > -1) headers.push({ name: h.slice(0, idx).trim(), value: h.slice(idx + 1).trim() });
      continue;
    }
    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-ascii' || t === '--data-urlencode') {
      dataParts.push(next());
      continue;
    }
    if (t === '-F' || t === '--form') {
      const f = next();
      const idx = f.indexOf('=');
      const key = idx > -1 ? f.slice(0, idx) : f;
      let value = idx > -1 ? f.slice(idx + 1) : '';
      const isFile = value.startsWith('@');
      if (isFile) value = value.slice(1);
      form.push({ key, value, isFile });
      continue;
    }
    if (t === '-u' || t === '--user') {
      const up = next();
      const idx = up.indexOf(':');
      auth = idx > -1 ? { user: up.slice(0, idx), pass: up.slice(idx + 1) } : { user: up, pass: '' };
      continue;
    }
    if (t === '-b' || t === '--cookie') { cookie = next(); continue; }
    if (t === '-A' || t === '--user-agent') { headers.push({ name: 'User-Agent', value: next() }); continue; }
    if (t === '-e' || t === '--referer') { headers.push({ name: 'Referer', value: next() }); continue; }
    if (t === '-k' || t === '--insecure') { insecure = true; continue; }
    if (t === '-G' || t === '--get') { isGet = true; continue; }
    if (t === '--url') { url = next(); continue; }
    if (VALUE_FLAGS.has(t)) { next(); continue; } // consumed, not modeled in generated code
    if (BOOLEAN_FLAGS.has(t)) { continue; }
    // Unrecognized flag: assume boolean so we never accidentally swallow the URL.
  }

  const data = dataParts.length ? dataParts.join('&') : null;
  if (isGet && data) {
    url += (url.includes('?') ? '&' : '?') + data;
  }

  if (!method) {
    method = form.length ? 'POST' : (data && !isGet) ? 'POST' : 'GET';
  }

  return {
    method: method.toUpperCase(),
    url,
    headers,
    data: isGet ? null : data,
    form: form.length ? form : null,
    auth,
    cookie,
    insecure,
  };
}
