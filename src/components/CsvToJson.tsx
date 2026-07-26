import { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { useToolShortcuts, useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

const SAMPLE = `name,age,city
Alice,30,New York
Bob,25,Boston`;

const LS_INPUT = 'df-input-csv-to-json';
const LS_SPLIT = 'df-split-csv-to-json';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function CsvToJson() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [rowCount, setRowCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doConvert = useCallback((text: string, header: boolean) => {
    if (!text.trim()) { setOutput(''); setError(''); setErrorLine(null); setRowCount(0); return; }
    const result = Papa.parse(text.trim(), { header, skipEmptyLines: true, dynamicTyping: true });
    if (result.errors.length > 0) {
      const firstErr = result.errors[0];
      setError(`${firstErr.message}${typeof firstErr.row === 'number' ? ` (row ${firstErr.row + 1})` : ''}`);
      setErrorLine(typeof firstErr.row === 'number' ? firstErr.row + 1 + (header ? 1 : 0) : null);
      setOutput(''); setRowCount(0);
      return;
    }
    setOutput(JSON.stringify(result.data, null, 2));
    setRowCount(result.data.length);
    setError(''); setErrorLine(null);
  }, []);

  const handleConvert = () => doConvert(input, hasHeader);
  useToolShortcuts(handleConvert);

  const handleHeaderToggle = (v: boolean) => { setHasHeader(v); if (output) doConvert(input, v); };

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'converted.json' }).click();
    URL.revokeObjectURL(url);
  };
  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setError(''); setErrorLine(null); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); setErrorLine(null); setRowCount(0); localStorage.removeItem(LS_INPUT); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--jfo-text-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasHeader} onChange={e => handleHeaderToggle(e.target.checked)} />
          First row is header
        </label>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={handleConvert} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Convert to JSON</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: "var(--jfo-accent-bg)", borderColor: "var(--jfo-accent-border)", color: "var(--jfo-accent)" } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        {rowCount > 0 && (
          <div className="ml-auto" style={{ ...MONO, color: 'var(--jfo-text-4)', fontSize: '11px' }}>{rowCount} rows</div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>CSV Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your CSV here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'JSON output appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
