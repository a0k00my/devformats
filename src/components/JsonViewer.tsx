import { useState, useCallback, useRef, useEffect } from 'react';
import { JsonTree } from './JsonTree';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';

const SAMPLE = `{
  "name": "DevFormats",
  "version": "2.0",
  "tools": [
    { "slug": "json-formatter", "category": "json" },
    { "slug": "yaml-formatter", "category": "yaml" }
  ],
  "meta": { "free": true, "clientSide": true }
}`;

const LS_INPUT = 'df-input-json-viewer';
const LS_SPLIT = 'df-split-json-viewer';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function JsonViewer() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLight, setIsLight] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    window.addEventListener('jfo-theme-change', check);
    return () => window.removeEventListener('jfo-theme-change', check);
  }, []);

  const doParse = useCallback((text: string) => {
    if (!text.trim()) { setParsed(null); setError(''); setErrorLine(null); return; }
    try {
      setParsed(JSON.parse(text));
      setError(''); setErrorLine(null);
    } catch (e: unknown) {
      const described = describeJsonError(text, e as Error);
      setError(described.message);
      setErrorLine(described.line);
      setParsed(null);
    }
  }, []);

  useEffect(() => { doParse(input); }, [input, doParse]);

  const doCopyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => setInput(ev.target?.result as string);
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setParsed(null); setError(''); setErrorLine(null); localStorage.removeItem(LS_INPUT); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search keys or values…"
          className="min-w-[200px] flex-1 max-w-xs rounded border px-2 py-1 text-xs outline-none"
          style={{ ...MONO, background: 'var(--jfo-editor)', borderColor: 'var(--jfo-border)', color: 'var(--jfo-code)' }}
        />
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        {copiedPath && (
          <div className="ml-auto flex items-center gap-1 text-xs" style={{ ...MONO, color: 'var(--jfo-accent)' }}>
            ✓ Copied {copiedPath}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span>
          <span className="font-medium" style={{ color: 'var(--jfo-text-3)' }}>SyntaxError:</span>
          <span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden md:flex-row" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your JSON here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, borderTop: '1px solid var(--jfo-border-2)' }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Tree</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {parsed !== null && !error ? (
              <div style={{ ...MONO, fontSize: '13px', lineHeight: '1.9', color: 'var(--jfo-code)' }}>
                <JsonTree data={parsed as any} isLight={isLight} searchTerm={search} onCopyPath={doCopyPath} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'paste JSON to browse it as a tree'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
