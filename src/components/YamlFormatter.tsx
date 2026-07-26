import { useState, useCallback, useRef, useEffect } from 'react';
import * as yaml from 'js-yaml';
import {useSplitter, SplitDivider, useIsMobile, useToolShortcuts, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { highlightCode } from '../lib/codeHighlight';

type IndentMode = '2' | '4';

const SAMPLE = `name: DevFormats
version: "2.0"
features:
  - format
  - validate
  - minify
free: true
author:
  type: web-tool
  clientSide: true
`;

const LS_INPUT = 'df-input-yaml-formatter';
const LS_INDENT = 'df-indent-yaml-formatter';
const LS_SPLIT = 'df-split-yaml-formatter';

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function YamlFormatter() {
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return SAMPLE;
    return localStorage.getItem(LS_INPUT) ?? SAMPLE;
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [indentMode, setIndentMode] = useState<IndentMode>(() => (typeof window === 'undefined' ? '2' : (localStorage.getItem(LS_INDENT) as IndentMode) || '2'));
  const [stats, setStats] = useState<{ lines: number; size: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_INDENT, indentMode); }, [indentMode]);

  const doFormat = useCallback((text: string, mode: IndentMode) => {
    if (!text.trim()) { setOutput(''); setError(''); setErrorLine(null); setStats(null); return; }
    try {
      const data = yaml.load(text);
      const formatted = yaml.dump(data, { indent: parseInt(mode, 10), lineWidth: -1 });
      setOutput(formatted);
      setError('');
      setErrorLine(null);
      setStats({ lines: formatted.split('\n').length, size: formatBytes(new TextEncoder().encode(formatted).length) });
      setDirty(false);
    } catch (e: unknown) {
      const err = e as yaml.YAMLException;
      const mark = (err as any).mark;
      setError(mark ? `${err.message} (line ${mark.line + 1}, col ${mark.column + 1})` : err.message);
      setErrorLine(mark ? mark.line + 1 : null);
      setOutput(''); setStats(null);
    }
  }, []);

  useEffect(() => { if (!output) doFormat(input, indentMode); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormat = () => doFormat(input, indentMode);
  useToolShortcuts(handleFormat);

  const handleIndentChange = (mode: IndentMode) => {
    setIndentMode(mode);
    if (output && !dirty) doFormat(input, mode);
  };

  const doMinify = () => {
    if (!input.trim()) return;
    try {
      const data = yaml.load(input);
      const compact = yaml.dump(data, { flowLevel: 0, lineWidth: -1 });
      setOutput(compact);
      setError('');
      setErrorLine(null);
      setStats({ lines: compact.split('\n').length, size: formatBytes(new TextEncoder().encode(compact).length) });
      setDirty(false);
    } catch (e: unknown) {
      const err = e as yaml.YAMLException;
      const mark = (err as any).mark;
      setError(mark ? `${err.message} (line ${mark.line + 1}, col ${mark.column + 1})` : err.message);
      setErrorLine(mark ? mark.line + 1 : null);
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
    const url = URL.createObjectURL(new Blob([text], { type: 'text/yaml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'formatted.yaml' }).click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setStats(null); setError(''); setErrorLine(null); setDirty(true); };
    r.readAsText(file); e.target.value = '';
  };

  const doSampleData = () => { setInput(SAMPLE); setDirty(true); };

  const doClear = () => {
    setInput(''); setOutput(''); setError(''); setErrorLine(null); setStats(null); setDirty(false);
    localStorage.removeItem(LS_INPUT);
  };

  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    window.addEventListener('jfo-theme-change', check);
    return () => window.removeEventListener('jfo-theme-change', check);
  }, []);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <div className="tool-height flex flex-col border-y" style={{ ...toolContainerStyle(isFullscreen), borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <div className="flex items-center rounded border p-0.5" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
          {(['2', '4'] as IndentMode[]).map(mode => (
            <button key={mode} onClick={() => handleIndentChange(mode)} className="rounded px-2 py-0.5 text-[11px] font-medium transition-all"
              style={{ cursor: 'pointer', ...(indentMode === mode ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>
              {mode}sp
            </button>
          ))}
        </div>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={handleFormat} className="tb-btn-primary relative" title="Cmd/Ctrl+Enter">
          ⚡ Format
          {dirty && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" />}
        </button>
        <button onClick={doMinify} className="tb-btn">Minify</button>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: "var(--jfo-accent-bg)", borderColor: "var(--jfo-accent-border)", color: "var(--jfo-accent)" } : {}}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".yaml,.yml,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        {stats && (
          <div className="ml-auto flex items-center gap-2" style={{ ...MONO, color: 'var(--jfo-text-4)', fontSize: '11px' }}>
            <span>{stats.lines} lines</span><span style={{ color: 'var(--jfo-border)' }}>·</span><span>{stats.size}</span>
          </div>
        )}
        <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span>
          <span className="font-medium" style={{ color: 'var(--jfo-text-3)' }}>YAMLException:</span>
          <span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea
            value={input}
            onChange={e => { setInput(e.target.value); setDirty(true); }}
            placeholder="Paste your YAML here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Output</span>
            {!error && output && <span style={{ fontSize: '10px', color: 'var(--jfo-accent)', ...MONO }}>✓ valid</span>}
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, 'yaml', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'paste YAML and click Format'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
