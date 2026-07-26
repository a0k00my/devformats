import { useState, useCallback, useRef, useEffect } from 'react';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { parseCurl } from '../lib/curlParser';
import { toPythonRequests, toGoNetHttp, toNodeFetch, toPhpCurl, toRustReqwest, toPostmanCollection, toJavaScriptFetch, toJavaHttpClient, toCSharpHttpClient } from '../lib/curlToCode';
import { highlightCode } from '../lib/codeHighlight';

const SAMPLE = `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"name": "Alice", "email": "alice@example.com"}'`;

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export type TargetLang = 'python' | 'go' | 'node' | 'php' | 'rust' | 'postman' | 'javascript' | 'java' | 'csharp';

const TARGETS: Record<TargetLang, { label: string; ext: string; mime: string; generate: (cmd: string) => string }> = {
  python: { label: 'Python (requests)', ext: 'py', mime: 'text/x-python', generate: cmd => toPythonRequests(parseCurl(cmd)) },
  go: { label: 'Go (net/http)', ext: 'go', mime: 'text/x-go', generate: cmd => toGoNetHttp(parseCurl(cmd)) },
  node: { label: 'Node.js (fetch)', ext: 'js', mime: 'text/javascript', generate: cmd => toNodeFetch(parseCurl(cmd)) },
  php: { label: 'PHP (curl)', ext: 'php', mime: 'text/x-php', generate: cmd => toPhpCurl(parseCurl(cmd)) },
  rust: { label: 'Rust (reqwest)', ext: 'rs', mime: 'text/x-rust', generate: cmd => toRustReqwest(parseCurl(cmd)) },
  postman: { label: 'Postman Collection', ext: 'json', mime: 'application/json', generate: cmd => toPostmanCollection(parseCurl(cmd)) },
  javascript: { label: 'JavaScript (fetch)', ext: 'js', mime: 'text/javascript', generate: cmd => toJavaScriptFetch(parseCurl(cmd)) },
  java: { label: 'Java (HttpClient)', ext: 'java', mime: 'text/x-java-source', generate: cmd => toJavaHttpClient(parseCurl(cmd)) },
  csharp: { label: 'C# (HttpClient)', ext: 'cs', mime: 'text/x-csharp', generate: cmd => toCSharpHttpClient(parseCurl(cmd)) },
};

export default function CurlConverter({ lang }: { lang: TargetLang }) {
  const target = TARGETS[lang];
  const lsInput = `df-input-curl-to-${lang}`;

  const lsSplit = `df-split-curl-to-${lang}`;
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(lsInput) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(lsInput, input); }, [input, lsInput]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try {
      const parsed = parseCurl(input);
      if (!parsed.url) { setError('Could not find a URL in this command — make sure it starts with curl and includes a URL.'); setOutput(''); return; }
      setOutput(target.generate(input));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not parse this command.');
      setOutput('');
    }
  }, [input, target]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: target.mime }));
    Object.assign(document.createElement('a'), { href: url, download: `request.${target.ext}` }).click();
    URL.revokeObjectURL(url);
  };
  const doSampleData = () => setInput(SAMPLE);
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>cURL Command</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste a curl command here…"
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{target.label} Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, lang === 'python' ? 'python' : lang === 'postman' ? 'json' : 'clike', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : `${target.label} code appears here`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
