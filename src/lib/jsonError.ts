// V8's JSON.parse errors include a raw string offset ("...at position 42")
// but no line/col — recover both by walking the original text up to that offset,
// so error messages can say "line 12" and editors can highlight that line.
export function describeJsonError(text: string, err: Error): { message: string; line: number | null } {
  const match = err.message.match(/position (\d+)/);
  if (!match) return { message: err.message, line: null };
  const pos = parseInt(match[1], 10);
  const upToError = text.slice(0, pos);
  const line = upToError.split('\n').length;
  const col = pos - upToError.lastIndexOf('\n');
  return { message: `${err.message} (line ${line}, col ${col})`, line };
}
