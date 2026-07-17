import { useState, useCallback, useEffect } from 'react';
import Ajv, { type ErrorObject } from 'ajv';
import { useToolShortcuts } from './SplitPanel';

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number", "minimum": 0 }
  },
  "required": ["name", "age"],
  "additionalProperties": false
}`;

const SAMPLE_DATA = `{
  "name": "Alice",
  "age": -5
}`;

const LS_SCHEMA = 'df-schema-json-schema-validator';
const LS_DATA = 'df-data-json-schema-validator';
const MONO = { fontFamily: "ui-monospace, 'Geist Mono', SFMono-Regular, Menlo, monospace" };

export default function JsonSchemaValidator() {
  const [schemaText, setSchemaText] = useState(() => (typeof window === 'undefined' ? SAMPLE_SCHEMA : localStorage.getItem(LS_SCHEMA) ?? SAMPLE_SCHEMA));
  const [dataText, setDataText] = useState(() => (typeof window === 'undefined' ? SAMPLE_DATA : localStorage.getItem(LS_DATA) ?? SAMPLE_DATA));
  const [errors, setErrors] = useState<ErrorObject[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => { localStorage.setItem(LS_SCHEMA, schemaText); }, [schemaText]);
  useEffect(() => { localStorage.setItem(LS_DATA, dataText); }, [dataText]);

  const doValidate = useCallback(() => {
    setParseError(''); setErrors(null); setValid(null);
    let schema: unknown, data: unknown;
    try { schema = JSON.parse(schemaText); } catch (e) { setParseError(`Schema: ${(e as Error).message}`); return; }
    try { data = JSON.parse(dataText); } catch (e) { setParseError(`Data: ${(e as Error).message}`); return; }
    try {
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validateFn = ajv.compile(schema as object);
      const ok = validateFn(data);
      setValid(ok);
      setErrors(ok ? [] : validateFn.errors ?? []);
    } catch (e) {
      setParseError(`Invalid schema: ${(e as Error).message}`);
    }
  }, [schemaText, dataText]);

  useToolShortcuts(doValidate);

  const doSampleData = () => { setSchemaText(SAMPLE_SCHEMA); setDataText(SAMPLE_DATA); };
  const doClear = () => { setSchemaText(''); setDataText(''); setErrors(null); setValid(null); setParseError(''); localStorage.removeItem(LS_SCHEMA); localStorage.removeItem(LS_DATA); };

  return (
    <div className="flex flex-col border-y" style={{ minHeight: 'min(70vh, 640px)', borderColor: 'var(--jfo-border)' }}>
      <div className="toolbar-scroll flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ background: 'var(--jfo-toolbar)', borderColor: 'var(--jfo-border)' }}>
        <button onClick={doValidate} className="tb-btn-primary" title="Cmd/Ctrl+Enter">✓ Validate</button>
        <button onClick={doSampleData} className="tb-btn-ghost">Sample Data</button>
        <button onClick={doClear} className="tb-btn-ghost">Clear</button>
      </div>

      <div className="flex flex-col md:flex-row" style={{ minHeight: 280 }}>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>JSON Schema</span>
          </div>
          <textarea value={schemaText} onChange={e => setSchemaText(e.target.value)} placeholder="Paste your JSON Schema here…"
            className="flex-1 resize-none p-4 text-[13px] outline-none" style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', minHeight: 240 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden border-t md:border-l md:border-t-0" style={{ borderColor: 'var(--jfo-border-2)', minWidth: 0 }}>
          <div className="border-b px-3 py-1" style={{ background: 'var(--jfo-panel-hdr)', borderColor: 'var(--jfo-border-2)' }}>
            <span style={{ ...MONO, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--jfo-text-3)' }}>Data</span>
          </div>
          <textarea value={dataText} onChange={e => setDataText(e.target.value)} placeholder="Paste the JSON data to validate…"
            className="flex-1 resize-none p-4 text-[13px] outline-none" style={{ ...MONO, lineHeight: '1.65', background: 'var(--jfo-editor)', color: 'var(--jfo-code)', minHeight: 240 }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--jfo-border)', background: 'var(--jfo-editor)' }}>
        {parseError && (
          <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>✗ {parseError}</div>
        )}
        {valid === true && (
          <div className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-accent-bg)', borderColor: 'var(--jfo-accent-border)', color: 'var(--jfo-accent)' }}>✓ Data is valid against the schema</div>
        )}
        {valid === false && errors && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold" style={{ color: 'var(--jfo-err-text)' }}>{errors.length} error{errors.length !== 1 ? 's' : ''} found</div>
            {errors.map((err, i) => (
              <div key={i} className="rounded border px-3 py-2 text-xs" style={{ ...MONO, background: 'var(--jfo-err-bg)', borderColor: 'var(--jfo-err-border)', color: 'var(--jfo-err-text)' }}>
                <span style={{ color: 'var(--jfo-accent)' }}>{err.instancePath || '/'}</span> {err.message}
              </div>
            ))}
          </div>
        )}
        {valid === null && !parseError && (
          <div className="text-xs" style={{ ...MONO, color: 'var(--jfo-placeholder)' }}>paste a schema and data, then click Validate</div>
        )}
      </div>
    </div>
  );
}
