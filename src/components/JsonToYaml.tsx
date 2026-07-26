import { useState, useCallback, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { useSplitter, SplitDivider, useIsMobile, useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';

const SAMPLE = `{
  "name": "DevFormats",
  "features": ["format", "validate", "minify"],
  "free": true
}`;

const LS_INPUT = 'df-input-json-to-yaml';
const LS_SPLIT = 'df-split-json-to-yaml';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function JsonToYaml() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doConvert = useCallback((text: string) => {
    if (!text.trim()) { setOutput(''); setError(''); setErrorLine(null); return; }
    try {
      // JSON.parse preserves insertion order for string keys, and js-yaml's
      // dump walks own-enumerable keys in that same order — key order survives.
      const data = JSON.parse(text);
      setOutput(yaml.dump(data, { lineWidth: -1 }));
      setError(''); setErrorLine(null);
      setDirty(false);
    } catch (e: unknown) {
      const described = describeJsonError(text, e as Error);
      setError(described.message); setErrorLine(described.line); setOutput('');
    }
  }, []);

  const handleConvert = () => doConvert(input);
  useToolShortcuts(handleConvert);

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'text/yaml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'converted.yaml' }).click();
    URL.revokeObjectURL(url);
  };
  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setError(''); setErrorLine(null); setDirty(true); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => { setInput(SAMPLE); setDirty(true); };
  const doClear = () => { setInput(''); setOutput(''); setError(''); setErrorLine(null); setDirty(false); localStorage.removeItem(LS_INPUT); };

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={handleConvert} className="tb-btn-primary relative" title="Cmd/Ctrl+Enter">
          ⚡ Convert to YAML
          {dirty && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" />}
        </button>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: "var(--jfo-accent-bg)", borderColor: "var(--jfo-accent-border)", color: "var(--jfo-accent)" } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span>
          <span className="font-medium" style={{ color: 'var(--jfo-text-3)' }}>SyntaxError:</span>
          <span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => { setInput(e.target.value); setDirty(true); }} placeholder="Paste your JSON here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>YAML Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'YAML output appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
