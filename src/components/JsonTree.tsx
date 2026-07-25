import { useState, useCallback, memo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
interface JsonObject { [key: string]: JsonValue; }

// ─── Config ───────────────────────────────────────────────────────────────────
// Nodes deeper than this are collapsed by default
const AUTO_COLLAPSE_DEPTH = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isCollapsible(v: JsonValue): v is JsonValue[] | JsonObject {
  return v !== null && typeof v === 'object';
}
function childCount(v: JsonValue[] | JsonObject): number {
  return Array.isArray(v) ? v.length : Object.keys(v).length;
}
function previewOf(v: JsonValue[] | JsonObject): string {
  if (Array.isArray(v)) return `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
  const keys = Object.keys(v);
  if (keys.length === 0) return '{ }';
  const preview = keys.slice(0, 3).join(', ');
  return `{ ${preview}${keys.length > 3 ? ', …' : ''} }`;
}

/** Matches JSON.stringify's own key-quoting decision: bare dot-path when the
 *  key is a valid identifier, bracket notation otherwise. */
function pathSegment(key: string | number): string {
  if (typeof key === 'number') return `[${key}]`;
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}

// ─── Token colours ────────────────────────────────────────────────────────────
function useColors(isLight: boolean) {
  return {
    key:    isLight ? '#0550ae' : '#93c5fd',
    str:    isLight ? '#0a3069' : '#7dd3fc',
    num:    isLight ? '#953800' : '#c084fc',
    bool:   isLight ? '#0070f3' : '#50e3c2',
    null_:  isLight ? '#888'    : '#6b7280',
    brace:  isLight ? '#374151' : '#d1d5db',
    arrow:  isLight ? '#9ca3af' : '#6b7280',
    idx:    isLight ? '#9ca3af' : '#6b7280',
    preview:isLight ? '#6b7280' : '#6b7280',
  };
}

function matchesSearch(keyName: string | undefined, value: JsonValue, term: string): boolean {
  if (!term) return false;
  const t = term.toLowerCase();
  if (keyName?.toLowerCase().includes(t)) return true;
  if (!isCollapsible(value)) return String(value).toLowerCase().includes(t);
  return false;
}

/** Recursively checks whether a search term matches any key or value inside a
 *  subtree, so collapsed branches can be auto-expanded to reveal the match. */
function subtreeHasMatch(value: JsonValue, term: string): boolean {
  if (!term) return false;
  const t = term.toLowerCase();
  if (!isCollapsible(value)) return String(value).toLowerCase().includes(t);
  if (Array.isArray(value)) return value.some(v => subtreeHasMatch(v, term));
  return Object.entries(value).some(([k, v]) => k.toLowerCase().includes(t) || subtreeHasMatch(v, term));
}

/** Wraps matching substrings in a <mark>-like highlight span. */
function Highlight({ text, term, color }: { text: string; term?: string; color: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: 'var(--accent-bg, rgba(80,227,194,0.25))', color, borderRadius: 2 }}>{text.slice(idx, idx + term.length)}</span>
      {text.slice(idx + term.length)}
    </>
  );
}

// ─── Leaf value renderer ──────────────────────────────────────────────────────
const LeafValue = memo(({ value, colors, searchTerm }: { value: JsonValue; colors: ReturnType<typeof useColors>; searchTerm?: string }) => {
  if (value === null)           return <span style={{ color: colors.null_ }}>null</span>;
  if (typeof value === 'boolean') return <span style={{ color: colors.bool }}>{String(value)}</span>;
  if (typeof value === 'number')  return <span style={{ color: colors.num }}><Highlight text={String(value)} term={searchTerm} color={colors.num} /></span>;
  if (typeof value === 'string')  return <span style={{ color: colors.str }}>"<Highlight text={value} term={searchTerm} color={colors.str} />"</span>;
  return null;
});
LeafValue.displayName = 'LeafValue';

// ─── Main node ────────────────────────────────────────────────────────────────
interface NodeProps {
  keyName?: string;
  value: JsonValue;
  depth: number;
  isLight: boolean;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  path?: string;
  searchTerm?: string;
  onCopyPath?: (path: string) => void;
}

const JsonNode = memo(function JsonNode({ keyName, value, depth, isLight, isLast, colors, path = '$', searchTerm, onCopyPath }: NodeProps) {
  const collapsible = isCollapsible(value);
  const defaultOpen = depth < AUTO_COLLAPSE_DEPTH && (collapsible ? childCount(value) > 0 : true);
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const copyPath = useCallback((e: React.MouseEvent) => {
    if (!onCopyPath) return;
    e.stopPropagation();
    onCopyPath(path);
  }, [onCopyPath, path]);

  const bracket = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  const indent = depth * 18; // px per level
  const isMatch = matchesSearch(keyName, value, searchTerm ?? '');
  // A collapsed branch containing a match must render expanded so the match
  // is actually visible — searching should never hide results behind a fold.
  const forceOpenForSearch = collapsible && !!searchTerm && subtreeHasMatch(value, searchTerm);
  const effectiveOpen = open || forceOpenForSearch;

  // ── Collapsed inline preview ──────────────────────────────────────────────
  if (collapsible && !effectiveOpen) {
    const count = childCount(value);
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent, background: isMatch ? 'var(--jfo-accent-bg)' : undefined }}>
        {/* toggle arrow */}
        <button
          onClick={toggle}
          aria-label="Expand"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            marginRight: 4, fontSize: 11, color: colors.arrow, lineHeight: 1,
            userSelect: 'none', flexShrink: 0,
          }}
        >▶</button>
        {/* key */}
        {keyName !== undefined && (
          <span onClick={copyPath} title={onCopyPath ? `Copy path: ${path}` : undefined} style={{ color: colors.key, marginRight: 2, cursor: onCopyPath ? 'copy' : undefined }}>"<Highlight text={keyName} term={searchTerm} color={colors.key} />"<span style={{ color: colors.brace }}>:</span> </span>
        )}
        {/* collapsed summary */}
        <span
          onClick={toggle}
          style={{ cursor: 'pointer', color: colors.brace }}
        >
          {bracket[0]}
        </span>
        <span
          onClick={toggle}
          style={{
            cursor: 'pointer', color: colors.preview, fontSize: 11,
            margin: '0 4px', userSelect: 'none',
          }}
        >
          {count === 0 ? '' : `${count} item${count !== 1 ? 's' : ''}`}
        </span>
        <span onClick={toggle} style={{ cursor: 'pointer', color: colors.brace }}>{bracket[1]}</span>
        {!isLast && <span style={{ color: colors.brace }}>,</span>}
      </div>
    );
  }

  // ── Expanded object/array ─────────────────────────────────────────────────
  if (collapsible && effectiveOpen) {
    const entries: [string | number, JsonValue][] = Array.isArray(value)
      ? value.map((v, i) => [i, v])
      : Object.entries(value);

    return (
      <div>
        {/* opening brace line */}
        <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent, background: isMatch ? 'var(--jfo-accent-bg)' : undefined }}>
          <button
            onClick={toggle}
            aria-label="Collapse"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              marginRight: 4, fontSize: 11, color: colors.arrow, lineHeight: 1,
              userSelect: 'none', flexShrink: 0,
            }}
          >▼</button>
          {keyName !== undefined && (
            <span onClick={copyPath} title={onCopyPath ? `Copy path: ${path}` : undefined} style={{ color: colors.key, marginRight: 2, cursor: onCopyPath ? 'copy' : undefined }}>"<Highlight text={keyName} term={searchTerm} color={colors.key} />"<span style={{ color: colors.brace }}>:</span> </span>
          )}
          <span style={{ color: colors.brace }}>{bracket[0]}</span>
        </div>

        {/* children */}
        {entries.map(([k, v], i) => (
          <JsonNode
            key={String(k)}
            keyName={Array.isArray(value) ? undefined : String(k)}
            value={v}
            depth={depth + 1}
            isLight={isLight}
            isLast={i === entries.length - 1}
            colors={colors}
            path={`${path}${pathSegment(k)}`}
            searchTerm={searchTerm}
            onCopyPath={onCopyPath}
          />
        ))}

        {/* closing brace line */}
        <div style={{ paddingLeft: indent + 18 }}>
          <span style={{ color: colors.brace }}>{bracket[1]}</span>
          {!isLast && <span style={{ color: colors.brace }}>,</span>}
        </div>
      </div>
    );
  }

  // ── Leaf node ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent + 18, background: isMatch ? 'var(--jfo-accent-bg)' : undefined }}>
      {keyName !== undefined && (
        <span onClick={copyPath} title={onCopyPath ? `Copy path: ${path}` : undefined} style={{ color: colors.key, marginRight: 2, flexShrink: 0, cursor: onCopyPath ? 'copy' : undefined }}>
          "<Highlight text={keyName} term={searchTerm} color={colors.key} />"<span style={{ color: colors.brace }}>:</span>{' '}
        </span>
      )}
      <LeafValue value={value} colors={colors} searchTerm={searchTerm} />
      {!isLast && <span style={{ color: colors.brace }}>,</span>}
    </div>
  );
});

// ─── Public export ────────────────────────────────────────────────────────────
interface JsonTreeProps {
  data: JsonValue;
  isLight: boolean;
  searchTerm?: string;
  onCopyPath?: (path: string) => void;
}

export function JsonTree({ data, isLight, searchTerm, onCopyPath }: JsonTreeProps) {
  const colors = useColors(isLight);
  return (
    <JsonNode
      value={data}
      depth={0}
      isLight={isLight}
      isLast={true}
      colors={colors}
      searchTerm={searchTerm}
      onCopyPath={onCopyPath}
    />
  );
}
