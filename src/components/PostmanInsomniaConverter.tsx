import { useState, useCallback, useEffect } from 'react';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { postmanToInsomnia, insomniaToPostman } from '../lib/postmanInsomnia';
import { highlightCode } from '../lib/codeHighlight';

const POSTMAN_SAMPLE = JSON.stringify({
  info: { name: 'Sample API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  item: [
    {
      name: 'Get user',
      request: {
        method: 'GET',
        header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
        url: { raw: '{{baseUrl}}/users/:id', path: ['users', ':id'] },
      },
    },
    {
      name: 'Create user',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: { mode: 'raw', raw: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }, null, 2) },
        url: { raw: '{{baseUrl}}/users', path: ['users'] },
      },
    },
  ],
}, null, 2);

const INSOMNIA_SAMPLE = JSON.stringify({
  _type: 'export',
  __export_format: 4,
  resources: [
    { _id: 'wrk_1', _type: 'workspace', name: 'Sample API' },
    {
      _id: 'req_1', _type: 'request', parentId: 'wrk_1', name: 'Get user', method: 'GET',
      url: '{{ _.baseUrl }}/users/:id',
      headers: [{ name: 'Authorization', value: 'Bearer {{ _.token }}' }],
    },
    {
      _id: 'req_2', _type: 'request', parentId: 'wrk_1', name: 'Create user', method: 'POST',
      url: '{{ _.baseUrl }}/users',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      body: { mimeType: 'application/json', text: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }, null, 2) },
    },
  ],
}, null, 2);

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export type Direction = 'postman-to-insomnia' | 'insomnia-to-postman';

export default function PostmanInsomniaConverter({ direction }: { direction: Direction }) {
  const isPostmanToInsomnia = direction === 'postman-to-insomnia';
  const sample = isPostmanToInsomnia ? POSTMAN_SAMPLE : INSOMNIA_SAMPLE;
  const inputLabel = isPostmanToInsomnia ? 'Postman Collection Input' : 'Insomnia Export Input';
  const outputLabel = isPostmanToInsomnia ? 'Insomnia Export Output' : 'Postman Collection Output';
  const downloadName = isPostmanToInsomnia ? 'insomnia_export.json' : 'postman_collection.json';
  const lsInput = `df-input-${direction}`;

  const lsSplit = `df-split-${direction}`;
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? sample : localStorage.getItem(lsInput) ?? sample));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(lsInput, input); }, [input, lsInput]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try {
      const result = isPostmanToInsomnia ? postmanToInsomnia(input) : insomniaToPostman(input);
      setOutput(JSON.stringify(result, null, 2));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not parse this file.');
      setOutput('');
    }
  }, [input, isPostmanToInsomnia]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: downloadName }).click();
    URL.revokeObjectURL(url);
  };
  const doSampleData = () => setInput(sample);
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(lsInput); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(lsSplit, 50);

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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{inputLabel}</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your JSON export here…"
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{outputLabel}</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, 'json', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'Converted output appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
