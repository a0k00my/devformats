import { useState, useCallback, useRef, useEffect } from 'react';
import { JsonTree } from './JsonTree';

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
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function JsonViewer() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
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
    if (!text.trim()) { setParsed(null); setError(''); return; }
    try {
      setParsed(JSON.parse(text));
      setError('');
    } catch (e: unknown) {
      setError((e as Error).message);
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
  const doClear = () => { setInput(''); setParsed(null); setError(''); localStorage.removeItem(LS_INPUT); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
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

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex flex-col overflow-hidden md:w-1/2" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your JSON here…"
            className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text', minHeight: 200 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>
        <div className="flex flex-col overflow-hidden md:w-1/2" style={{ minWidth: 0, borderTop: '1px solid var(--jfo-border-2)' }}>
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
