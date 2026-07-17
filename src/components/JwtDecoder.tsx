import { useState, useCallback, useEffect, useMemo } from 'react';
import { jwtVerify, importSPKI, type JWTVerifyResult } from 'jose';

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNzE2MjM5MDIyLCJleHAiOjIwMzE4MTUwMjJ9.dQw4w9WgXcQ_wpF0wnZWK4Cs2WM_7fBSC5J2GLzTiXQ';

const LS_INPUT = 'df-input-jwt-decoder';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

const HMAC_ALGS = new Set(['HS256', 'HS384', 'HS512']);
const RSA_EC_ALGS = new Set(['RS256', 'RS384', 'RS512', 'ES256', 'ES384']);

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
  return decodeURIComponent(
    atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
}

function relativeTime(unixSeconds: number): string {
  const diffMs = unixSeconds * 1000 - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let label: string;
  if (mins < 60) label = `${mins}m`;
  else if (hrs < 48) label = `${hrs}h`;
  else label = `${days}d`;
  return diffMs >= 0 ? `in ${label}` : `${label} ago`;
}

interface Decoded { header: any; payload: any; signature: string }

function decodeJwt(token: string): Decoded {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('A JWT must have 3 dot-separated parts (header.payload.signature)');
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  return { header, payload, signature: parts[2] };
}

export default function JwtDecoder() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyResult, setVerifyResult] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doDecode = useCallback((token: string) => {
    if (!token.trim()) { setDecoded(null); setError(''); return; }
    try {
      setDecoded(decodeJwt(token));
      setError('');
      setVerifyResult('idle');
    } catch (e: unknown) {
      setError((e as Error).message);
      setDecoded(null);
    }
  }, []);

  useEffect(() => { doDecode(input); }, [input, doDecode]);

  const alg: string | undefined = decoded?.header?.alg;
  const isNoneAlg = alg === 'none';
  const exp: number | undefined = decoded?.payload?.exp;
  const isExpired = typeof exp === 'number' && exp * 1000 < Date.now();

  const doVerify = async () => {
    if (!decoded || !alg) return;
    setVerifyResult('checking');
    try {
      let key: CryptoKey | Uint8Array;
      if (HMAC_ALGS.has(alg)) {
        if (!secret) throw new Error('Paste the HMAC secret first');
        key = new TextEncoder().encode(secret);
      } else if (RSA_EC_ALGS.has(alg)) {
        if (!secret) throw new Error('Paste the PEM public key first');
        key = await importSPKI(secret, alg);
      } else {
        throw new Error(`Unsupported algorithm for verification: ${alg}`);
      }
      await jwtVerify(input.trim(), key as any) as JWTVerifyResult;
      setVerifyResult('valid');
    } catch {
      setVerifyResult('invalid');
    }
  };

  const doCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label); setTimeout(() => setCopied(null), 1500);
  };

  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setDecoded(null); setError(''); setSecret(''); setVerifyResult('idle'); localStorage.removeItem(LS_INPUT); };

  const claimRows = useMemo(() => {
    if (!decoded) return [];
    const { exp: e, iat, nbf, ...rest } = decoded.payload ?? {};
    return { exp: e, iat, nbf, rest };
  }, [decoded]);

  return (
    <div className="flex flex-col" style={{ minHeight: 'min(70vh, 640px)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b border-y px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      <div className="border-b p-4" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
        <div className="mb-1 flex items-center justify-between">
          <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JWT</span>
          <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste your JWT here…"
          rows={4}
          className="w-full resize-none rounded border p-3 text-[13px] outline-none"
          style={{ ...MONO, lineHeight: '1.6', background: 'var(--jfo-bg-soft, var(--jfo-panel-hdr))', borderColor: 'var(--jfo-border-2)', color: 'var(--jfo-code)' }}
          spellCheck={false} autoComplete="off" autoCapitalize="off"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      {decoded && (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {/* Header */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-accent)' }}>Header</span>
              <button onClick={() => doCopy(JSON.stringify(decoded.header, null, 2), 'header')} className="tb-btn-ghost !py-0 !px-1.5 text-[10px]">{copied === 'header' ? '✓' : 'Copy'}</button>
            </div>
            <pre style={{ ...MONO, fontSize: '12px', color: 'var(--jfo-code)' }}>{JSON.stringify(decoded.header, null, 2)}</pre>
            {isNoneAlg && (
              <div className="mt-2 rounded px-2 py-1 text-[11px]" style={{ background: 'var(--jfo-err-bg)', color: 'var(--jfo-err-text)' }}>
                ⚠ alg:"none" — this token has no signature and should never be trusted.
              </div>
            )}
          </div>

          {/* Payload */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-accent)' }}>Payload</span>
              <button onClick={() => doCopy(JSON.stringify(decoded.payload, null, 2), 'payload')} className="tb-btn-ghost !py-0 !px-1.5 text-[10px]">{copied === 'payload' ? '✓' : 'Copy'}</button>
            </div>
            <pre style={{ ...MONO, fontSize: '12px', color: 'var(--jfo-code)' }}>{JSON.stringify(decoded.payload, null, 2)}</pre>
            {typeof exp === 'number' && (
              <div className="mt-2 rounded px-2 py-1 text-[11px]" style={isExpired ? { background: 'var(--jfo-err-bg)', color: 'var(--jfo-err-text)' } : { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' }}>
                {isExpired ? '⚠ Expired' : '✓ Expires'} {relativeTime(exp)}
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-accent)' }}>Signature — alg: {alg ?? 'unknown'}</span>
              <button onClick={() => doCopy(decoded.signature, 'sig')} className="tb-btn-ghost !py-0 !px-1.5 text-[10px]">{copied === 'sig' ? '✓' : 'Copy'}</button>
            </div>
            <pre className="mb-3 break-all" style={{ ...MONO, fontSize: '11px', color: 'var(--jfo-text-3)' }}>{decoded.signature}</pre>
            {!isNoneAlg && alg && (HMAC_ALGS.has(alg) || RSA_EC_ALGS.has(alg)) && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={secret}
                  onChange={e => { setSecret(e.target.value); setVerifyResult('idle'); }}
                  placeholder={HMAC_ALGS.has(alg) ? 'Paste HMAC secret to verify…' : 'Paste PEM public key to verify…'}
                  className="min-w-[240px] flex-1 rounded border px-2 py-1 text-xs outline-none"
                  style={{ ...MONO, background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)', color: 'var(--jfo-code)' }}
                />
                <button onClick={doVerify} className="tb-btn-primary">Verify Signature</button>
                {verifyResult === 'valid' && <span className="text-xs" style={{ color: 'var(--jfo-accent)' }}>✓ Signature valid</span>}
                {verifyResult === 'invalid' && <span className="text-xs" style={{ color: 'var(--jfo-err-text)' }}>✗ Signature invalid</span>}
                {verifyResult === 'checking' && <span className="text-xs" style={{ color: 'var(--jfo-text-3)' }}>Checking…</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
