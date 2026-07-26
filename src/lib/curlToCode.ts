import type { ParsedCurl } from './curlParser';

// Every emitter passes the request body through as a raw string literal rather than
// re-parsing/reconstructing it as a language-native object — that mirrors what curl
// itself does (byte passthrough) and avoids an entire class of "reconstructed the
// JSON wrong" bugs for the cost of a slightly less idiomatic (but always correct) line.

function allHeaders(p: ParsedCurl): [string, string][] {
  const list: [string, string][] = p.headers.map(h => [h.name, h.value]);
  if (p.cookie) list.push(['Cookie', p.cookie]);
  return list;
}

// ── Python (requests) ──
function pyStr(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

export function toPythonRequests(p: ParsedCurl): string {
  const lines: string[] = ['import requests', ''];
  const headers = allHeaders(p);
  const args: string[] = [pyStr(p.method), pyStr(p.url)];

  if (headers.length) {
    lines.push('headers = {');
    for (const [k, v] of headers) lines.push(`    ${pyStr(k)}: ${pyStr(v)},`);
    lines.push('}');
    lines.push('');
    args.push('headers=headers');
  }
  if (p.auth) args.push(`auth=(${pyStr(p.auth.user)}, ${pyStr(p.auth.pass)})`);

  if (p.form) {
    const fields = p.form.filter(f => !f.isFile);
    const files = p.form.filter(f => f.isFile);
    if (fields.length) {
      lines.push('data = {' + fields.map(f => `${pyStr(f.key)}: ${pyStr(f.value)}`).join(', ') + '}');
      args.push('data=data');
    }
    if (files.length) {
      lines.push('files = {' + files.map(f => `${pyStr(f.key)}: open(${pyStr(f.value)}, 'rb')`).join(', ') + '}');
      args.push('files=files');
    }
    lines.push('');
  } else if (p.data) {
    lines.push(`data = ${pyStr(p.data)}`);
    lines.push('');
    args.push('data=data');
  }
  if (p.insecure) args.push('verify=False');

  lines.push('response = requests.request(');
  lines.push(args.map(a => '    ' + a).join(',\n') + ',');
  lines.push(')');
  lines.push('');
  lines.push('print(response.status_code)');
  lines.push('print(response.text)');
  return lines.join('\n');
}

// ── Go (net/http) ──
function goStr(s: string): string {
  return JSON.stringify(s);
}
// Backtick raw strings read better for a JSON body (no escaped quotes everywhere) —
// only used for the body itself, never for method/URL/header values.
function goBodyStr(s: string): string {
  if (!s.includes('`') && !s.includes('\r')) return '`' + s + '`';
  return JSON.stringify(s);
}

export function toGoNetHttp(p: ParsedCurl): string {
  const hasBody = !!p.data;
  const imports = ['fmt', 'io', 'net/http'];
  if (p.insecure) imports.push('crypto/tls');
  if (p.form) imports.push('bytes', 'mime/multipart');
  else if (hasBody) imports.push('strings');
  imports.sort();

  const lines: string[] = ['package main', '', 'import (', ...imports.map(i => `\t"${i}"`), ')', '', 'func main() {'];

  if (p.form) {
    lines.push('\tvar body bytes.Buffer');
    lines.push('\twriter := multipart.NewWriter(&body)');
    for (const f of p.form) {
      if (f.isFile) {
        lines.push(`\tfw, _ := writer.CreateFormFile(${goStr(f.key)}, ${goStr(f.value)})`);
        lines.push(`\t// TODO: open ${goStr(f.value)} and io.Copy its contents into fw`);
        lines.push('\t_ = fw');
      } else {
        lines.push(`\twriter.WriteField(${goStr(f.key)}, ${goStr(f.value)})`);
      }
    }
    lines.push('\twriter.Close()');
    lines.push('');
    lines.push(`\treq, err := http.NewRequest(${goStr(p.method)}, ${goStr(p.url)}, &body)`);
  } else if (hasBody) {
    lines.push(`\treq, err := http.NewRequest(${goStr(p.method)}, ${goStr(p.url)}, strings.NewReader(${goBodyStr(p.data as string)}))`);
  } else {
    lines.push(`\treq, err := http.NewRequest(${goStr(p.method)}, ${goStr(p.url)}, nil)`);
  }
  lines.push('\tif err != nil {');
  lines.push('\t\tpanic(err)');
  lines.push('\t}');
  lines.push('');

  const headers = allHeaders(p);
  for (const [k, v] of headers) lines.push(`\treq.Header.Set(${goStr(k)}, ${goStr(v)})`);
  if (p.form) lines.push('\treq.Header.Set("Content-Type", writer.FormDataContentType())');
  if (p.auth) lines.push(`\treq.SetBasicAuth(${goStr(p.auth.user)}, ${goStr(p.auth.pass)})`);
  if (headers.length || p.form || p.auth) lines.push('');

  if (p.insecure) {
    lines.push('\tclient := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}');
  } else {
    lines.push('\tclient := &http.Client{}');
  }
  lines.push('\tresp, err := client.Do(req)');
  lines.push('\tif err != nil {');
  lines.push('\t\tpanic(err)');
  lines.push('\t}');
  lines.push('\tdefer resp.Body.Close()');
  lines.push('');
  lines.push('\trespBody, _ := io.ReadAll(resp.Body)');
  lines.push('\tfmt.Println(resp.StatusCode, string(respBody))');
  lines.push('}');

  return lines.join('\n');
}

// ── Node (fetch) ──
function jsStr(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

export function toNodeFetch(p: ParsedCurl): string {
  const lines: string[] = [];
  const headers = allHeaders(p);
  const opts: string[] = [`  method: ${jsStr(p.method)},`];

  if (p.auth) {
    // Encoded at runtime (Buffer is a Node global, not available in this browser-side generator).
    lines.push(`const credentials = Buffer.from(${jsStr(`${p.auth.user}:${p.auth.pass}`)}).toString('base64');`);
    lines.push('');
    headers.push(['Authorization', '__BASIC_AUTH__']);
  }
  if (headers.length) {
    opts.push('  headers: {');
    for (const [k, v] of headers) {
      const value = v === '__BASIC_AUTH__' ? '`Basic ${credentials}`' : jsStr(v);
      opts.push(`    ${jsStr(k)}: ${value},`);
    }
    opts.push('  },');
  }

  if (p.form) {
    lines.push('const form = new FormData();');
    for (const f of p.form) {
      if (f.isFile) {
        lines.push(`// TODO: attach the file at ${jsStr(f.value)} — e.g. via fs.readFileSync + new Blob([...])`);
        lines.push(`form.append(${jsStr(f.key)}, new Blob([/* file bytes */]), ${jsStr(f.value)});`);
      } else {
        lines.push(`form.append(${jsStr(f.key)}, ${jsStr(f.value)});`);
      }
    }
    lines.push('');
    opts.push('  body: form,');
  } else if (p.data) {
    opts.push(`  body: ${jsStr(p.data)},`);
  }

  lines.push(`const response = await fetch(${jsStr(p.url)}, {`);
  lines.push(...opts);
  lines.push('});');
  lines.push('');
  lines.push('const data = await response.text();');
  lines.push('console.log(response.status, data);');
  return lines.join('\n');
}

// ── JavaScript (browser fetch) ──
// Same shape as the Node target, but there's no Buffer global in a browser, so
// Basic auth is base64-encoded with btoa() instead — and the file-attach TODO
// points at a File from a form input rather than fs, since Node's filesystem
// module doesn't exist in this environment either.
export function toJavaScriptFetch(p: ParsedCurl): string {
  const lines: string[] = [];
  const headers = allHeaders(p);
  const opts: string[] = [`  method: ${jsStr(p.method)},`];

  if (p.auth) {
    lines.push(`const credentials = btoa(${jsStr(`${p.auth.user}:${p.auth.pass}`)});`);
    lines.push('');
    headers.push(['Authorization', '__BASIC_AUTH__']);
  }
  if (headers.length) {
    opts.push('  headers: {');
    for (const [k, v] of headers) {
      const value = v === '__BASIC_AUTH__' ? '`Basic ${credentials}`' : jsStr(v);
      opts.push(`    ${jsStr(k)}: ${value},`);
    }
    opts.push('  },');
  }

  if (p.form) {
    lines.push('const form = new FormData();');
    for (const f of p.form) {
      if (f.isFile) {
        lines.push(`// TODO: attach the actual File object here, e.g. from an <input type="file"> element`);
        lines.push(`form.append(${jsStr(f.key)}, new Blob([/* file bytes */]), ${jsStr(f.value)});`);
      } else {
        lines.push(`form.append(${jsStr(f.key)}, ${jsStr(f.value)});`);
      }
    }
    lines.push('');
    opts.push('  body: form,');
  } else if (p.data) {
    opts.push(`  body: ${jsStr(p.data)},`);
  }

  lines.push(`const response = await fetch(${jsStr(p.url)}, {`);
  lines.push(...opts);
  lines.push('});');
  lines.push('');
  lines.push('const data = await response.text();');
  lines.push('console.log(response.status, data);');
  return lines.join('\n');
}

// ── Java (java.net.http.HttpClient) ──
function javaStr(s: string): string {
  return JSON.stringify(s);
}

export function toJavaHttpClient(p: ParsedCurl): string {
  const headers = allHeaders(p);
  const lines: string[] = [
    'import java.net.URI;',
    'import java.net.http.HttpClient;',
    'import java.net.http.HttpRequest;',
    'import java.net.http.HttpRequest.BodyPublishers;',
    'import java.net.http.HttpResponse;',
    'import java.util.Base64;',
    '',
    'public class Main {',
    '    public static void main(String[] args) throws Exception {',
  ];

  if (p.form) {
    lines.push('        // TODO: multipart/form-data has no built-in helper in java.net.http — build the');
    lines.push('        // body manually (a boundary-delimited byte stream) or use a library like');
    lines.push('        // okhttp\'s MultipartBody instead of HttpClient for this request:');
    for (const f of p.form) {
      lines.push(`        //   ${f.key} = ${f.isFile ? `<file: ${f.value}>` : f.value}`);
    }
    lines.push('');
  }

  lines.push('        HttpClient client = HttpClient.newHttpClient();');
  lines.push('');
  lines.push('        HttpRequest.Builder builder = HttpRequest.newBuilder()');
  lines.push(`            .uri(URI.create(${javaStr(p.url)}))`);
  for (const [k, v] of headers) lines.push(`            .header(${javaStr(k)}, ${javaStr(v)})`);
  if (p.auth) {
    lines.push(`            .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(${javaStr(`${p.auth.user}:${p.auth.pass}`)}.getBytes()))`);
  }

  const bodyPublisher = p.data ? `BodyPublishers.ofString(${javaStr(p.data)})` : 'BodyPublishers.noBody()';
  if (p.form) {
    lines.push(`            .method(${javaStr(p.method)}, BodyPublishers.noBody()); // TODO: replace with the multipart body above`);
  } else {
    lines.push(`            .method(${javaStr(p.method)}, ${bodyPublisher});`);
  }

  lines.push('');
  lines.push('        HttpRequest request = builder.build();');
  lines.push('        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());');
  lines.push('');
  lines.push('        System.out.println(response.statusCode());');
  lines.push('        System.out.println(response.body());');
  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}

// ── C# (HttpClient) ──
function csStr(s: string): string {
  return JSON.stringify(s);
}

export function toCSharpHttpClient(p: ParsedCurl): string {
  const headers = allHeaders(p);
  const lines: string[] = [
    'using System;',
    'using System.Net.Http;',
    'using System.Net.Http.Headers;',
    'using System.Text;',
    'using System.Threading.Tasks;',
    '',
    'class Program',
    '{',
    '    static async Task Main()',
    '    {',
    '        using var client = new HttpClient();',
  ];

  if (p.auth) {
    lines.push(`        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(${csStr(`${p.auth.user}:${p.auth.pass}`)}));`);
    lines.push('        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);');
  }
  for (const [k, v] of headers) {
    lines.push(`        client.DefaultRequestHeaders.TryAddWithoutValidation(${csStr(k)}, ${csStr(v)});`);
  }
  lines.push('');

  if (p.form) {
    lines.push('        using var content = new MultipartFormDataContent();');
    for (const f of p.form) {
      if (f.isFile) {
        lines.push(`        // TODO: attach the file at ${csStr(f.value)} — e.g. content.Add(new StreamContent(File.OpenRead(${csStr(f.value)})), ${csStr(f.key)}, ${csStr(f.value)});`);
      } else {
        lines.push(`        content.Add(new StringContent(${csStr(f.value)}), ${csStr(f.key)});`);
      }
    }
    lines.push('');
    lines.push(`        var request = new HttpRequestMessage(new HttpMethod(${csStr(p.method)}), ${csStr(p.url)}) { Content = content };`);
  } else if (p.data) {
    lines.push(`        var content = new StringContent(${csStr(p.data)}, Encoding.UTF8);`);
    lines.push(`        var request = new HttpRequestMessage(new HttpMethod(${csStr(p.method)}), ${csStr(p.url)}) { Content = content };`);
  } else {
    lines.push(`        var request = new HttpRequestMessage(new HttpMethod(${csStr(p.method)}), ${csStr(p.url)});`);
  }

  lines.push('');
  lines.push('        var response = await client.SendAsync(request);');
  lines.push('        var body = await response.Content.ReadAsStringAsync();');
  lines.push('');
  lines.push('        Console.WriteLine((int)response.StatusCode);');
  lines.push('        Console.WriteLine(body);');
  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}

// ── PHP (curl) ──
function phpStr(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

export function toPhpCurl(p: ParsedCurl): string {
  const lines: string[] = ['<?php', '', '$ch = curl_init();', '', `curl_setopt($ch, CURLOPT_URL, ${phpStr(p.url)});`,
    `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${phpStr(p.method)});`,
    'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
  if (p.insecure) {
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);');
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);');
  }

  if (p.form) {
    lines.push('', '$postFields = [');
    for (const f of p.form) {
      if (f.isFile) lines.push(`    ${phpStr(f.key)} => new CURLFile(${phpStr(f.value)}),`);
      else lines.push(`    ${phpStr(f.key)} => ${phpStr(f.value)},`);
    }
    lines.push('];');
    lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);');
  } else if (p.data) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, ${phpStr(p.data)});`);
  }

  const headers = allHeaders(p);
  if (headers.length) {
    lines.push('', 'curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    for (const [k, v] of headers) lines.push(`    ${phpStr(`${k}: ${v}`)},`);
    lines.push(']);');
  }
  if (p.auth) {
    lines.push(`curl_setopt($ch, CURLOPT_USERPWD, ${phpStr(`${p.auth.user}:${p.auth.pass}`)});`);
  }

  lines.push('', '$response = curl_exec($ch);', 'if ($response === false) {', '    echo curl_error($ch);', '}',
    'curl_close($ch);', '', 'echo $response;');
  return lines.join('\n');
}

// ── Rust (reqwest) ──
function rustStr(s: string): string {
  if (!s.includes('"')) return `"${s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')}"`;
  return `r#"${s}"#`;
}

