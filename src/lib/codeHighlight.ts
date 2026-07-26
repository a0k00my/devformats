/**
 * Lightweight regex-based syntax highlighter shared across every tool's output panel.
 * Not a real tokenizer — good enough for readable colored output without a grammar per language.
 */

export type HlLang =
  | 'json' | 'yaml' | 'xml' | 'sql'
  | 'python' | 'clike' | 'shell' | 'plain';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Palette {
  comment: string; string: string; keyword: string; number: string;
  type: string; bool: string; tag: string; attr: string;
}

function palette(isLight: boolean): Palette {
  return isLight
    ? { comment: '#6e7781', string: '#0a3069', keyword: '#cf222e', number: '#0550ae', type: '#953800', bool: '#0070f3', tag: '#116329', attr: '#0550ae' }
    : { comment: '#8b949e', string: '#7dd3fc', keyword: '#ff7b72', number: '#c084fc', type: '#79c0ff', bool: '#50e3c2', tag: '#7ee787', attr: '#d2a8ff' };
}

function span(color: string, text: string, extra = ''): string {
  return `<span style="color:${color}${extra}">${text}</span>`;
}

const CLIKE_KEYWORDS = [
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'class', 'interface', 'extends', 'implements', 'new', 'this', 'super', 'import', 'export', 'from', 'default', 'as',
  'public', 'private', 'protected', 'static', 'readonly', 'abstract', 'async', 'await', 'try', 'catch', 'finally', 'throw',
  'void', 'null', 'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of', 'yield', 'delete', 'enum', 'namespace',
  'fn', 'let mut', 'mut', 'pub', 'struct', 'impl', 'trait', 'use', 'mod', 'match', 'loop', 'ref', 'dyn', 'crate', 'unsafe',
  'package', 'val', 'var', 'fun', 'object', 'companion', 'data', 'sealed', 'when', 'is', 'override', 'internal', 'open',
  'string', 'int', 'long', 'float', 'double', 'bool', 'boolean', 'char', 'byte', 'short', 'decimal', 'unit', 'any',
  'model', 'field', 'table', 'generator', 'datasource', 'define', 'sequelize', 'DataTypes',
];

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'INDEX',
  'AND', 'OR', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT',
  'VARCHAR', 'INTEGER', 'INT', 'SERIAL', 'BIGINT', 'BOOLEAN', 'TEXT', 'TIMESTAMP', 'DATE', 'DECIMAL', 'NUMERIC', 'JSONB', 'UUID',
  'CURRENT_TIMESTAMP', 'AUTO_INCREMENT', 'IF', 'EXISTS', 'CASCADE', 'true', 'false',
];

const PYTHON_KEYWORDS = [
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass', 'import', 'from', 'as',
  'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert', 'del', 'in', 'is',
  'not', 'and', 'or', 'True', 'False', 'None', 'self', 'async', 'await', 'field', 'BaseModel', 'Optional', 'List', 'Dict',
];

const SHELL_KEYWORDS = [
  'FROM', 'RUN', 'CMD', 'ENTRYPOINT', 'ENV', 'ARG', 'WORKDIR', 'COPY', 'ADD', 'EXPOSE', 'VOLUME', 'USER', 'LABEL', 'docker',
  'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'export', 'echo', 'kubectl', 'apiVersion', 'kind',
];

