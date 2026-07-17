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

// ─── Leaf value renderer ──────────────────────────────────────────────────────
const LeafValue = memo(({ value, colors }: { value: JsonValue; colors: ReturnType<typeof useColors> }) => {
  if (value === null)           return <span style={{ color: colors.null_ }}>null</span>;
  if (typeof value === 'boolean') return <span style={{ color: colors.bool }}>{String(value)}</span>;
  if (typeof value === 'number')  return <span style={{ color: colors.num }}>{value}</span>;
  if (typeof value === 'string')  return <span style={{ color: colors.str }}>"{value}"</span>;
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
}

const JsonNode = memo(function JsonNode({ keyName, value, depth, isLight, isLast, colors }: NodeProps) {
  const collapsible = isCollapsible(value);
  const defaultOpen = depth < AUTO_COLLAPSE_DEPTH && (collapsible ? childCount(value) > 0 : true);
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen(o => !o), []);

  const bracket = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  const indent = depth * 18; // px per level

  // ── Collapsed inline preview ──────────────────────────────────────────────
  if (collapsible && !open) {
    const count = childCount(value);
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent }}>
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
          <span style={{ color: colors.key, marginRight: 2 }}>"{keyName}"<span style={{ color: colors.brace }}>:</span> </span>
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
  if (collapsible && open) {
    const entries: [string | number, JsonValue][] = Array.isArray(value)
      ? value.map((v, i) => [i, v])
      : Object.entries(value);

    return (
      <div>
        {/* opening brace line */}
        <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent }}>
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
            <span style={{ color: colors.key, marginRight: 2 }}>"{keyName}"<span style={{ color: colors.brace }}>:</span> </span>
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
    <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent + 18 }}>
      {keyName !== undefined && (
        <span style={{ color: colors.key, marginRight: 2, flexShrink: 0 }}>
          "{keyName}"<span style={{ color: colors.brace }}>:</span>{' '}
        </span>
      )}
      <LeafValue value={value} colors={colors} />
      {!isLast && <span style={{ color: colors.brace }}>,</span>}
    </div>
  );
});

// ─── Public export ────────────────────────────────────────────────────────────
interface JsonTreeProps {
  data: JsonValue;
  isLight: boolean;
}

export function JsonTree({ data, isLight }: JsonTreeProps) {
  const colors = useColors(isLight);
  return (
    <JsonNode
      value={data}
      depth={0}
      isLight={isLight}
      isLast={true}
      colors={colors}
    />
  );
}
