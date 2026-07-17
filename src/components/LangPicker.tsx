import { useState, useRef, useEffect } from 'react';
import { useLang } from '../hooks/useLang';
import { LANG_LABELS, LANG_NAMES, type Lang } from '../lib/i18n';

const LANGS = Object.keys(LANG_LABELS) as Lang[];

export default function LangPicker() {
  const { lang, changeLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors"
        style={{
          cursor: 'pointer',
          border: '1px solid var(--jfo-border)',
          background: 'var(--jfo-toolbar)',
          color: 'var(--jfo-text-3)',
          transition: 'color 120ms, border-color 120ms',
        }}
      >
        <span>{LANG_LABELS[lang]}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <path d="M4 5.5L1 2.5h6L4 5.5z"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 min-w-[120px] rounded-md border py-1 shadow-xl"
          style={{
            background: 'var(--jfo-bg-soft)',
            borderColor: 'var(--jfo-border)',
          }}
        >
          {LANGS.map(l => (
            <button
              key={l}
              onClick={() => { changeLang(l); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80"
              style={{
                cursor: 'pointer',
                background: l === lang ? 'var(--jfo-accent-bg)' : 'transparent',
                color: l === lang ? 'var(--jfo-accent)' : 'var(--jfo-text-2)',
              }}
            >
              <span className="w-6 font-mono text-[10px] font-semibold">{LANG_LABELS[l]}</span>
              <span>{LANG_NAMES[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
