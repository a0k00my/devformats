import { useState, useCallback, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { JsonTree } from './JsonTree';

const SAMPLE = `name: DevFormats
tools:
  - json-formatter
  - yaml-formatter
meta:
  free: true
`;

const LS_INPUT = 'df-input-yaml-parser';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function YamlParserTool() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [isLight, setIsLight] = useState(false);
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
    try { setParsed(yaml.load(text)); setError(''); }
    catch (e: unknown) {
      const err = e as yaml.YAMLException;
      const mark = (err as any).mark;
      setError(mark ? `${err.message} (line ${mark.line + 1}, col ${mark.column + 1})` : err.message);
      setParsed(null);
    }
  }, []);

  useEffect(() => { doParse(input); }, [input, doParse]);

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
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".yaml,.yml,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="flex flex-col overflow-hidden md:w-1/2" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>YAML Input</span>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your YAML here…"
            className="flex-1 resize-none p-4 text-[13px] outline-none" style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', minHeight: 240 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-col overflow-hidden border-t md:w-1/2 md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Parsed Structure</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {parsed !== null && !error ? (
              <div style={{ ...MONO, fontSize: '13px', lineHeight: '1.9', color: 'var(--jfo-code)' }}>
                <JsonTree data={parsed as any} isLight={isLight} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>paste YAML to inspect its structure</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
