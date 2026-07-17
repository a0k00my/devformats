import { useState, useCallback, useRef, useEffect } from 'react';
import { useToolShortcuts } from './SplitPanel';

const SAMPLE = `<root>
  <name>DevFormats</name>
  <tools>
    <tool id="1">json-formatter</tool>
    <tool id="2">yaml-formatter</tool>
  </tools>
</root>`;

const LS_INPUT = 'df-input-xml-to-json';
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
  childElements.forEach(child => {
    (grouped[child.tagName] ??= []).push(elementToObject(child));
  });

  const result: Record<string, unknown> = { ...attrs };
  Object.entries(grouped).forEach(([tag, values]) => {
    result[tag] = values.length === 1 ? values[0] : values;
  });
  return result;
}

function xmlToJson(xmlText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error(parseError.textContent?.split('\n')[0] || 'Malformed XML');
  const root = doc.documentElement;
  return JSON.stringify({ [root.tagName]: elementToObject(root) }, null, 2);
}

export default function XmlToJson() {
  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(LS_INPUT) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(LS_INPUT, input); }, [input]);

  const doConvert = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try { setOutput(xmlToJson(input)); setError(''); }
    catch (e: unknown) { setError((e as Error).message); setOutput(''); }
  }, [input]);

  useToolShortcuts(doConvert);

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'converted.json' }).click();
    URL.revokeObjectURL(url);
  };
  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setError(''); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); localStorage.removeItem(LS_INPUT); };

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doConvert} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Convert to JSON</button>
        <button onClick={doCopy} className="tb-btn" style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="flex flex-col overflow-hidden md:w-1/2" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>XML Input</span>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your XML here…"
            className="flex-1 resize-none p-4 text-[13px] outline-none" style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)' }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-col overflow-hidden border-t md:w-1/2 md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>JSON output appears here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
