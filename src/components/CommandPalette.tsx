import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { tools, type Tool } from '../data/tools';

function matches(tool: Tool, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const haystack = [tool.name, tool.category, ...tool.keywords].join(' ').toLowerCase();
  return q.split(/\s+/).every(term => haystack.includes(term));
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const filtered = tools.filter(t => matches(t, query));
    return filtered.slice(0, 8);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (e.key === '/' && !isTyping && !open) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const tool = results[activeIndex];
        if (tool && tool.status === 'live') {
          window.location.href = `/${tool.slug}`;
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, results, activeIndex, close]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 items-center gap-2 rounded px-2.5 text-xs transition-colors"
        style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--fg-subtle)' }}
        aria-label="Search developer tools"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden sm:inline">Search tools…</span>
        <kbd className="hidden rounded border px-1 font-mono text-[10px] sm:inline" style={{ borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}>⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={close}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-4" style={{ borderColor: 'var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search developer tools..."
                className="w-full bg-transparent py-3 text-sm outline-none"
                style={{ color: 'var(--fg)' }}
                aria-label="Search developer tools"
              />
              <kbd className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}>Esc</kbd>
            </div>
            <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-xs" style={{ color: 'var(--fg-subtle)' }}>No tools match "{query}"</li>
              )}
              {results.map((tool, i) => (
                <li key={tool.slug} role="option" aria-selected={i === activeIndex}>
                  <a
                    href={tool.status === 'live' ? `/${tool.slug}` : '#'}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm"
                    style={{
                      background: i === activeIndex ? 'var(--accent-bg)' : 'transparent',
                      color: i === activeIndex ? 'var(--accent)' : 'var(--fg)',
                      pointerEvents: tool.status === 'live' ? 'auto' : 'none',
                      opacity: tool.status === 'live' ? 1 : 0.5,
                    }}
                  >
                    <span className="font-medium">{tool.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{tool.category}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
