import { useState, useCallback, useRef, useEffect } from 'react';
import {useToolShortcuts, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

function extractXmlErrorLine(message: string): number | null {
  const m = message.match(/line[:\s]+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

const SAMPLE = `<root>
  <name>DevFormats</name>
  <valid>true</valid>
</root>`;

const LS_INPUT = 'df-input-xml-validator';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function XmlValidator() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [result, setResult] = useState<{ valid: boolean; message: string; line?: number | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doValidate = useCallback(() => {
    if (!input.trim()) { setResult(null); return; }
    const doc = new DOMParser().parseFromString(input, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const message = parseError.textContent?.trim() || 'Malformed XML';
      setResult({ valid: false, message, line: extractXmlErrorLine(message) });
    } else {
      setResult({ valid: true, message: `Well-formed XML — root element <${doc.documentElement.tagName}>` });
    }
  }, [input]);

  useToolShortcuts(doValidate);

  useEffect(() => { if (!result) doValidate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setResult(null); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setResult(null); localStorage.removeItem(LS_INPUT); };

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <div className="flex flex-col border-y" style={{ ...toolContainerStyle(isFullscreen), borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doValidate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">✓ Validate</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
          <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>XML Input</span>
          <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
        </div>
        <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your XML here…"
          errorLine={result && !result.valid ? (result.line ?? null) : null}
          spellCheck={false} autoComplete="off" autoCapitalize="off" />
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
        {result === null ? (
          <div className="text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>click Validate to check</div>
        ) : result.valid ? (
          <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' }}>✓ {result.message}</div>
        ) : (
          <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>✗ {result.message}</div>
        )}
      </div>
    </div>
  );
}