export function toRustReqwest(p: ParsedCurl): string {
  const lines: string[] = ['use reqwest::Client;', ''];
  if (p.form) lines.splice(1, 0, 'use reqwest::multipart;');
  lines.push('#[tokio::main]', 'async fn main() -> Result<(), Box<dyn std::error::Error>> {');
  const usesInsecure = p.insecure;
  if (usesInsecure) {
    lines.push('    let client = Client::builder()');
    lines.push('        .danger_accept_invalid_certs(true)');
    lines.push('        .build()?;');
  } else {
    lines.push('    let client = Client::new();');
  }
  lines.push('');

  const methodCall = `client.request(reqwest::Method::from_bytes(b${rustStr(p.method)})?, ${rustStr(p.url)})`;
  lines.push(`    let req = ${methodCall}`);

  const headers = allHeaders(p);
  for (const [k, v] of headers) lines.push(`        .header(${rustStr(k)}, ${rustStr(v)})`);
  if (p.auth) lines.push(`        .basic_auth(${rustStr(p.auth.user)}, Some(${rustStr(p.auth.pass)}))`);

  if (p.form) {
    lines[lines.length - 1] += ';';
    lines.push('');
    lines.push('    let form = multipart::Form::new()');
    const formLines = p.form.map(f => f.isFile
      ? `        .file(${rustStr(f.key)}, ${rustStr(f.value)}).await?`
      : `        .text(${rustStr(f.key)}, ${rustStr(f.value)})`);
    lines.push(formLines.join('\n') + ';');
    lines.push('');
    lines.push('    let response = req.multipart(form).send().await?;');
  } else if (p.data) {
    lines.push(`        .body(${rustStr(p.data)});`);
    lines.push('');
    lines.push('    let response = req.send().await?;');
  } else {
    lines[lines.length - 1] += ';';
    lines.push('');
    lines.push('    let response = req.send().await?;');
  }

  lines.push('');
  lines.push('    println!("{}", response.status());');
  lines.push('    println!("{}", response.text().await?);');
  lines.push('    Ok(())');
  lines.push('}');
  return lines.join('\n');
}

