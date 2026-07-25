import { useState, useCallback, useEffect } from 'react';
import { JSONPath } from 'jsonpath-plus';
import { useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';

const SAMPLE = `{
  "tools": [
    { "slug": "json-formatter", "category": "json", "status": "live" },
    { "slug": "yaml-formatter", "category": "yaml", "status": "live" },
    { "slug": "jsonpath", "category": "json", "status": "planned" }
  ]
}`;

const LS_INPUT = 'df-input-jsonpath';
const LS_QUERY = 'df-query-jsonpath';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface Match { path: string; value: unknown }

export default function JsonPathTester() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [query, setQuery] = useState(() => (typeof window === 'undefined' ? '$.tools[?(@.category=="json")].slug' : localStorage.getItem(LS_QUERY) ?? '$.tools[?(@.category=="json")].slug'));
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_QUERY, query); }, [query]);

  const runQuery = useCallback((text: string, q: string) => {
    if (!text.trim() || !q.trim()) { setMatches(null); setError(''); setErrorLine(null); return; }
    try {
      const data = JSON.parse(text);
      const results = JSONPath({ path: q, json: data, resultType: 'all' }) as Array<{ path: string; value: unknown }>;
      setMatches(results.map(r => ({ path: r.path, value: r.value })));
      setError(''); setErrorLine(null);
    } catch (e: unknown) {
      const described = describeJsonError(text, e as Error);
      setError(described.message);
      setErrorLine(described.line);
      setMatches(null);
    }
  }, []);

  const doRun = useCallback(() => runQuery(input, query), [input, query, runQuery]);

  useToolShortcuts(doRun);
  useEffect(() => { doRun(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSampleData = () => {
    const sampleQuery = '$.tools[?(@.category=="json")].slug';
    setInput(SAMPLE);
    setQuery(sampleQuery);
    runQuery(SAMPLE, sampleQuery);
  };
  const doClear = () => { setInput(''); setQuery(''); setMatches(null); setError(''); setErrorLine(null); localStorage.removeItem(LS_INPUT); localStorage.removeItem(LS_QUERY); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="border-b p-3" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ ...MONO, fontSize: '11px', color: 'var(--jfo-text-3)' }}>Query:</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="$.tools[*].slug"
            className="min-w-[260px] flex-1 rounded border px-2 py-1 text-xs outline-none"
            style={{ ...MONO, background: 'var(--jfo-editor)', borderColor: 'var(--jfo-border)', color: 'var(--jfo-code)' }}
          />
          <button onClick={doRun} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Run</button>
          <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
          <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="flex flex-col overflow-hidden md:w-1/2" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Input</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your JSON here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-col overflow-hidden border-t md:w-1/2 md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Matches</span>
            {matches && <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>}
          </div>
          <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--jfo-editor)' }}>
            {matches && matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((m, i) => (
                  <div key={i} className="rounded border p-2 text-xs" style={{ borderColor: 'var(--jfo-border)' }}>
                    <div style={{ ...MONO, color: 'var(--jfo-accent)', fontSize: '11px' }}>{m.path}</div>
                    <pre style={{ ...MONO, color: 'var(--jfo-code)', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(m.value, null, 2)}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {matches && matches.length === 0 ? 'no matches' : 'run a query to see matched values'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
