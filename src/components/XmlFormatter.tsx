import { useState, useCallback, useRef, useEffect } from 'react';
import { useSplitter, SplitDivider, useIsMobile, useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';

// Browser DOMParser error text isn't standardized, but both Chromium and
// Firefox mention "line N" somewhere in the message — pull it out if present.
function extractXmlErrorLine(message: string): number | null {
  const m = message.match(/line[:\s]+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns:dev="https://devformats.com">
  <!-- core metadata -->
  <name>DevFormats</name>
  <dev:features>
    <feature enabled="true">format</feature>
    <feature enabled="true">validate</feature>
  </dev:features>
  <description><![CDATA[Fast & private <tools>]]></description>
</project>`;

const LS_INPUT = 'df-input-xml-formatter';
const LS_INDENT = 'df-indent-xml-formatter';
const LS_SPLIT = 'df-split-xml-formatter';

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

/** Pretty-prints an XML DOM node, preserving comments, CDATA, and namespaced attributes. */
function printNode(node: Node, indent: string, depth: number, lines: string[]) {
  const pad = indent.repeat(depth);
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
    const openTag = attrs ? `<${el.tagName} ${attrs}>` : `<${el.tagName}>`;
    const children = Array.from(el.childNodes).filter(n => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()));

    if (children.length === 0) {
      lines.push(`${pad}${attrs ? `<${el.tagName} ${attrs}/>` : `<${el.tagName}/>`}`);
      return;
    }
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      lines.push(`${pad}${openTag}${children[0].textContent?.trim()}</${el.tagName}>`);
      return;
    }
    lines.push(`${pad}${openTag}`);
    children.forEach(child => printNode(child, indent, depth + 1, lines));
    lines.push(`${pad}</${el.tagName}>`);
  } else if (node.nodeType === Node.COMMENT_NODE) {
    lines.push(`${pad}<!--${node.textContent}-->`);
  } else if (node.nodeType === Node.CDATA_SECTION_NODE) {
    lines.push(`${pad}<![CDATA[${node.textContent}]]>`);
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    lines.push(`${pad}${node.textContent.trim()}`);
  }
}

function prettyPrintXml(xmlText: string, indentSize: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error(parseError.textContent?.split('\n')[0] || 'Malformed XML');

  const indent = ' '.repeat(indentSize);
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  Array.from(doc.childNodes).forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.COMMENT_NODE) {
      printNode(node, indent, 0, lines);
    }
  });
  return lines.join('\n');
}

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function XmlFormatter() {
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return SAMPLE;
    return localStorage.getItem(LS_INPUT) ?? SAMPLE;
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [indentSize, setIndentSize] = useState(() => (typeof window === 'undefined' ? 2 : parseInt(localStorage.getItem(LS_INDENT) || '2', 10)));
  const [stats, setStats] = useState<{ lines: number; size: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => { localStorage.setItem(LS_INDENT, String(indentSize)); }, [indentSize]);

  const doFormat = useCallback((text: string, size: number) => {
    if (!text.trim()) { setOutput(''); setError(''); setErrorLine(null); setStats(null); return; }
    try {
      const formatted = prettyPrintXml(text, size);
      setOutput(formatted);
      setError(''); setErrorLine(null);
      setStats({ lines: formatted.split('\n').length, size: formatBytes(new TextEncoder().encode(formatted).length) });
      setDirty(false);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setError(msg);
      setErrorLine(extractXmlErrorLine(msg));
      setOutput(''); setStats(null);
    }
  }, []);

  const handleFormat = () => doFormat(input, indentSize);
  useToolShortcuts(handleFormat);

  const handleIndentChange = (size: number) => {
    setIndentSize(size);
    if (output && !dirty) doFormat(input, size);
  };

  const doMinify = () => {
    if (!input.trim()) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Malformed XML');
      const serialized = new XMLSerializer().serializeToString(doc).replace(/>\s+</g, '><').trim();
      setOutput(serialized);
      setError(''); setErrorLine(null);
      setStats({ lines: 1, size: formatBytes(new TextEncoder().encode(serialized).length) });
      setDirty(false);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setError(msg);
      setErrorLine(extractXmlErrorLine(msg));
    }
  };

  const doCopy = async () => {
    const text = output || input;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const doDownload = () => {
    const text = output || input;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'application/xml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'formatted.xml' }).click();
    URL.revokeObjectURL(url);
  };

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setStats(null); setError(''); setErrorLine(null); setDirty(true); };
    r.readAsText(file); e.target.value = '';
  };

  const doSampleData = () => { setInput(SAMPLE); setDirty(true); };

  const doClear = () => {
    setInput(''); setOutput(''); setError(''); setErrorLine(null); setStats(null); setDirty(false);
    localStorage.removeItem(LS_INPUT);
  };

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <div className="flex items-center rounded border p-0.5" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
          {[2, 4].map(size => (
            <button key={size} onClick={() => handleIndentChange(size)} className="rounded px-2 py-0.5 text-[11px] font-medium transition-all"
              style={{ cursor: 'pointer', ...(indentSize === size ? { background: 'var(--jfo-accent-bg)', color: 'var(--jfo-accent)' } : { color: 'var(--jfo-text-3)' }) }}>
              {size}sp
            </button>
          ))}
        </div>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={handleFormat} className="tb-btn-primary relative" title="Cmd/Ctrl+Enter">
          ⚡ Format
          {dirty && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" />}
        </button>
        <button onClick={doMinify} className="tb-btn">Minify</button>
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doCopy} className="tb-btn" style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={doLoadFile} />
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
        {stats && (
          <div className="ml-auto flex items-center gap-2" style={{ ...MONO, color: 'var(--jfo-text-4)', fontSize: '11px' }}>
            <span>{stats.lines} lines</span><span style={{ color: 'var(--jfo-border)' }}>·</span><span>{stats.size}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
          <span style={{ color: '#ee0000' }}>✗</span>
          <span className="font-medium" style={{ color: 'var(--jfo-text-3)' }}>XML Error:</span>
          <span>{error}</span>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex flex-col overflow-hidden" style={{ width: isMobile ? '100%' : `${splitPct}%`, height: isMobile ? '50%' : 'auto', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Input</span>
            <span style={{ ...MONO, fontSize: '10px', color: 'var(--jfo-text-4)' }}>{input.length} chars</span>
          </div>
          <LineNumberedTextarea
            value={input}
            onChange={e => { setInput(e.target.value); setDirty(true); }}
            placeholder="Paste your XML here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off"
          />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Output</span>
            {!error && output && <span style={{ fontSize: '10px', color: 'var(--jfo-accent)', ...MONO }}>✓ valid</span>}
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : 'paste XML and click Format'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
