import { useState, useEffect } from 'react';
import { useLang } from '../hooks/useLang';

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface DiffEntry { path: string; type: 'added' | 'removed' | 'changed'; oldVal?: unknown; newVal?: unknown; }

function diffValues(a: unknown, b: unknown, path: string, r: DiffEntry[]) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) r.push({ path: p, type: 'added', newVal: b[i] });
      else if (i >= b.length) r.push({ path: p, type: 'removed', oldVal: a[i] });
      else diffValues(a[i], b[i], p, r);
    }
    return;
  }
  if (isPlainObj(a) && isPlainObj(b)) {
    const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in ao)) r.push({ path: p, type: 'added', newVal: bo[k] });
      else if (!(k in bo)) r.push({ path: p, type: 'removed', oldVal: ao[k] });
      else diffValues(ao[k], bo[k], p, r);
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    r.push({ path: path || '(root)', type: 'changed', oldVal: a, newVal: b });
  }
}

function isPlainObj(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function diffObjects(a: unknown, b: unknown): DiffEntry[] {
  const r: DiffEntry[] = [];
  diffValues(a, b, '', r);
  return r;
}

const SA = `{\n  "name": "Alice",\n  "age": 30,\n  "email": "alice@example.com",\n  "role": "admin",\n  "active": true\n}`;
const SB = `{\n  "name": "Alice",\n  "age": 31,\n  "email": "alice@newdomain.com",\n  "role": "superadmin",\n  "active": true,\n  "lastLogin": "2024-06-01"\n}`;

const LS_LEFT   = 'jfo-input-diff-left';
const LS_RIGHT  = 'jfo-input-diff-right';
const LS_DIFFS  = 'jfo-diffs';

const C = {
  added:   { bg: 'rgba(74,222,128,0.05)',  border: 'rgba(74,222,128,0.2)',  text: '#4ade80' },
  removed: { bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.2)', text: '#f87171' },
  changed: { bg: 'rgba(251,191,36,0.05)',  border: 'rgba(251,191,36,0.2)',  text: '#fbbf24' },
};

export default function JsonDiff() {
  const { tr } = useLang();
  const [left, setLeft] = useState(() => {
    if (typeof window === 'undefined') return SA;
    const stored = localStorage.getItem(LS_LEFT);
    return stored !== null ? stored : SA;
  });
  const [right, setRight] = useState(() => {
    if (typeof window === 'undefined') return SB;
    const stored = localStorage.getItem(LS_RIGHT);
    return stored !== null ? stored : SB;
  });
  const [diffs, setDiffs] = useState<DiffEntry[] | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LS_DIFFS);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  });
  const [error, setError] = useState('');

  useEffect(() => { localStorage.setItem(LS_LEFT, left); }, [left]);
  useEffect(() => { localStorage.setItem(LS_RIGHT, right); }, [right]);
  useEffect(() => { if (diffs !== null) localStorage.setItem(LS_DIFFS, JSON.stringify(diffs)); else localStorage.removeItem(LS_DIFFS); }, [diffs]);

  const doCompare = () => {
    if (left.length > 5_000_000 || right.length > 5_000_000) { setError(tr('inputTooLarge')); setDiffs(null); return; }
    try { setDiffs(diffObjects(JSON.parse(left), JSON.parse(right))); setError(''); }
    catch (e: unknown) { setError((e as Error).message); setDiffs(null); }
  };

  const added   = diffs?.filter(d => d.type === 'added').length ?? 0;
  const removed = diffs?.filter(d => d.type === 'removed').length ?? 0;
  const changed = diffs?.filter(d => d.type === 'changed').length ?? 0;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--jfo-editor)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2"
        style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>

        <button onClick={doCompare} className="tb-btn-primary">{tr('compare')}</button>
        <button onClick={() => { setLeft(''); setRight(''); setDiffs(null); setError(''); localStorage.removeItem(LS_LEFT); localStorage.removeItem(LS_RIGHT); localStorage.removeItem(LS_DIFFS); }} className="tb-btn-ghost">{tr('clear')}</button>

        {diffs !== null && (
          <div className="ml-auto flex items-center gap-1.5">
            {added > 0   && <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(74,222,128,0.1)',  color: '#4ade80' }}>+{added} {tr('diffAdded')}</span>}
            {removed > 0 && <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>-{removed} {tr('diffRemoved')}</span>}
            {changed > 0 && <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(251,191,36,0.1)',  color: '#fbbf24' }}>~{changed} {tr('diffChanged')}</span>}
            {added + removed + changed === 0 && (
              <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' }}>{tr('identical')}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs"
          style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span><span>{error}</span>
        </div>
      )}

      {/* Two inputs */}
      <div className="editor-split grid grid-cols-1 border-b md:grid-cols-2" style={{ height: '45vh', borderColor: 'var(--jfo-border)' }}>
        <div className="editor-panel flex flex-col overflow-hidden border-r" style={{ borderColor: 'var(--jfo-border)' }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>
              {tr('original')} <span style={{ color: '#f87171' }}>(A)</span>
            </span>
          </div>
          <textarea value={left} onChange={e => { setLeft(e.target.value); setDiffs(null); }}
            placeholder={tr('pasteOriginal')} className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text' }}
            spellCheck={false} />
        </div>
        <div className="editor-panel flex flex-col overflow-hidden">
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>
              {tr('modified')} <span style={{ color: '#4ade80' }}>(B)</span>
            </span>
          </div>
          <textarea value={right} onChange={e => { setRight(e.target.value); setDiffs(null); }}
            placeholder={tr('pasteModified')} className="flex-1 resize-none p-4 text-[13px] outline-none"
            style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text' }}
            spellCheck={false} />
        </div>
      </div>

      {/* Diff results */}
      <div className="flex-1 overflow-auto">
        <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
          <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{tr('diffResults')}</span>
        </div>
        {!diffs && !error && (
          <div className="flex items-center justify-center py-12 text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>{tr('clickCompare')}</div>
        )}
        {diffs?.length === 0 && (
          <div className="flex items-center justify-center py-12 text-xs" style={{ ...MONO, color: 'var(--jfo-accent)' }}>✓ {tr('identical')}</div>
        )}
        {diffs && diffs.length > 0 && (
          <div className="space-y-1.5 p-4">
            {diffs.map((d, i) => (
              <div key={i} className="rounded-md border px-3 py-2" style={{ background: C[d.type].bg, borderColor: C[d.type].border }}>
                <div className="flex items-center justify-between gap-2">
                  <code style={{ ...MONO, fontSize: '12px', color: 'var(--jfo-text-1)' }}>{d.path}</code>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: C[d.type].text }}>{d.type}</span>
                </div>
                {d.type === 'changed' && (
                  <div className="mt-1 space-y-0.5">
                    <div style={{ ...MONO, fontSize: '11px', color: '#f87171' }}>− {JSON.stringify(d.oldVal)}</div>
                    <div style={{ ...MONO, fontSize: '11px', color: '#4ade80' }}>+ {JSON.stringify(d.newVal)}</div>
                  </div>
                )}
                {d.type === 'added'   && <div style={{ ...MONO, fontSize: '11px', color: '#4ade80', marginTop: '4px' }}>+ {JSON.stringify(d.newVal)}</div>}
                {d.type === 'removed' && <div style={{ ...MONO, fontSize: '11px', color: '#f87171', marginTop: '4px' }}>− {JSON.stringify(d.oldVal)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
