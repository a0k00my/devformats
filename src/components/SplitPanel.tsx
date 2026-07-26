import { useState, useRef, useCallback, useEffect } from 'react';

/** Toggles a tool's edit area between inline and a fixed full-viewport overlay. */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);
  return { isFullscreen, toggleFullscreen };
}

/** Icon button that toggles fullscreen — drop into any tool's toolbar. */
export function FullscreenButton({ isFullscreen, onToggle }: { isFullscreen: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="tb-btn-ghost ml-auto shrink-0 inline-flex items-center whitespace-nowrap"
      style={{ gap: 4 }}
      title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
    >
      {isFullscreen ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
      )}
      <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
    </button>
  );
}

/** Style object for a tool's outer container div, given the fullscreen state. */
export function toolContainerStyle(isFullscreen: boolean, heightExpr = 'clamp(480px, calc(100vh - 200px), 1100px)'): React.CSSProperties {
  if (isFullscreen) {
    return { position: 'fixed', inset: 0, zIndex: 100, height: '100vh', background: 'var(--jfo-bg)' };
  }
  return { height: heightExpr };
}

/** Cmd/Ctrl+Enter = run, Esc = clear focus — shared across every tool page. */
export function useToolShortcuts(run: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      } else if (e.key === 'Escape' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [run]);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(query.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return isMobile;
}

/**
 * Shared draggable splitter hook used across all two-panel tool components.
 * @param lsKey  - localStorage key to persist the split position
 * @param defaultPct - default split % (15–85 clamped)
 */
export function useSplitter(lsKey: string, defaultPct = 50) {
  const saved = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(lsKey) ?? '') : NaN;
  const [splitPct, setSplitPct] = useState(isNaN(saved) ? defaultPct : saved);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.min(85, Math.max(15, ((ev.clientX - rect.left) / rect.width) * 100));
      setSplitPct(pct);
      localStorage.setItem(lsKey, String(pct));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [lsKey]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = ev.touches[0];
      const pct = Math.min(85, Math.max(15, ((touch.clientX - rect.left) / rect.width) * 100));
      setSplitPct(pct);
      localStorage.setItem(lsKey, String(pct));
    };
    const onEnd = () => {
      dragging.current = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }, [lsKey]);

  return { splitPct, containerRef, onMouseDown, onTouchStart };
}

/** Renders the draggable divider bar — drop it between two panels. */
export function SplitDivider({
  onMouseDown,
  onTouchStart,
  isMobile,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  isMobile: boolean;
}) {
  if (isMobile) {
    return <div className="h-px w-full shrink-0" style={{ background: 'var(--jfo-border)' }} />;
  }
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      title="Drag to resize"
      style={{
        width: 5,
        flexShrink: 0,
        cursor: 'col-resize',
        background: 'var(--jfo-border)',
        position: 'relative',
        transition: 'background 0.15s',
        zIndex: 10,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--jfo-accent)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--jfo-border)')}
    >
      {/* Grip dots */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', gap: 3,
        pointerEvents: 'none',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--jfo-text-4)', opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );
}
