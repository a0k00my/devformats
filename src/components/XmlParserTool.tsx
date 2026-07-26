import { useState, useCallback, useRef, useEffect } from 'react';
import { useSplitter, SplitDivider, useIsMobile } from './SplitPanel';
import { JsonTree } from './JsonTree';
import { LineNumberedTextarea } from './LineNumberedTextarea';

function extractXmlErrorLine(message: string): number | null {
  const m = message.match(/line[:\s]+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

const SAMPLE = `<root>
  <name>DevFormats</name>
  <tools>
    <tool id="1">json-formatter</tool>
    <tool id="2">yaml-formatter</tool>
  </tools>
</root>`;

const LS_INPUT = 'df-input-xml-parser';
const LS_SPLIT = 'df-split-xml-parser';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

function elementToObject(el: Element): unknown {
  const attrs: Record<string, string> = {};
  Array.from(el.attributes).forEach(a => { attrs[`@${a.name}`] = a.value; });
  const childElements = Array.from(el.children);
  const textContent = Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim())
    .filter(Boolean)
    .join(' ');

  if (childElements.length === 0) {
    if (Object.keys(attrs).length === 0) return textContent || '';
    return { ...attrs, ...(textContent ? { '#text': textContent } : {}) };
  }
  const grouped: Record<string, unknown[]> = {};
  childElements.forEach(child => { (grouped[child.tagName] ??= []).push(elementToObject(child)); });
  const result: Record<string, unknown> = { ...attrs };
  Object.entries(grouped).forEach(([tag, values]) => { result[tag] = values.length === 1 ? values[0] : values; });
  return result;
}

export default function XmlParserTool() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [isLight, setIsLight] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    window.addEventListener('jfo-theme-change', check);
    return () => window.removeEventListener('jfo-theme-change', check);
  }, []);

  const doParse = useCallback((text: string) => {
    if (!text.trim()) { setParsed(null); setError(''); setErrorLine(null); return; }
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const message = parseError.textContent?.split('\n')[0] || 'Malformed XML';
      setError(message); setErrorLine(extractXmlErrorLine(message)); setParsed(null); return;
    }
    setParsed({ [doc.documentElement.tagName]: elementToObject(doc.documentElement) });
    setError(''); setErrorLine(null);
  }, []);

  useEffect(() => { doParse(input); }, [input, doParse]);

  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => setInput(ev.target?.result as string);
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setParsed(null); setError(''); setErrorLine(null); localStorage.removeItem(LS_INPUT); };

  const isMobile = useIsMobile();
  const { splitPct, containerRef, onMouseDown, onTouchStart } = useSplitter(LS_SPLIT, 50);

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'clamp(480px, calc(100vh - 200px), 1100px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={doLoadFile} />
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>XML Input</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your XML here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <SplitDivider onMouseDown={onMouseDown} onTouchStart={onTouchStart} isMobile={isMobile} />

        <div className="flex flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ flex: 1, borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Parsed Structure</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {parsed !== null && !error ? (
              <div style={{ ...MONO, fontSize: '13px', lineHeight: '1.9', color: 'var(--jfo-code)' }}>
                <JsonTree data={parsed as any} isLight={isLight} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>paste XML to inspect its structure</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
