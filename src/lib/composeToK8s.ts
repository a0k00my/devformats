import * as yaml from 'js-yaml';
import type { ComposeService } from './dockerComposeParser';

// A docker-compose service name can contain underscores; Kubernetes object
// names must be lowercase RFC 1123 labels (letters, digits, '-').
function k8sName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'service';
}

function dumpDoc(obj: Record<string, unknown>): string {
  return yaml.dump(obj, { noRefs: true, lineWidth: -1 });
}

export function composeToK8s(services: ComposeService[]): string {
  const docs: string[] = [];
  const pvcNamesEmitted = new Set<string>();

  for (const svc of services) {
    const name = k8sName(svc.name);
    const notes: string[] = [];

    if (svc.build) {
      notes.push(
        `# ${svc.name}: this service has no "image", only a build context.`,
        '# Kubernetes cannot build images itself — build and push this image to a',
        '# registry first, then set that image here before applying.',
        '',
      );
      docs.push(notes.join('\n'));
      continue;
    }

    if (svc.dependsOn.length) {
      notes.push(`# ${svc.name} depends_on: ${svc.dependsOn.join(', ')} — Kubernetes does not enforce startup`);
      notes.push('# order between Deployments the way depends_on does. Use a readiness probe on the');
      notes.push('# dependency and/or an initContainer that waits for it, if strict ordering matters.');
    }

    const volumeMounts = svc.volumes.map(v => ({ name: k8sName(v.source), mountPath: v.target }));
    const volumes = svc.volumes.map(v => {
      if (v.isNamedVolume) {
        if (!pvcNamesEmitted.has(v.source)) {
          pvcNamesEmitted.add(v.source);
          docs.push(dumpDoc({
            apiVersion: 'v1',
            kind: 'PersistentVolumeClaim',
            metadata: { name: k8sName(v.source) },
            spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } },
          }) + `# ^ default 1Gi size — adjust to what ${v.source} actually needs.\n`);
        }
        return { name: k8sName(v.source), persistentVolumeClaim: { claimName: k8sName(v.source) } };
      }
      return {
        name: k8sName(v.source),
        hostPath: { path: v.source }, // bind mount: only works if the path exists on the node — not portable across a real cluster
      };
    });
    if (svc.volumes.some(v => !v.isNamedVolume)) {
      notes.push(`# ${svc.name}: bind-mount volume(s) converted to hostPath, which only works if that`);
      notes.push('# path exists on the node running the pod — not portable across a multi-node cluster.');
      notes.push('# Use a PersistentVolumeClaim instead for anything beyond local single-node testing.');
    }

    const container: Record<string, unknown> = {
      name,
      image: svc.image,
      ...(svc.command ? { command: svc.command } : {}),
      ...(svc.ports.length ? { ports: svc.ports.map(p => ({ containerPort: p.containerPort, protocol: p.protocol })) } : {}),
      ...(svc.env.length ? { env: svc.env.map(e => ({ name: e.name, value: e.value })) } : {}),
      ...(volumeMounts.length ? { volumeMounts } : {}),
    };

    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name },
      spec: {
        replicas: svc.replicas ?? 1,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [container],
            ...(volumes.length ? { volumes } : {}),
          },
        },
      },
    };

    const header = notes.length ? notes.join('\n') + '\n' : '';
    docs.push(header + dumpDoc(deployment));

    if (svc.ports.length) {
      const service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name },
        spec: {
          selector: { app: name },
          ports: svc.ports.map(p => ({
            port: p.hostPort ?? p.containerPort,
            targetPort: p.containerPort,
            protocol: p.protocol,
          })),
        },
      };
      docs.push(dumpDoc(service));
    }
  }

  return docs.join('---\n');
}
