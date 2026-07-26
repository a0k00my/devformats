import { useState, useCallback, useEffect } from 'react';
import { useToolShortcuts, useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { parseCreateTable } from '../lib/sqlDdlParser';
import { toPrisma, toDrizzle, toTypeOrm, toSqlAlchemy, toSequelize } from '../lib/sqlDdlToOrm';

const SAMPLE = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT
);`;

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export type TargetLang = 'prisma' | 'drizzle' | 'typeorm' | 'sqlalchemy' | 'sequelize';

const TARGETS: Record<TargetLang, { label: string; ext: string; mime: string; generate: (sql: string) => string }> = {
  prisma: { label: 'Prisma Schema', ext: 'prisma', mime: 'text/plain', generate: sql => toPrisma(parseCreateTable(sql)) },
  drizzle: { label: 'Drizzle Schema', ext: 'ts', mime: 'text/typescript', generate: sql => toDrizzle(parseCreateTable(sql)) },
  typeorm: { label: 'TypeORM Entity', ext: 'ts', mime: 'text/typescript', generate: sql => toTypeOrm(parseCreateTable(sql)) },
  sqlalchemy: { label: 'SQLAlchemy Model', ext: 'py', mime: 'text/x-python', generate: sql => toSqlAlchemy(parseCreateTable(sql)) },
  sequelize: { label: 'Sequelize Model', ext: 'js', mime: 'text/javascript', generate: sql => toSequelize(parseCreateTable(sql)) },
};

export default function SqlDdlToOrm({ lang }: { lang: TargetLang }) {
  const target = TARGETS[lang];
  const lsInput = `df-input-sql-to-${lang}`;

  const lsSplit = `df-split-sql-to-${lang}`;
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(lsInput) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem(lsInput, input); }, [input, lsInput]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    const tables = parseCreateTable(input);
    if (!tables.length) { setError('No CREATE TABLE statement found — check the syntax.'); setOutput(''); return; }
    setOutput(target.generate(input));
    setError('');
  }, [input, target]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: target.mime }));
    Object.assign(document.createElement('a'), { href: url, download: `schema.${target.ext}` }).click();
    URL.revokeObjectURL(url);
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(lsInput); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(lsSplit, 50);

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doGenerate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Convert</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>SQL DDL Input</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your CREATE TABLE statement(s) here…"
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
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : `${target.label} output appears here`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
