import { useState, useRef, useEffect } from 'react';
import { useLang } from '../hooks/useLang';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };
const fmt = (b: number) => b < 1024 ? b+' B' : (b/1024).toFixed(1)+' KB';

const SAMPLE = `{\n  "user": {\n    "id": 1,\n    "name": "Alice",\n    "roles": ["admin", "editor"],\n    "active": true\n  },\n  "settings": {\n    "theme": "dark",\n    "notifications": false\n  }\n}`;

const LS_INPUT  = 'jfo-input-minifier';
const LS_OUTPUT = 'jfo-output-minifier';
const LS_SPLIT  = 'jfo-split-minifier';

export default function JsonMinifier() {
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
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ orig: number; mini: number; pct: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    const inp = localStorage.getItem(LS_INPUT) || '';
    const out = localStorage.getItem(LS_OUTPUT) || '';
    if (!inp || !out) return null;
    const o = new TextEncoder().encode(inp).length, mi = new TextEncoder().encode(out).length;
    return { orig: o, mini: mi, pct: Math.round((1 - mi/o) * 100) };
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_OUTPUT, output); }, [output]);

  const doMinify = () => {
    if (!input.trim()) return;
    if (input.length > 5_000_000) { setError('Input exceeds 5 MB — paste a smaller JSON document.'); return; }
    try {
      const m = JSON.stringify(JSON.parse(input));
      setOutput(m); setError(''); setErrorLine(null);
      const o = new TextEncoder().encode(input).length, mi = new TextEncoder().encode(m).length;
      setStats({ orig: o, mini: mi, pct: Math.round((1-mi/o)*100) });
    } catch (e: unknown) {
      const described = describeJsonError(input, e as Error);
      setError(described.message);
      setErrorLine(described.line);
      setOutput(''); setStats(null);
    }
  };

  const doCopy = async () => {
    const text = output || input;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const doDownload = () => {
    const text = output || input;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'minified.json' }).click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setStats(null); setError(''); setErrorLine(null); };
    r.readAsText(f); e.target.value = '';
  };

  return (
    <div className="tool-height flex flex-col" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
        style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>

        <button onClick={doMinify} className="tb-btn-primary">{tr('minify')}</button>

        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`}
          style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>
          {copied ? tr('copied') : tr('copyOutput')}
        </button>

        <button onClick={doDownload} className="tb-btn-ghost">{tr('download')}</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">{tr('loadFile')}</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={() => { setInput(''); setOutput(''); setError(''); setErrorLine(null); setStats(null); localStorage.removeItem(LS_INPUT); localStorage.removeItem(LS_OUTPUT); }} className="tb-btn-ghost">{tr('clear')}</button>

        {stats && (
          <div className="ml-auto flex items-center gap-2" style={{ ...MONO, fontSize: '11px', color: 'var(--jfo-text-3)' }}>
            <span>{fmt(stats.orig)}</span>
            <span style={{ color: 'var(--jfo-border)' }}>→</span>
            <span>{fmt(stats.mini)}</span>
            <span className="rounded px-2 py-0.5" style={{ background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' }}>-{stats.pct}%</span>
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('inputFormatted')}</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={tr('pasteJson')}
            errorLine={errorLine}
            spellCheck={false} />
        </div>

        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="editor-panel flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('outputMinified')}</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output
              ? <pre style={{ ...MONO, fontSize: '13px', lineHeight: '1.65', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
              : <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>{tr('clickMinify')}</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
