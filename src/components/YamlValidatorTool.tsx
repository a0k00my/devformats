import { useState, useCallback, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

const SAMPLE = `name: DevFormats
valid: true
tools:
  - json-formatter
  - yaml-formatter
`;

const LS_INPUT = 'df-input-yaml-validator';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

function countKeysAndDepth(value: unknown, depth = 0): { keys: number; maxDepth: number } {
  if (value === null || typeof value !== 'object') return { keys: 0, maxDepth: depth };
  const entries = Array.isArray(value) ? value : Object.values(value as object);
  let keys = Array.isArray(value) ? 0 : Object.keys(value as object).length;
  let maxDepth = depth;
  for (const v of entries) {
    const child = countKeysAndDepth(v, depth + 1);
    keys += child.keys;
    maxDepth = Math.max(maxDepth, child.maxDepth);
  }
  return { keys, maxDepth };
}

export default function YamlValidatorTool() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [result, setResult] = useState<{ valid: boolean; message: string; line?: number | null; stats?: { keys: number; maxDepth: number } } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doValidate = useCallback(() => {
    if (!input.trim()) { setResult(null); return; }
    try {
      const data = yaml.load(input);
      setResult({ valid: true, message: 'Valid YAML', stats: countKeysAndDepth(data) });
    } catch (e: unknown) {
      const err = e as yaml.YAMLException;
      const mark = (err as any).mark;
      setResult({ valid: false, message: mark ? `${err.message} (line ${mark.line + 1}, col ${mark.column + 1})` : err.message, line: mark ? mark.line + 1 : null });
    }
  }, [input]);

  useToolShortcuts(doValidate);

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setResult(null); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setResult(null); localStorage.removeItem(LS_INPUT); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doValidate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">✓ Validate</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".yaml,.yml,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
          <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>YAML Input</span>
          <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
        </div>
        <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your YAML here…"
          errorLine={result && !result.valid ? (result.line ?? null) : null}
          spellCheck={false} autoComplete="off" autoCapitalize="off" />
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
        {result === null ? (
          <div className="text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>click Validate to check</div>
        ) : result.valid ? (
          <div className="space-y-1.5">
            <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' }}>✓ {result.message}</div>
            {result.stats && (
              <div className="flex gap-4 text-xs" style={{ ...MONO, color: 'var(--jfo-text-3)' }}>
                <span>Total Keys: {result.stats.keys}</span>
                <span>Max Depth: {result.stats.maxDepth}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>✗ {result.message}</div>
        )}
      </div>
    </div>
  );
}
