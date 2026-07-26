import * as yaml from 'js-yaml';

export interface ComposePort { hostPort?: number; containerPort: number; protocol: 'TCP' | 'UDP' }
export interface ComposeVolume { source: string; target: string; isNamedVolume: boolean }

export interface ComposeService {
  name: string;
  image?: string;
  build?: boolean; // true if the service has no image, only a build context
  ports: ComposePort[];
  env: { name: string; value: string }[];
  volumes: ComposeVolume[];
  command?: string[];
  dependsOn: string[];
  replicas?: number;
}

function parsePort(raw: string | number): ComposePort | null {
  const str = String(raw);
  const [protoSplit, proto] = str.includes('/') ? str.split('/') : [str, 'tcp'];
  const parts = protoSplit.split(':');
  const protocol = proto.toUpperCase() === 'UDP' ? 'UDP' : 'TCP';
  if (parts.length === 1) {
    const containerPort = parseInt(parts[0], 10);
    if (Number.isNaN(containerPort)) return null;
    return { containerPort, protocol };
  }
  // host:container — host may itself contain a bind IP (ip:host:container), so take the last two segments
  const containerPort = parseInt(parts[parts.length - 1], 10);
  const hostPort = parseInt(parts[parts.length - 2], 10);
  if (Number.isNaN(containerPort) || Number.isNaN(hostPort)) return null;
  return { hostPort, containerPort, protocol };
}

function parseEnv(raw: unknown): { name: string; value: string }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(entry => {
      const str = String(entry);
      const idx = str.indexOf('=');
      return idx === -1 ? { name: str, value: '' } : { name: str.slice(0, idx), value: str.slice(idx + 1) };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([name, value]) => ({ name, value: String(value ?? '') }));
  }
  return [];
}

function parseVolumes(raw: unknown): ComposeVolume[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(entry => {
    if (typeof entry === 'object' && entry !== null) {
      const v = entry as Record<string, unknown>;
      return { source: String(v.source ?? ''), target: String(v.target ?? ''), isNamedVolume: v.type === 'volume' };
    }
    const str = String(entry);
    const parts = str.split(':');
    const source = parts[0];
    const target = parts[1] ?? parts[0];
    const isNamedVolume = !source.startsWith('.') && !source.startsWith('/');
    return { source, target, isNamedVolume };
  });
}

export function parseDockerCompose(text: string): ComposeService[] {
  const doc = yaml.load(text) as Record<string, any>;
  if (!doc?.services || typeof doc.services !== 'object') {
    throw new Error('No services found — expected a top-level "services" map.');
  }

  return Object.entries<Record<string, any>>(doc.services).map(([name, svc]) => {
    const ports = Array.isArray(svc.ports) ? svc.ports.map(parsePort).filter((p): p is ComposePort => p !== null) : [];
    const command = svc.command
      ? Array.isArray(svc.command) ? svc.command.map(String) : String(svc.command).split(' ').filter(Boolean)
      : undefined;

    return {
      name,
      image: svc.image,
      build: !svc.image && !!svc.build,
      ports,
      env: parseEnv(svc.environment),
      volumes: parseVolumes(svc.volumes),
      command,
      dependsOn: Array.isArray(svc.depends_on) ? svc.depends_on.map(String) : svc.depends_on ? Object.keys(svc.depends_on) : [],
      replicas: typeof svc.deploy?.replicas === 'number' ? svc.deploy.replicas : undefined,
    };
  });
}
