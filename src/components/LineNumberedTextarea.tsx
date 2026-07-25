import { useRef, useEffect, useMemo } from 'react';

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

interface LineNumberedTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  spellCheck?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  /** 1-indexed line number to highlight (e.g. from a parse error) */
  errorLine?: number | null;
}

// Drop-in replacement for a plain <textarea> that adds a synced-scroll line-number
// gutter, so "error at line 12" in a message is actually easy to find in the editor.
export function LineNumberedTextarea({
  value, onChange, placeholder, className, style, spellCheck, autoComplete, autoCapitalize, errorLine,
}: LineNumberedTextareaProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = useMemo(() => (value ? value.split('\n').length : 1), [value]);

  const syncScroll = () => {
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  };

  useEffect(() => { syncScroll(); }, [value]);

  // Scroll the offending line into view whenever a new error appears.
  useEffect(() => {
    if (!errorLine || !taRef.current) return;
    const lineHeightPx = 13 * 1.65;
    const target = (errorLine - 1) * lineHeightPx;
    const visibleHeight = taRef.current.clientHeight;
    taRef.current.scrollTop = Math.max(0, target - visibleHeight / 2);
    syncScroll();
  }, [errorLine]);

  const gutterWidth = lineCount >= 1000 ? 52 : lineCount >= 100 ? 44 : 36;

  return (
    <div className={`flex overflow-hidden ${className ?? 'flex-1'}`} style={style}>
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden text-right"
        style={{
          ...MONO,
          fontSize: '13px',
          lineHeight: '1.65',
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 8,
          paddingRight: 8,
          color: 'var(--jfo-text-4)',
          background: 'var(--jfo-panel-hdr)',
          borderRight: '1px solid var(--jfo-border-2)',
          minWidth: gutterWidth,
          flexShrink: 0,
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={errorLine === i + 1 ? { color: '#ee0000', fontWeight: 700 } : undefined}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        placeholder={placeholder}
        className="flex-1 resize-none p-4 text-[13px] outline-none"
        style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', cursor: 'text' }}
        spellCheck={spellCheck}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
      />
    </div>
  );
}
