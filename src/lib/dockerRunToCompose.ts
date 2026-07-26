// Parses one or more `docker run` invocations (separated by a blank line) and
// emits an equivalent docker-compose.yml `services:` block. This is the
// reverse of composeToDockerRun.ts — since `docker run` has a strictly
// smaller feature set than compose (no depends_on, no replicas, no build
// context), nothing here needs an "unsupported construct" comment the way
// compose-to-run does; the one thing this direction has to invent is a
// service name when --name wasn't passed, which is called out explicitly.

export interface DockerRunPort { hostPort?: number; containerPort: number; protocol: 'tcp' | 'udp' }
export interface DockerRunVolume { source: string; target: string }
export interface DockerRunCommand {
  name: string | null;
  image: string;
  ports: DockerRunPort[];
  env: { name: string; value: string }[];
  volumes: DockerRunVolume[];
  command: string[];
}

const VALUE_FLAGS = new Set([
  '--name', '-p', '--publish', '-e', '--env', '-v', '--volume', '--network',
  '-w', '--workdir', '-u', '--user', '--restart', '--entrypoint', '-h', '--hostname',
  '-m', '--memory', '--cpus', '--env-file', '--label', '-l',
]);
const BOOLEAN_FLAGS = new Set([
  '-d', '--detach', '-i', '--interactive', '-t', '--tty', '--rm', '--privileged', '--init',
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

function parsePort(raw: string): DockerRunPort | null {
  const [protoSplit, proto] = raw.includes('/') ? raw.split('/') : [raw, 'tcp'];
  const parts = protoSplit.split(':');
  const protocol = proto.toLowerCase() === 'udp' ? 'udp' : 'tcp';
  if (parts.length === 1) {
    const containerPort = parseInt(parts[0], 10);
    if (Number.isNaN(containerPort)) return null;
    return { containerPort, protocol };
  }
  const containerPort = parseInt(parts[parts.length - 1], 10);
  const hostPort = parseInt(parts[parts.length - 2], 10);
  if (Number.isNaN(containerPort) || Number.isNaN(hostPort)) return null;
  return { hostPort, containerPort, protocol };
}

function parseVolume(raw: string): DockerRunVolume {
  const parts = raw.split(':');
  return { source: parts[0], target: parts[1] ?? parts[0] };
}

function slugifyImage(image: string): string {
  // Drop a registry/repo path and tag/digest, keeping just the last path segment
  // as a readable default service name — e.g. "postgres:15" -> "postgres",
  // "ghcr.io/acme/api-server:latest" -> "api-server".
  const withoutDigest = image.split('@')[0];
  const withoutTag = withoutDigest.replace(/:[^/]*$/, '');
  const lastSegment = withoutTag.split('/').filter(Boolean).pop() ?? 'app';
  return lastSegment.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

export function parseDockerRunCommands(text: string): DockerRunCommand[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  if (!blocks.length) throw new Error('No docker run command found.');

  return blocks.map(block => {
    let tokens = tokenize(block);
    if (tokens[0] === 'docker') tokens = tokens.slice(1);
    if (tokens[0] === 'run') tokens = tokens.slice(1);
    if (!tokens.length) throw new Error('Could not find a docker run command — expected something starting with "docker run".');

    const result: DockerRunCommand = { name: null, image: '', ports: [], env: [], volumes: [], command: [] };
    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok === '--name') { result.name = tokens[++i]; i++; continue; }
      if (tok === '-p' || tok === '--publish') {
        const port = parsePort(tokens[++i]);
        if (port) result.ports.push(port);
        i++; continue;
      }
      if (tok === '-e' || tok === '--env') {
        const raw = tokens[++i];
        const idx = raw.indexOf('=');
        result.env.push(idx === -1 ? { name: raw, value: '' } : { name: raw.slice(0, idx), value: raw.slice(idx + 1) });
        i++; continue;
      }
      if (tok === '-v' || tok === '--volume') {
        result.volumes.push(parseVolume(tokens[++i]));
        i++; continue;
      }
      if (VALUE_FLAGS.has(tok)) { i += 2; continue; } // consume and discard flags compose has no equivalent for
      if (BOOLEAN_FLAGS.has(tok) || (tok.startsWith('-') && tok !== '-')) { i++; continue; }

      // First non-flag token is the image; everything after it is the container command.
      if (!result.image) { result.image = tok; i++; continue; }
      result.command.push(tok);
      i++;
    }

    if (!result.image) throw new Error('Could not find an image name in this docker run command.');
    return result;
  });
}

function yamlScalar(s: string): string {
  // A colon is only special in YAML when followed by whitespace (it starts a
  // mapping) — an image ref's "name:tag" colon never is, so it's safe unquoted.
  return /^[\w.\-\/:@]+$/.test(s) && !s.includes(': ') ? s : JSON.stringify(s);
}

export function dockerRunToCompose(commands: DockerRunCommand[]): string {
  const usedNames = new Set<string>();
  const notes: string[] = [];

  const serviceBlocks = commands.map(cmd => {
    let name = cmd.name;
    if (!name) {
      name = slugifyImage(cmd.image);
      notes.push(`# "${name}" has no --name in the source command — service key inferred from the image.`);
    }
    let uniqueName = name;
    let n = 2;
    while (usedNames.has(uniqueName)) { uniqueName = `${name}-${n}`; n++; }
    usedNames.add(uniqueName);

    const lines = [`  ${uniqueName}:`, `    image: ${yamlScalar(cmd.image)}`];

    if (cmd.ports.length) {
      lines.push('    ports:');
      for (const p of cmd.ports) {
        const mapping = p.hostPort ? `${p.hostPort}:${p.containerPort}` : `${p.containerPort}`;
        lines.push(`      - "${mapping}${p.protocol === 'udp' ? '/udp' : ''}"`);
      }
    }
    if (cmd.env.length) {
      lines.push('    environment:');
      for (const e of cmd.env) lines.push(`      - ${e.name}=${e.value}`);
    }
    if (cmd.volumes.length) {
      lines.push('    volumes:');
      for (const v of cmd.volumes) lines.push(`      - ${v.source}:${v.target}`);
    }
    if (cmd.command.length) {
      lines.push(`    command: [${cmd.command.map(c => JSON.stringify(c)).join(', ')}]`);
    }
    return lines.join('\n');
  });

  const header = notes.length ? notes.join('\n') + '\n' : '';
  return `${header}services:\n${serviceBlocks.join('\n\n')}\n`;
}
