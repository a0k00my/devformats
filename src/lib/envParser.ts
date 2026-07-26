// Parses .env-file syntax (KEY=value, optional "export ", quoted values, # comments)
// into a flat list of key/value pairs that every env-to-<target> emitter builds from.

export interface EnvVar { key: string; value: string }

export function parseEnv(text: string): EnvVar[] {
  const vars: EnvVar[] = [];
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      const commentIdx = value.indexOf(' #');
      if (commentIdx > -1) value = value.slice(0, commentIdx).trim();
    }

    vars.push({ key, value });
  }
  return vars;
}

// UTF-8-safe base64 (plain btoa breaks on non-Latin1 characters).
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
