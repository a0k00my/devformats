import { useState, useRef, useEffect } from 'react';
import { useLang } from '../hooks/useLang';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

const SAMPLE = `[\n  { "id": 1, "name": "Alice", "email": "alice@example.com", "active": true, "score": 98.5 },\n  { "id": 2, "name": "Bob", "email": "bob@example.com", "active": false, "score": 87.2 },\n  { "id": 3, "name": "Carol", "email": "carol@example.com", "active": true, "score": 92.1 }\n]`;
const LS_INPUT  = 'jfo-input-csv';
const LS_OUTPUT = 'jfo-output-csv';
const LS_SPLIT  = 'jfo-split-csv';

function jsonToCsv(data: unknown[]): { csv: string; cols: number } {
  if (!data.length) return { csv: '', cols: 0 };
  const headers = Array.from(data.reduce<Set<string>>((acc, row) => {
    if (typeof row === 'object' && row !== null) Object.keys(row as Record<string, unknown>).forEach(k => acc.add(k));
    return acc;
  }, new Set<string>()));
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [
    headers.map(esc).join(','),
    ...data.map(row => {
      const o = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
      return headers.map(h => esc(o[h])).join(',');
    }),
  ].join('\n');
  return { csv, cols: headers.length };
}

export default function JsonToCsv() {
  const { tr } = useLang();
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return SAMPLE;
    const stored = localStorage.getItem(LS_INPUT);
    return stored !== null ? stored : SAMPLE;
  });
  const [output, setOutput] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_OUTPUT) ?? '') : ''
  );
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ rows: number; cols: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    const out = localStorage.getItem(LS_OUTPUT) || '';
    if (!out) return null;
    try {
      const inp = localStorage.getItem(LS_INPUT) || '';
      const p = JSON.parse(inp);
      if (Array.isArray(p) && p.length) {
        const headers = Array.from(p.reduce<Set<string>>((acc, row) => {
          if (typeof row === 'object' && row !== null) Object.keys(row as Record<string,unknown>).forEach(k => acc.add(k));
          return acc;
        }, new Set<string>()));
        return { rows: p.length, cols: headers.length };
      }
    } catch {}
    return null;
  });
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_OUTPUT, output); }, [output]);

  const doConvert = () => {
    if (!input.trim()) return;
    if (input.length > 5_000_000) { setError('Input exceeds 5 MB — paste a smaller JSON document.'); return; }
    try {
      const p = JSON.parse(input);
      if (!Array.isArray(p)) throw new Error('Input must be a JSON array of objects.');
      const { csv, cols } = jsonToCsv(p);
      setOutput(csv); setError('');
      setStats({ rows: p.length, cols });
    } catch (e: unknown) { setError((e as Error).message); setOutput(''); setStats(null); }
  };

  const doCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: 'data.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setStats(null); setError(''); };
    r.readAsText(f); e.target.value = '';
  };

  return (
    <div className="tool-height flex flex-col" style={{ height: 'min(70vh, 640px)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
        style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>

        <button onClick={doConvert} className="tb-btn-primary">{tr('convertToCsv')}</button>

        <button onClick={doCopy} className="tb-btn"
          style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>
          {copied ? tr('copied') : tr('copyCSV')}
        </button>

        <button onClick={doDownload} className="tb-btn-ghost">{tr('downloadCSV')}</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">{tr('loadFile')}</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={() => { setInput(''); setOutput(''); setError(''); setStats(null); localStorage.removeItem(LS_INPUT); localStorage.removeItem(LS_OUTPUT); }} className="tb-btn-ghost">{tr('clear')}</button>

        {stats && (
          <div className="ml-auto flex items-center gap-1.5" style={{ ...MONO, fontSize: '11px', color: 'var(--jfo-text-3)' }}>
            <span>{stats.rows} {tr('rows')}</span>
            <span style={{ color: 'var(--jfo-border)' }}>·</span>
            <span>{stats.cols} {tr('cols')}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs"
          style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="editor-panel flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('jsonInput')}</span>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={tr('pasteArray')} className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text' }}
            spellCheck={false} />
        </div>

        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="editor-panel flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('csvOutput')}</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output
              ? <pre style={{ ...MONO, fontSize: '13px', lineHeight: '1.65', whiteSpace: 'pre-wrap', color: 'var(--jfo-code)' }}>{output}</pre>
              : <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>{tr('clickConvert')}</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
