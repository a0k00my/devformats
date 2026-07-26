import { useState, useCallback, useRef, useEffect } from 'react';
import { useToolShortcuts } from './SplitPanel';
import { LineNumberedTextarea } from './LineNumberedTextarea';
import { describeJsonError } from '../lib/jsonError';
import { inferType, toZod, toJavaPojo, toRustStruct, toKotlinDataClass, toCSharpClass, toPydantic } from '../lib/jsonTypeGen';

const SAMPLE = `{
  "name": "DevFormats",
  "version": "2.0",
  "free": true,
  "price": null,
  "tags": ["json", "yaml"],
  "author": { "type": "web-tool", "clientSide": true }
}`;

const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export type TargetLang = 'zod' | 'java' | 'rust' | 'kotlin' | 'csharp' | 'pydantic';

const TARGETS: Record<TargetLang, { label: string; ext: string; mime: string; generate: (json: string, rootName: string) => string }> = {
  zod: { label: 'Zod Schema', ext: 'ts', mime: 'text/typescript', generate: (json, root) => toZod(inferType(JSON.parse(json), root)) },
  java: { label: 'Java POJO', ext: 'java', mime: 'text/x-java-source', generate: (json, root) => toJavaPojo(inferType(JSON.parse(json), root)) },
  rust: { label: 'Rust Struct', ext: 'rs', mime: 'text/x-rust', generate: (json, root) => toRustStruct(inferType(JSON.parse(json), root)) },
  kotlin: { label: 'Kotlin Data Class', ext: 'kt', mime: 'text/x-kotlin', generate: (json, root) => toKotlinDataClass(inferType(JSON.parse(json), root)) },
  csharp: { label: 'C# Class', ext: 'cs', mime: 'text/x-csharp', generate: (json, root) => toCSharpClass(inferType(JSON.parse(json), root)) },
  pydantic: { label: 'Pydantic Model', ext: 'py', mime: 'text/x-python', generate: (json, root) => toPydantic(inferType(JSON.parse(json), root)) },
};

export default function JsonTypeGenerator({ lang }: { lang: TargetLang }) {
  const target = TARGETS[lang];
  const lsInput = `df-input-json-to-${lang}`;

  const [input, setInput] = useState(() => (typeof window === 'undefined' ? SAMPLE : localStorage.getItem(lsInput) ?? SAMPLE));
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [rootName, setRootName] = useState('Root');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(lsInput, input); }, [input, lsInput]);

  const doGenerate = useCallback(() => {
    if (!input.trim()) { setOutput(''); setError(''); setErrorLine(null); return; }
    try {
      setOutput(target.generate(input, rootName || 'Root'));
      setError(''); setErrorLine(null);
    } catch (e: unknown) {
      const described = describeJsonError(input, e as Error);
      setError(described.message); setErrorLine(described.line); setOutput('');
    }
  }, [input, rootName, target]);

  useToolShortcuts(doGenerate);
  useEffect(() => { if (input) doGenerate(); }, [rootName]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async () => { if (!output) return; await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const doDownload = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: target.mime }));
    Object.assign(document.createElement('a'), { href: url, download: `${rootName || 'types'}.${target.ext}` }).click();
    URL.revokeObjectURL(url);
  };
  const doLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setInput(ev.target?.result as string); setOutput(''); setError(''); setErrorLine(null); };
    r.readAsText(file); e.target.value = '';
  };
  const doSampleData = () => setInput(SAMPLE);
  const doClear = () => { setInput(''); setOutput(''); setError(''); setErrorLine(null); localStorage.removeItem(lsInput); };

  return (
    <div className="tool-height flex flex-col border-y" style={{ height: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <input value={rootName} onChange={e => setRootName(e.target.value)} placeholder="Root" className="w-24 rounded border px-2 py-1 text-xs outline-none" style={{ ...MONO, background: 'var(--jfo-editor)', borderColor: 'var(--jfo-border)', color: 'var(--jfo-code)' }} />
        <div className="h-3.5 w-px" style={{ background: 'var(--jfo-border)' }} />
        <button onClick={doGenerate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">⚡ Generate</button>
        <button onClick={doCopy} className={`tb-btn${copied ? ' tb-copy-pop' : ''}`} style={copied ? { background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' } : {}}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={doDownload} className="tb-btn-ghost">↓ Download</button>
        <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost">↑ Load File</button>
        <input ref={fileRef} type="file" accept=".json,text/plain" className="hidden" onChange={doLoadFile} />
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
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Input</span>
          </div>
          <LineNumberedTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your JSON here…"
            errorLine={errorLine}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-col overflow-hidden border-t md:w-1/2 md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="flex items-center justify-between border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>{target.label} Output</span>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--jfo-editor)' }}>
            {output ? (
              <pre style={{ ...MONO, lineHeight: '1.65', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--jfo-code)' }}>{output}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>
                {error ? '← fix the error' : `${target.label} output appears here`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
