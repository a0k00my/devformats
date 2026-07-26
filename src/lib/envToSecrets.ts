import type { EnvVar } from './envParser';
import { toBase64 } from './envParser';

function yamlScalar(s: string): string {
  // Quote if the value would otherwise be misread as a different YAML type
  // (bool/null/number keywords) or contains characters YAML treats specially.
  const needsQuote = s === '' || /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||
    /^[-+]?[\d.]+$/.test(s) || /[:#{}\[\],&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ── docker-compose ──
export function toDockerCompose(vars: EnvVar[], serviceName: string): string {
  const lines = ['services:', `  ${serviceName || 'app'}:`, '    environment:'];
  for (const v of vars) lines.push(`      - ${v.key}=${v.value}`);
  return lines.join('\n');
}

// ── Kubernetes Secret ──
export function toK8sSecret(vars: EnvVar[], secretName: string): string {
  const lines = ['apiVersion: v1', 'kind: Secret', 'metadata:', `  name: ${secretName || 'app-secrets'}`, 'type: Opaque', 'data:'];
  for (const v of vars) lines.push(`  ${v.key}: ${toBase64(v.value)}`);
  return lines.join('\n');
}

// ── GitHub Actions secrets ──
function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function toGithubActions(vars: EnvVar[]): string {
  const lines = [
    '#!/usr/bin/env bash',
    '# Requires the GitHub CLI, authenticated: https://cli.github.com',
    '# Run from inside the repo (or add --repo owner/name to each line).',
    '',
  ];
  for (const v of vars) {
    lines.push(`gh secret set ${v.key} --body ${shSingleQuote(v.value)}`);
  }
  lines.push('', '# Reference them in a workflow like:');
  lines.push('# env:');
  for (const v of vars) lines.push(`#   ${v.key}: \${{ secrets.${v.key} }}`);
  return lines.join('\n');
}
