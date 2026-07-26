import { useState, useCallback, useEffect } from 'react';
import { useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

const LS_INPUT_ENCODE = 'df-input-url-encode';
const LS_INPUT_DECODE = 'df-input-url-decode';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface Props { mode: 'encode' | 'decode' }

export default function UrlCodec({ mode }: Props) {
  const lsKey = mode === 'encode' ? LS_INPUT_ENCODE : LS_INPUT_DECODE;
  const sample = mode === 'encode' ? 'https://devformats.com/search?q=json formatter & validator' : 'https%3A%2F%2Fdevformats.com%2Fsearch%3Fq%3Djson%20formatter';
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? sample : localStorage.getItem(lsKey) ?? sample));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(lsKey, input); }, [input, lsKey]);

  const doRun = useCallback(() => {
    if (!input) { setOutput(''); setError(''); return; }
    try {
      setOutput(mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input));
      setError('');
    } catch {
      setError('Invalid percent-encoding sequence.');
      setOutput('');
    }
  }, [input, mode]);

  useToolShortcuts(doRun);
  useEffect(() => { doRun(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(lsKey); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doRun} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ {mode === 'encode' ? 'Encode' : 'Decode'}</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: "var(--jfo-accent-bg)", borderColor: "var(--jfo-accent-border)", color: "var(--jfo-accent)" } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col md:flex-row" style={{ minHeight: 0 }}>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Plain Text' : 'Encoded URL'}</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Type or paste text…' : 'Paste percent-encoded text…'}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Encoded URL' : 'Plain Text'}</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>output appears here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
