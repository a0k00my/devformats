import { useState, useCallback, useRef, useEffect } from 'react';
import { useToolShortcuts, useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { parseEnv } from '../lib/envParser';
import { toDockerCompose, toK8sSecret, toGithubActions } from '../lib/envToSecrets';

const SAMPLE = `# .env
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
API_KEY="sk_live_abc123"
DEBUG=false
PORT=3000`;

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export type TargetLang = 'docker-compose' | 'k8s-secret' | 'github-actions';

const TARGETS: Record<TargetLang, { label: string; ext: string; mime: string; nameLabel: string; namePlaceholder: string; defaultName: string; generate: (text: string, name: string) => string }> = {
  'docker-compose': {
    label: 'docker-compose environment',
    ext: 'yml',
    mime: 'text/yaml',
    nameLabel: 'Service',
    namePlaceholder: 'app',
    defaultName: 'app',
    generate: (text, name) => toDockerCompose(parseEnv(text), name),
  },
  'k8s-secret': {
    label: 'Kubernetes Secret',
    ext: 'yaml',
    mime: 'text/yaml',
    nameLabel: 'Secret name',
    namePlaceholder: 'app-secrets',
    defaultName: 'app-secrets',
    generate: (text, name) => toK8sSecret(parseEnv(text), name),
  },
  'github-actions': {
    label: 'GitHub Actions secrets',
    ext: 'sh',
    mime: 'text/x-shellscript',
    nameLabel: '',
    namePlaceholder: '',
    defaultName: '',
    generate: text => toGithubActions(parseEnv(text)),
  },
};

export default function EnvToSecrets({ lang }: { lang: TargetLang }) {
  const target = TARGETS[lang];
  const lsInput = `df-input-env-to-${lang}`;
  const lsSplit = `df-split-env-to-${lang}`;
  const lsName = `df-name-env-to-${lang}`;

  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(lsInput) ?? SAMPLE));
  const [name, setName] = useState(() => (typeof window === 'undefined' ? target.defaultName : localStorage.getItem(lsName) ?? target.defaultName));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(lsInput, input); }, [input, lsInput]);
  useEffect(() => { localStorage.setItem(lsName, name); }, [name, lsName]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    const vars = parseEnv(input);
    if (!vars.length) { setError('No KEY=value lines found — check the format (comments and blank lines are skipped).'); setOutput(''); return; }
    setOutput(target.generate(input, name));
    setError('');
  }, [input, name, target]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: target.mime }));
    Object.assign(document.createElement('a'), { href: url, download: `secrets.${target.ext}` }).click();
    URL.revokeObjectURL(url);
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(lsInput); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(lsSplit, 50);

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        {target.nameLabel && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder={target.namePlaceholder}
            className="w-32 rounded border px-2 py-1 text-xs outline-none"
            style={{ ...MONO, background: 'var(--jfo-editor)', borderColor: 'var(--jfo-border)', color: 'var(--jfo-code)' }} />
        )}
        <button onClick={doGenerate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Convert</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>.env Input</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your .env file here…"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            className="flex-1 resize-none p-4 outline-none"
            style={{ ...MONO, fontSize: '13px', lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)' }}
          />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{target.label} Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : `${target.label} output appears here`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