// ── Postman collection ──
function urlToPostmanUrl(rawUrl: string): Record<string, unknown> {
  try {
    const u = new URL(rawUrl);
    const query = Array.from(u.searchParams.entries()).map(([key, value]) => ({ key, value }));
    return {
      raw: rawUrl,
      protocol: u.protocol.replace(':', ''),
      host: u.hostname.split('.'),
      path: u.pathname.split('/').filter(Boolean),
      ...(query.length ? { query } : {}),
    };
  } catch {
    // Not a full absolute URL (e.g. missing scheme) — fall back to the raw string only.
    return { raw: rawUrl };
  }
}

export function toPostmanCollection(p: ParsedCurl): string {
  const header = allHeaders(p).map(([key, value]) => ({ key, value }));

  let body: Record<string, unknown> | undefined;
  if (p.form) {
    body = {
      mode: 'formdata',
      formdata: p.form.map(f => f.isFile ? { key: f.key, type: 'file', src: f.value } : { key: f.key, value: f.value, type: 'text' }),
    };
  } else if (p.data) {
    body = { mode: 'raw', raw: p.data, options: { raw: { language: /^\s*[{[]/.test(p.data) ? 'json' : 'text' } } };
  }

  const auth = p.auth
    ? { type: 'basic', basic: [{ key: 'username', value: p.auth.user, type: 'string' }, { key: 'password', value: p.auth.pass, type: 'string' }] }
    : undefined;

  const collection = {
    info: { name: `${p.method} ${p.url}`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      {
        name: `${p.method} ${p.url}`,
        request: {
          method: p.method,
          header,
          ...(body ? { body } : {}),
          ...(auth ? { auth } : {}),
          url: urlToPostmanUrl(p.url),
        },
        response: [],
      },
    ],
  };

  return JSON.stringify(collection, null, 2);
}