function highlightWithKeywords(code: string, keywords: string[], p: Palette, opts: {
  lineComment?: string; blockComment?: [string, string]; caseSensitive?: boolean; extraTypeRegex?: RegExp;
}): string {
  const escaped = esc(code);
  const kwPattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const parts: string[] = [];
  if (opts.blockComment) {
    const [s, e] = opts.blockComment;
    parts.push(`${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  }
  if (opts.lineComment) parts.push(`${opts.lineComment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*`);
  parts.push(`"(?:\\\\.|[^"\\\\])*"`);
  parts.push(`'(?:\\\\.|[^'\\\\])*'`);
  parts.push('`(?:\\\\.|[^`\\\\])*`');
  parts.push(`\\b(?:${kwPattern})\\b`);
  parts.push(`\\b\\d+(?:\\.\\d+)?\\b`);
  parts.push(`@\\w+`);
  parts.push(`\\b[A-Z][A-Za-z0-9_]*\\b`);
  const re = new RegExp(parts.join('|'), opts.caseSensitive === false ? 'gi' : 'g');

  return escaped.replace(re, (m) => {
    if (opts.blockComment && m.startsWith(opts.blockComment[0])) return span(p.comment, m, ';font-style:italic');
    if (opts.lineComment && m.startsWith(opts.lineComment)) return span(p.comment, m, ';font-style:italic');
    if (/^["'`]/.test(m)) return span(p.string, m);
    if (/^@/.test(m)) return span(p.type, m);
    if (/^\d/.test(m)) return span(p.number, m);
    if (/^[A-Z]/.test(m) && !keywords.some(k => k.toLowerCase() === m.toLowerCase())) return span(p.type, m);
    if (/^(true|false|True|False|null|None|nil|undefined)$/i.test(m)) return span(p.bool, m);
    return span(p.keyword, m, ';font-weight:500');
  });
}

function highlightJsonLike(code: string, p: Palette): string {
  const escaped = esc(code);
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      if (/^"/.test(m)) {
        if (/:$/.test(m)) return span(p.attr, m, ';font-weight:500');
        return span(p.string, m);
      }
      if (/true|false/.test(m)) return span(p.bool, m);
      if (/null/.test(m)) return span(p.comment, m);
      return span(p.number, m);
    }
  );
}

function highlightYaml(code: string, p: Palette): string {
  return code.split('\n').map(line => {
    const escaped = esc(line);
    const commentMatch = line.match(/^(\s*)(#.*)$/);
    if (commentMatch) return `${commentMatch[1]}${span(p.comment, esc(commentMatch[2]), ';font-style:italic')}`;
    const kv = line.match(/^(\s*(?:- )?)([A-Za-z0-9_.\-\/]+)(:)(\s*)(.*)$/);
    if (kv) {
      const [, indent, key, colon, gap, rest] = kv;
      let restHtml = esc(rest);
      const inlineComment = rest.match(/^(.*?)(\s#.*)$/);
      let tail = '';
      let valuePart = rest;
      if (inlineComment) { valuePart = inlineComment[1]; tail = span(p.comment, esc(inlineComment[2]), ';font-style:italic'); }
      if (/^["'].*["']$/.test(valuePart)) restHtml = span(p.string, esc(valuePart)) + tail;
      else if (/^(true|false|null|~)$/i.test(valuePart.trim())) restHtml = span(p.bool, esc(valuePart)) + tail;
      else if (/^-?\d+(\.\d+)?$/.test(valuePart.trim())) restHtml = span(p.number, esc(valuePart)) + tail;
      else restHtml = span(p.string, esc(valuePart)) + tail;
      return `${esc(indent)}${span(p.attr, esc(key), ';font-weight:500')}${colon}${gap}${valuePart ? restHtml : ''}`;
    }
    return escaped;
  }).join('\n');
}

function highlightXml(code: string, p: Palette): string {
  const escaped = esc(code);
  return escaped.replace(
    /(&lt;\/?[a-zA-Z][\w:.\-]*)|([a-zA-Z_:][\w:.\-]*)(=)(&quot;.*?&quot;|"[^"]*"|&#39;.*?&#39;)|(&gt;)|(\/?&gt;)/g,
    (m, tagOpen, attrName, eq, attrVal) => {
      if (tagOpen) return span(p.tag, tagOpen, ';font-weight:500');
      if (attrName && eq && attrVal) return `${span(p.attr, attrName)}${eq}${span(p.string, attrVal)}`;
      return m;
    }
  ).replace(/(&gt;)/g, span(p.tag, '&gt;', ';font-weight:500'));
}

export function highlightCode(code: string, lang: HlLang, isLight: boolean): string {
  if (!code) return '';
  const p = palette(isLight);
  switch (lang) {
    case 'json': return highlightJsonLike(code, p);
    case 'yaml': return highlightYaml(code, p);
    case 'xml': return highlightXml(code, p);
    case 'sql': return highlightWithKeywords(code, SQL_KEYWORDS, p, { lineComment: '--', blockComment: ['/*', '*/'], caseSensitive: false });
    case 'python': return highlightWithKeywords(code, PYTHON_KEYWORDS, p, { lineComment: '#', blockComment: ['"""', '"""'] });
    case 'shell': return highlightWithKeywords(code, SHELL_KEYWORDS, p, { lineComment: '#' });
    case 'clike': return highlightWithKeywords(code, CLIKE_KEYWORDS, p, { lineComment: '//', blockComment: ['/*', '*/'] });
    case 'plain':
    default: return esc(code);
  }
}
