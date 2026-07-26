import { useState, useCallback, useEffect } from 'react';
import * as yaml from 'js-yaml';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { postmanToOpenApi } from '../lib/postmanOpenapi';
import { highlightCode } from '../lib/codeHighlight';

const SAMPLE = JSON.stringify({
  info: { name: 'Sample API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  item: [
    {
      name: 'Get user',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
        url: { raw: '{{baseUrl}}/users/:id', host: ['{{baseUrl}}'], path: ['users', ':id'], query: [] },
      },
    },
    {
      name: 'Create user',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: { mode: 'raw', raw: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }, null, 2) },
        url: { raw: '{{baseUrl}}/users', host: ['{{baseUrl}}'], path: ['users'], query: [] },
      },
    },
  ],
}, null, 2);

const LS_INPUT = 'df-input-postman-to-openapi';
const LS_SPLIT = 'df-split-postman-to-openapi';
const LS_FORMAT = 'df-format-postman-to-openapi';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function PostmanToOpenApi() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [format, setFormat] = useState<'yaml' | 'json'>(() => (typeof window === 'undefined' ? 'yaml' : (localStorage.getItem(LS_FORMAT) as 'yaml' | 'json') ?? 'yaml'));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_FORMAT, format); }, [format]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try {
      const spec = postmanToOpenApi(input);
      setOutput(format === 'yaml' ? yaml.dump(spec, { noRefs: true }) : JSON.stringify(spec, null, 2));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not parse this collection.');
      setOutput('');
    }
  }, [input, format]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [format]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: format === 'yaml' ? 'text/yaml' : 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: `openapi.${format === 'yaml' ? 'yaml' : 'json'}` }).click();
    URL.revokeObjectURL(url);
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(LS_INPUT); };

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
          {(['yaml', 'json'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)} className="rounded px-2.5 py-0.5 text-[11px] font-medium uppercase transition-all"
              style={{ cursor: 'pointer', ...(format === f ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>{f}</button>
          ))}
        </div>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doGenerate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Convert</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Postman Collection (JSON)</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your exported Postman collection JSON here…"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            className="flex-1 resize-none p-4 outline-none"
            style={{ ...MONO, fontSize: '13px', lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)' }}
          />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>OpenAPI ({format.toUpperCase()}) Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, format === 'yaml' ? 'yaml' : 'json', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'OpenAPI spec appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
