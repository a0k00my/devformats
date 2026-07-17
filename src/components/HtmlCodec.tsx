import { useState, useCallback, useEffect } from 'react';
import { useToolShortcuts } from './SplitPanel';

const LS_INPUT_ENCODE = 'df-input-html-encode';
const LS_INPUT_DECODE = 'df-input-html-decode';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

const ENTITY_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function htmlEncode(s: string): string {
  return s.replace(/[&<>"']/g, c => ENTITY_MAP[c]);
}

function htmlDecode(s: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

interface Props { mode: 'encode' | 'decode' }

export default function HtmlCodec({ mode }: Props) {
  const lsKey = mode === 'encode' ? LS_INPUT_ENCODE : LS_INPUT_DECODE;
  const sample = mode === 'encode' ? '<div class="tools">Fast & private</div>' : '&lt;div class=&quot;tools&quot;&gt;Fast &amp; private&lt;/div&gt;';
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? sample : localStorage.getItem(lsKey) ?? sample));
  const [output, setOutput] = useState('');

  useEffect(() => { localStorage.setItem(lsKey, input); }, [input, lsKey]);

  const doRun = useCallback(() => {
    if (!input) { setOutput(''); return; }
    setOutput(mode === 'encode' ? htmlEncode(input) : htmlDecode(input));
  }, [input, mode]);

  useToolShortcuts(doRun);
  useEffect(() => { doRun(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [copied, setCopied] = useState(false);
  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doClear = () => { setInput(''); setOutput(''); localStorage.removeItem(lsKey); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doRun} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ {mode === 'encode' ? 'Encode' : 'Decode'}</button>
        <button onClick={doCopy} className="tb-btn" style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row" style={{ minHeight: 0 }}>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Raw HTML' : 'Encoded Entities'}</span>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Type or paste HTML…' : 'Paste HTML entities…'}
            className="flex-1 resize-none p-4 text-[13px] outline-none" style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', minHeight: 200 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Encoded Entities' : 'Raw HTML'}</span>
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
