import { useState, useCallback, useRef, useEffect } from 'react';
import { useLang } from '../hooks/useLang';
import { JsonTree } from './JsonTree';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';

type IndentMode = '2' | '4' | 'tab';
type ViewMode = 'tree' | 'raw';

const SAMPLE = `{
  "name": "DevFormats",
  "version": "2.0",
  "features": ["format", "validate", "minify", "diff"],
  "free": true,
  "price": null,
  "rating": 4.9,
  "author": {
    "type": "web-tool",
    "clientSide": true
  }
}`;

const LS_INPUT   = 'jfo-input-formatter';
const LS_OUTPUT  = 'jfo-output-formatter';
const LS_INDENT  = 'jfo-indent-formatter';
const LS_VIEW    = 'jfo-view-formatter';
const LS_SPLIT   = 'jfo-split-formatter';

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

// V8's JSON.parse errors include a raw string offset ("...at position 42")
// but no line/col — recover both by walking the original text up to that offset.
function describeJsonError(text: string, err: Error): string {
  const match = err.message.match(/position (\d+)/);
  if (!match) return err.message;
  const pos = parseInt(match[1], 10);
  const upToError = text.slice(0, pos);
  const line = upToError.split('\n').length;
  const col = pos - upToError.lastIndexOf('\n');
  return `${err.message} (line ${line}, col ${col})`;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return value;
}

function highlightJson(json: string, isLight: boolean): string {
  const escaped = json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped.replace(
    /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (m) => {
      if (/^"/.test(m)) {
        if (/:$/.test(m)) return `<span class="hl-key" style="color:${isLight?'#0550ae':'#e2e8f0'};font-weight:500">${m}</span>`;
        return `<span class="hl-str" style="color:${isLight?'#0a3069':'#7dd3fc'}">${m}</span>`;
      }
      if (/true|false/.test(m)) return `<span class="hl-bool" style="color:${isLight?'#0070f3':'#50e3c2'}">${m}</span>`;
      if (/null/.test(m)) return `<span class="hl-null" style="color:${isLight?'#888':'#555'}">${m}</span>`;
      return `<span class="hl-num" style="color:${isLight?'#953800':'#c084fc'}">${m}</span>`;
    }
  );
}

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface Stats { lines: number; size: string; }

