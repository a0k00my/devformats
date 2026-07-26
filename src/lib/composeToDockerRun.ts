import type { ComposeService } from './dockerComposeParser';

function shQuote(s: string): string {
  return /^[A-Za-z0-9_./:=-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

export function composeToDockerRun(services: ComposeService[]): string {
  const blocks: string[] = [];
  const buildOnly = services.filter(s => s.build);
  const runnable = services.filter(s => !s.build);

  if (buildOnly.length) {
    blocks.push(
      buildOnly
        .map(s => `# ${s.name}: has no "image", only a build context — docker run can't build an\n# image itself. Run "docker build -t ${s.name} <context>" first, then re-run this\n# with that image name substituted in.`)
        .join('\n\n'),
    );
  }

  if (runnable.some(s => s.dependsOn.length)) {
    const notes = runnable
      .filter(s => s.dependsOn.length)
      .map(s => `# ${s.name} depends_on: ${s.dependsOn.join(', ')} — start those containers first;`)
      .join('\n');
    blocks.push(`${notes}\n# docker run does not sequence startup order the way depends_on does.`);
  }

  for (const svc of runnable) {
    // Comments can only appear here as standalone lines BEFORE the command — bash
    // does not treat "#" as a comment when it's the next token after a backslash
    // line-continuation, so any note has to live outside the "parts" that get
    // joined into the actual multi-line command.
    const preNotes: string[] = [];
    if (svc.replicas && svc.replicas > 1) {
      preNotes.push(
        `# ${svc.name} deploy.replicas: ${svc.replicas} — docker run starts exactly one container;`,
        `# run it in a loop with distinct --name/-p values (or use docker-compose/Swarm/Kubernetes)`,
        `# to actually run more than one.`,
      );
    }

    const parts = ['docker run -d', `--name ${shQuote(svc.name)}`];
    for (const p of svc.ports) {
      const mapping = p.hostPort ? `${p.hostPort}:${p.containerPort}` : `${p.containerPort}`;
      parts.push(`-p ${mapping}${p.protocol === 'UDP' ? '/udp' : ''}`);
    }
    for (const e of svc.env) parts.push(`-e ${shQuote(`${e.name}=${e.value}`)}`);
    for (const v of svc.volumes) parts.push(`-v ${shQuote(`${v.source}:${v.target}`)}`);
    parts.push(svc.image!);
    if (svc.command) parts.push(svc.command.map(shQuote).join(' '));

    const command = parts.join(' \\\n  ');
    blocks.push(preNotes.length ? `${preNotes.join('\n')}\n${command}` : command);
  }

  return blocks.join('\n\n');
}
