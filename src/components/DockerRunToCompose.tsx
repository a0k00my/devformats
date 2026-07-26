import { useState, useCallback, useEffect } from 'react';
import {useToolShortcuts, useSplitter, SplitDivider, useIsMobile, useFullscreen, FullscreenButton, toolContainerStyle} from './SplitPanel';
import { parseDockerRunCommands, dockerRunToCompose } from '../lib/dockerRunToCompose';
import { highlightCode } from '../lib/codeHighlight';

const SAMPLE = `docker run -d --name web -p 8080:80 -e NODE_ENV=production -v ./html:/usr/share/nginx/html nginx:latest

docker run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=secret -v db-data:/var/lib/postgresql/data postgres:15`;

const LS_INPUT = 'df-input-docker-run-to-compose';
const LS_SPLIT = 'df-split-docker-run-to-compose';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function DockerRunToCompose() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try {
      const commands = parseDockerRunCommands(input);
      setOutput(dockerRunToCompose(commands));
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not parse this docker run command.');
      setOutput('');
    }
  }, [input]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'text/yaml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'docker-compose.yml' }).click();
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>docker run Input</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste one or more docker run commands, separated by a blank line…"
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>docker-compose.yml Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }} dangerouslySetInnerHTML={{ __html: highlightCode(output, 'yaml', isLight) }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'docker-compose.yml appears here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