export default function JsonFormatter() {
  const { tr } = useLang();
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return SAMPLE;
    const stored = localStorage.getItem(LS_INPUT);
    return stored !== null ? stored : SAMPLE;
  });
  const savedOutput = typeof window !== 'undefined' ? (localStorage.getItem(LS_OUTPUT) ?? '') : '';
  const savedIndent = (typeof window !== 'undefined' ? localStorage.getItem(LS_INDENT) : null) as IndentMode | null;
  const savedView   = (typeof window !== 'undefined' ? localStorage.getItem(LS_VIEW)   : null) as ViewMode | null;
  const [output, setOutput] = useState(savedOutput);
  const [parsedData, setParsedData] = useState<unknown>(() => {
    try { return savedOutput ? JSON.parse(savedOutput) : null; } catch { return null; }
  });
  const [highlighted, setHighlighted] = useState('');
  const [error, setError] = useState('');
  const [indentMode, setIndentMode] = useState<IndentMode>(savedIndent || '2');
  const [viewMode, setViewMode] = useState<ViewMode>(savedView || 'tree');
  const [stats, setStats] = useState<Stats | null>(() => {
    if (!savedOutput) return null;
    return { lines: savedOutput.split('\n').length, size: formatBytes(new TextEncoder().encode(savedOutput).length) };
  });
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [sortKeys, setSortKeys] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resizable splitter & mobile detection
  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_OUTPUT, output); }, [output]);
  useEffect(() => { localStorage.setItem(LS_INDENT, indentMode); }, [indentMode]);
  useEffect(() => { localStorage.setItem(LS_VIEW, viewMode); }, [viewMode]);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    window.addEventListener('jfo-theme-change', check);
    return () => window.removeEventListener('jfo-theme-change', check);
  }, []);

  const doFormat = useCallback((text: string, mode: IndentMode, light: boolean, sort: boolean) => {
    if (!text.trim()) { setOutput(''); setHighlighted(''); setError(''); setStats(null); setParsedData(null); return; }
    if (text.length > 5_000_000) { setError('Input exceeds 5 MB — paste a smaller JSON document.'); setOutput(''); setHighlighted(''); setStats(null); setParsedData(null); return; }
    try {
      const indent = mode === 'tab' ? '\t' : parseInt(mode);
      let parsed = JSON.parse(text);
      if (sort) parsed = sortKeysDeep(parsed);
      const formatted = JSON.stringify(parsed, null, indent as any);
      setOutput(formatted);
      setHighlighted(highlightJson(formatted, light));
      setParsedData(parsed);
      setError('');
      setStats({ lines: formatted.split('\n').length, size: formatBytes(new TextEncoder().encode(formatted).length) });
      setDirty(false);
    } catch (e: unknown) {
      setError(describeJsonError(text, e as Error));
      setOutput(''); setHighlighted(''); setStats(null); setParsedData(null);
    }
  }, []);

  useEffect(() => {
    if (output) setHighlighted(highlightJson(output, isLight));
    else setHighlighted('');
  }, [isLight, output]);

  const handleFormat = () => doFormat(input, indentMode, isLight, sortKeys);

  const handleIndentChange = (mode: IndentMode) => {
    setIndentMode(mode);
    if (output && !dirty) doFormat(input, mode, isLight, sortKeys);
  };

  const handleSortKeysToggle = () => {
    const next = !sortKeys;
    setSortKeys(next);
    if (output && !dirty) doFormat(input, indentMode, isLight, next);
  };

  const doMinify = () => {
    if (!input.trim()) return;
    try {
      const parsed = sortKeys ? sortKeysDeep(JSON.parse(input)) : JSON.parse(input);
      const m = JSON.stringify(parsed);
      setOutput(m);
      setHighlighted(highlightJson(m, isLight));
      setParsedData(parsed);
      setError('');
      setStats({ lines: 1, size: formatBytes(new TextEncoder().encode(m).length) });
      setDirty(false);
    } catch (e: unknown) { setError(describeJsonError(input, e as Error)); }
  };

  const doSampleData = () => {
    setInput(SAMPLE);
    setDirty(true);
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
    Object.assign(document.createElement('a'), { href: url, download: 'formatted.json' }).click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setHighlighted(''); setStats(null); setError(''); setParsedData(null); setDirty(true); };
    r.readAsText(file); e.target.value = '';
  };

  const doClear = () => {
    setInput(''); setOutput(''); setHighlighted(''); setError(''); setStats(null); setDirty(false); setParsedData(null);
    localStorage.removeItem(LS_INPUT); localStorage.removeItem(LS_OUTPUT);
  };

  // Cmd/Ctrl+Enter = run, Esc = clear focus (shared shortcuts across every tool page)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        doFormat(input, indentMode, isLight, sortKeys);
      } else if (e.key === 'Escape' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [input, indentMode, isLight, sortKeys, doFormat]);

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      {/* ── Toolbar ── */}
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
        style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>

        {/* Indent selector */}
        <div className="flex items-center rounded border p-0.5"
          style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
          {(['2', '4', 'tab'] as IndentMode[]).map(mode => (
            <button key={mode} onClick={() => handleIndentChange(mode)}
              className="rounded px-2 py-0.5 text-[11px] font-medium transition-all"
              style={{
                cursor: 'pointer',
                ...(indentMode === mode
                  ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' }
                  : { color: 'var(--jfo-text-3)' })
              }}>
              {mode === 'tab' ? 'Tab' : `${mode}sp`}
            </button>
          ))}
        </div>

        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />

        <button onClick={handleFormat} className="tb-btn-primary relative" title="Cmd/Ctrl+Enter">
          {tr('format')}
          {dirty && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" title="Input changed" />}
        </button>

        <button onClick={doMinify} className="tb-btn">{tr('minify')}</button>

        <button
          onClick={handleSortKeysToggle}
          className="tb-btn"
          title="Sort object keys alphabetically"
          style={sortKeys ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}
        >
          Sort Keys
        </button>

        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />

        <button onClick={doCopy} className="tb-btn"
          style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>
          {copied ? tr('copied') : tr('copy')}
        </button>

        <button onClick={doDownload} className="tb-btn-ghost">{tr('download')}</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">{tr('loadFile')}</button>
        <input ref={fileRef} type="file" accept=".json,text/plain,application/json" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">{tr('clear')}</button>

        {stats && (
          <div className="ml-auto flex items-center gap-2" style={{ ...MONO, color: 'var(--jfo-text-4)', fontSize: '11px' }}>
            <span>{stats.lines} lines</span>
            <span style={{ color: 'var(--jfo-border)' }}>·</span>
            <span>{stats.size}</span>
          </div>
        )}
      </div>

      {/* ── Error bar ── */}
      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs"
          style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span>
          <span className="font-medium" style={{ color: 'var(--jfo-text-3)' }}>{tr('syntaxError')}</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Editor area with resizable splitter ── */}
      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>

        {/* Input panel */}
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1"
            style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('input')}</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setDirty(true); }}
            placeholder={tr('pasteJson')}
            className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text' }}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>

        {/* ── Draggable divider / Static border on mobile ── */}
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        {/* Output panel */}
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1"
            style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <div className="flex items-center gap-2">
              <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('output')}</span>
              {/* Tree / Raw toggle */}
              {parsedData !== null && !error && (
                <div className="flex items-center rounded border p-0.5"
                  style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
                  {(['tree', 'raw'] as ViewMode[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      style={{
                        cursor: 'pointer',
                        ...MONO,
                        fontSize: '10px',
                        padding: '1px 7px',
                        borderRadius: 3,
                        border: 'none',
                        ...(viewMode === v
                          ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' }
                          : { background: 'transparent', color: 'var(--jfo-text-3)' }),
                      }}>
                      {v === 'tree' ? tr('viewTree') : tr('viewRaw')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!error && output && <span style={{ fontSize: '10px', color: 'var(--jfo-accent)', ...MONO }}>✓ valid</span>}
          </div>

          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {parsedData !== null && !error ? (
              viewMode === 'tree' ? (
                <div style={{ ...MONO, fontSize: '13px', lineHeight: '1.9', color: 'var(--jfo-code)' }}>
                  <JsonTree data={parsedData as any} isLight={isLight} />
                </div>
              ) : (
                highlighted ? (
                  <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}
                    dangerouslySetInnerHTML={{ __html: highlighted }} />
                ) : null
              )
            ) : (
              <div className="flex h-full items-center justify-center text-xs"
                style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? tr('fixError') : tr('clickFormat')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
