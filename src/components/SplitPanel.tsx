import { useState, useRef, useCallback, useEffect } from 'react';

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
