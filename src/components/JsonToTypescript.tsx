import { useState, useCallback, useRef, useEffect } from 'react';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';
import { highlightCode } from '../lib/codeHighlight';

const SAMPLE = `{
  "name": "DevFormats",
  "version": "2.0",
  "free": true,
  "price": null,
  "tags": ["json", "yaml"],
  "author": { "type": "web-tool", "clientSide": true }
}`;

const LS_INPUT = 'df-input-json-to-ts';
const LS_SPLIT = 'df-split-json-to-ts';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

function toPascalCase(name: string): string {
  return name.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

interface GenOptions { declKind: 'interface' | 'type'; unknownType: 'unknown' | 'any'; rootName: string }

function generate(value: unknown, name: string, opts: GenOptions, out: string[]): string {
  if (value === null) return opts.unknownType;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${opts.unknownType}[]`;
    const elType = generate(value[0], name.replace(/s$/, ''), opts, out);
    return `${elType}[]`;
  }
  if (typeof value === 'object') {
    const typeName = toPascalCase(name);
    const fields = Object.entries(value as Record<string, unknown>).map(([key, val]) => {
      const optional = val === null;
      const fieldType = generate(val, key, opts, out);
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `  ${safeKey}${optional ? '?' : ''}: ${fieldType};`;
    });
    const body = `{\n${fields.join('\n')}\n}`;
    if (opts.declKind === 'interface') {
      out.push(`export interface ${typeName} ${body}`);
    } else {
      out.push(`export type ${typeName} = ${body};`);
    }
    return typeName;
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return opts.unknownType;
}

function jsonToTypescript(json: string, opts: GenOptions): string {
  const data = JSON.parse(json);
  const out: string[] = [];
  generate(data, opts.rootName, opts, out);
  return out.reverse().join('\n\n');
}

export default function JsonToTypescript() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [declKind, setDeclKind] = useState<'interface' | 'type'>('interface');
  const [unknownType, setUnknownType] = useState<'unknown' | 'any'>('unknown');
  const [rootName, setRootName] = useState('Root');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); setErrorLine(null); return; }
    try {
      setOutput(jsonToTypescript(input, { declKind, unknownType, rootName: rootName || 'Root' }));
      setError(''); setErrorLine(null);
    } catch (e: unknown) {
      const described = describeJsonError(input, e as Error);
      setError(described.message); setErrorLine(described.line); setOutput('');
    }
  }, [input, declKind, unknownType, rootName]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [declKind, unknownType, rootName]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'text/typescript' }));
    Object.assign(document.createElement('a'), { href: url, download: `${rootName || 'types'}.ts` }).click();
    URL.revokeObjectURL(url);
  };
  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setError(''); setErrorLine(null); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); setErrorLine(null); localStorage.removeItem(LS_INPUT); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

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
          {(['interface', 'type'] as const).map(k => (
            <button key={k} onClick={() => setDeclKind(k)} className="rounded px-2.5 py-0.5 text-[11px] font-medium capitalize transition-all"
              style={{ cursor: 'pointer', ...(declKind === k ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>{k}</button>
          ))}
        </div>
        <div className="flex items-center rounded border p-0.5" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
          {(['unknown', 'any'] as const).map(k => (
            <button key={k} onClick={() => setUnknownType(k)} className="rounded px-2.5 py-0.5 text-[11px] font-medium transition-all"
              style={{ cursor: 'pointer', ...(unknownType === k ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>{k}</button>
          ))}
        </div>
        <input value={rootName} onChange={e => setRootName(e.target.value)} placeholder="Root" className="w-20 rounded border px-2 py-1 text-xs outline-none" style={{ ...MONO, background: 'var(--jfo-editor)', borderColor: 'var(--jfo-border)', color: 'var(--jfo-code)' }} />
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doGenerate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Generate</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: "var(--jfo-accent-bg)", borderColor: "var(--jfo-accent-border)", color: "var(--jfo-accent)" } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Input</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your JSON here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>TypeScript Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, 'clike', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'TypeScript output appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
