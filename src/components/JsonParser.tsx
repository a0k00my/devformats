import { useState, useCallback, useRef, useEffect } from 'react';
import { JsonTree } from './JsonTree';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

const SAMPLE = `{
  "name": "DevFormats",
  "valid": true,
}`;

const LS_INPUT = 'df-input-json-parser';
const LS_SPLIT = 'df-split-json-parser';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface ParseResult { data?: unknown; error?: string; explanation?: string; line?: number; col?: number }

function explainError(text: string, err: Error): { message: string; explanation: string; line?: number; col?: number } {
  const match = err.message.match(/position (\d+)/);
  let line: number | undefined, col: number | undefined;
  let snippet = '';
  if (match) {
    const pos = parseInt(match[1], 10);
    const upTo = text.slice(0, pos);
    line = upTo.split('\n').length;
    col = pos - upTo.lastIndexOf('\n');
    snippet = text.slice(Math.max(0, pos - 15), pos + 15);
  }

  let explanation = 'Check the syntax around the reported position — every key and string must use double quotes, and no comma may follow the last item in an object or array.';
  if (/,\s*[}\]]/.test(snippet)) {
    explanation = 'A trailing comma appears right before a closing } or ] — JSON does not allow a comma after the last item.';
  } else if (/'/.test(snippet)) {
    explanation = "Single quotes were found — JSON strings and keys must use double quotes (\") only.";
  } else if (/[{,]\s*[A-Za-z_]\w*\s*:/.test(snippet)) {
    explanation = 'An object key appears without quotes — every key must be a double-quoted string, e.g. "key": value.';
  } else if (/\/\//.test(snippet) || /\/\*/.test(snippet)) {
    explanation = 'A comment was found — JSON has no comment syntax (// or /* */ are not valid).';
  } else if (/Unexpected end of JSON input/.test(err.message)) {
    explanation = 'The input ends before every object/array was closed — count your { } and [ ] pairs.';
  }

  return { message: err.message, explanation, line, col };
}

export default function JsonParser() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [result, setResult] = useState<ParseResult>({});
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
    if (!text.trim()) { setResult({}); return; }
    try {
      setResult({ data: JSON.parse(text) });
    } catch (e: unknown) {
      const { message, explanation, line, col } = explainError(text, e as Error);
      setResult({ error: message, explanation, line, col });
    }
  }, []);

  const handleParse = () => doParse(input);
  useToolShortcuts(handleParse);
  useEffect(() => { doParse(input); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setResult({}); localStorage.removeItem(LS_INPUT); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <div className="flex flex-col border-y" style={{ ...toolContainerStyle(isFullscreen), borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={handleParse} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Parse</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      </div>

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your JSON here…"
            errorLine={result.line ?? null}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Result</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {result.error ? (
              <div className="space-y-3">
                <div className="rounded border p-3 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
                  <div className="font-semibold">✗ SyntaxError{result.line ? ` at line ${result.line}, col ${result.col}` : ''}</div>
                  <div className="mt-1">{result.error}</div>
                </div>
                <div className="rounded border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--jfo-border)', color: 'var(--jfo-text-2)' }}>
                  <span className="font-semibold" style={{ color: 'var(--jfo-text-1)' }}>What this usually means: </span>
                  {result.explanation}
                </div>
              </div>
            ) : result.data !== undefined ? (
              <div style={{ ...MONO, fontSize: '13px', lineHeight: '1.9', color: 'var(--jfo-code)' }}>
                <JsonTree data={result.data as any} isLight={isLight} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>paste JSON and click Parse</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
