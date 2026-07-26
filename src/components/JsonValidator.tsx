import { useState, useRef, useEffect } from 'react';
import { useLang } from '../hooks/useLang';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface ValidationError { message: string; line?: number; col?: number; }

function parseJsonErrors(s: string): ValidationError[] {
  try { JSON.parse(s); return []; }
  catch (e: unknown) {
    const msg = (e as Error).message;
    const lc = msg.match(/line (\d+) column (\d+)/i);
    const pos = msg.match(/at position (\d+)/);
    let line: number | undefined, col: number | undefined;
    if (lc) { line = +lc[1]; col = +lc[2]; }
    else if (pos) { const p = +pos[1]; const b = s.slice(0, p); line = (b.match(/\n/g)||[]).length+1; col = p-b.lastIndexOf('\n'); }
    return [{ message: msg, line, col }];
  }
}

// Count only object keys, not array indices
function countStructure(o: unknown, d = 0): { keys: number; maxDepth: number } {
  if (Array.isArray(o)) {
    let keys = 0, maxDepth = d;
    for (const v of o) { const s = countStructure(v, d+1); keys += s.keys; maxDepth = Math.max(maxDepth, s.maxDepth); }
    return { keys, maxDepth };
  }
  if (typeof o === 'object' && o !== null) {
    let keys = 0, maxDepth = d;
    for (const v of Object.values(o as Record<string, unknown>)) {
      keys++;
      const s = countStructure(v, d+1);
      keys += s.keys;
      maxDepth = Math.max(maxDepth, s.maxDepth);
    }
    return { keys, maxDepth };
  }
  return { keys: 0, maxDepth: d };
}

const SAMPLE = `{\n  "name": "Alice",\n  "age": 30,\n  "email": "alice@example.com",\n  "active": true,\n  "roles": ["admin", "editor"]\n}`;
const LS_INPUT  = 'jfo-input-validator';
const LS_RESULT = 'jfo-result-validator';
const LS_SPLIT  = 'jfo-split-validator';

export default function JsonValidator() {
  const { tr } = useLang();
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return SAMPLE;
    const stored = localStorage.getItem(LS_INPUT);
    return stored !== null ? stored : SAMPLE;
  });
  const [result, setResult] = useState<{ valid: boolean; errors: ValidationError[]; stats?: { keys: number; depth: number } } | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LS_RESULT);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  });
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { if (result) localStorage.setItem(LS_RESULT, JSON.stringify(result)); else localStorage.removeItem(LS_RESULT); }, [result]);

  const validate = () => {
    if (!input.trim()) return;
    if (input.length > 5_000_000) { setResult({ valid: false, errors: [{ message: 'Input exceeds 5 MB — paste a smaller JSON document.' }] }); return; }
    const errors = parseJsonErrors(input);
    if (!errors.length) {
      const p = JSON.parse(input);
      const { keys, maxDepth } = countStructure(p);
      setResult({ valid: true, errors: [], stats: { keys, depth: maxDepth } });
    } else {
      setResult({ valid: false, errors });
    }
  };

  const doCopy = async () => {
    await navigator.clipboard.writeText(input);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setResult(null); };
    r.readAsText(f); e.target.value = '';
  };

  const errorLine = result && !result.valid ? (result.errors[0]?.line ?? null) : null;

  return (
    <div className="tool-height flex flex-col" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
        style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>

        <button onClick={validate} className="tb-btn-primary">{tr('validate')}</button>

        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`}
          style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>
          {copied ? tr('copied') : tr('copy')}
        </button>

        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">{tr('loadFile')}</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={() => { setInput(''); setResult(null); localStorage.removeItem(LS_INPUT); localStorage.removeItem(LS_RESULT); }} className="tb-btn-ghost">{tr('clear')}</button>
      </div>

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="editor-panel flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('input')}</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => { setInput(e.target.value); setResult(null); }}
            placeholder={tr('pasteJson')}
            errorLine={errorLine}
            spellCheck={false} />
        </div>

        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="editor-panel flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('result')}</span>
          </div>
          <div className="flex-1 overflow-auto p-5" style={{ background: 'var(--jfo-editor)' }}>
            {!result && (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>{tr('clickValidate')}</div>
            )}
            {result?.valid && (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border text-lg"
                    style={{ color: 'var(--jfo-accent)', borderColor: 'var(--jfo-accent-border)', background: 'var(--jfo-accent-bg)' }}>✓</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--jfo-accent)' }}>{tr('validJson')}</div>
                    <div className="text-[11px]" style={{ color: 'var(--jfo-text-3)' }}>{tr('noErrors')}</div>
                  </div>
                </div>
                {result.stats && (
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: tr('totalKeys'), val: result.stats.keys }, { label: tr('maxDepth'), val: result.stats.depth }].map(({ label, val }) => (
                      <div key={label} className="rounded-lg border p-3" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-bg-soft)' }}>
                        <div style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-3)', textTransform: 'uppercase' }}>{label}</div>
                        <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--jfo-text-1)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {result && !result.valid && (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border text-lg"
                    style={{ color: '#f87171', borderColor: 'rgba(238,0,0,0.2)', background: 'rgba(238,0,0,0.1)' }}>✗</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#f87171' }}>{tr('invalidJson')}</div>
                    <div className="text-[11px]" style={{ color: 'var(--jfo-text-3)' }}>{result.errors.length} {tr('errorFound')}</div>
                  </div>
                </div>
                {result.errors.map((err, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)' }}>
                    <div style={{ ...MONO, fontSize: '10px', fontWeight: 600, color: 'var(--jfo-err-text)' }}>
                      {err.line ? `Line ${err.line}${err.col ? `, Col ${err.col}` : ''}` : 'Parse error'}
                    </div>
                    <div className="mt-1 text-xs" style={{ ...MONO, color: 'var(--jfo-err-text)', opacity: 0.8 }}>{err.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
