import { useState, useCallback, useRef, useEffect } from 'react';
import { useToolShortcuts } from './SplitPanel';

type Mode = 'encode' | 'decode';
const LS_INPUT = 'df-input-base64';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromUrlSafe(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  return padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem(LS_INPUT) ?? 'Hello, DevFormats!'));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doRun = useCallback(() => {
    setError('');
    setFileBytes(null);
    try {
      if (mode === 'encode') {
        const bytes = new TextEncoder().encode(input);
        const b64 = bytesToBase64(bytes);
        setOutput(urlSafe ? toUrlSafe(b64) : b64);
      } else {
        const normalized = urlSafe ? fromUrlSafe(input.trim()) : input.trim();
        const bytes = base64ToBytes(normalized);
        setOutput(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      }
    } catch (e: unknown) {
      setError(mode === 'decode' ? 'Invalid Base64 input.' : (e as Error).message);
      setOutput('');
    }
  }, [input, mode, urlSafe]);

  useToolShortcuts(doRun);
  useEffect(() => { if (input) doRun(); }, [mode, urlSafe]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
      const b64 = bytesToBase64(bytes);
      setInput(urlSafe ? toUrlSafe(b64) : b64);
      setMode('decode');
      setFileBytes(bytes);
      setOutput(`[binary file: ${file.name}, ${bytes.length} bytes — encoded above]`);
    };
    r.readAsArrayBuffer(file); e.target.value = '';
  };

  const doDownloadDecoded = () => {
    try {
      const normalized = urlSafe ? fromUrlSafe(input.trim()) : input.trim();
      const bytes = base64ToBytes(normalized);
      const url = URL.createObjectURL(new Blob([bytes]));
      Object.assign(document.createElement('a'), { href: url, download: 'decoded.bin' }).click();
      URL.revokeObjectURL(url);
    } catch { setError('Invalid Base64 input.'); }
  };

  const doClear = () => { setInput(''); setOutput(''); setError(''); setFileBytes(null); localStorage.removeItem(LS_INPUT); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <div className="flex items-center rounded border p-0.5" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
          {(['encode', 'decode'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className="rounded px-2.5 py-0.5 text-[11px] font-medium capitalize transition-all"
              style={{ cursor: 'pointer', ...(mode === m ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>
              {m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--jfo-text-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={urlSafe} onChange={e => setUrlSafe(e.target.checked)} />
          URL-safe
        </label>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doRun} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ {mode === 'encode' ? 'Encode' : 'Decode'}</button>
        <button onClick={doCopy} className="tb-btn" style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        {mode === 'decode' && <button onClick={doDownloadDecoded} className="tb-btn-ghost">↓ Download bytes</button>}
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" className="hidden" onChange={doLoadFile} />
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Plain Text' : 'Base64'}</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste text…' : 'Paste Base64 here…'}
            className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text', minHeight: 200 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{mode === 'encode' ? 'Base64' : 'Plain Text'}</span>
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
