// Parses CREATE TABLE statements (Postgres/MySQL/SQLite-flavored) into a structured
// form every SQL-to-<ORM> emitter builds from. Scoped to the syntax that shows up in
// the overwhelming majority of real schemas — inline + table-level PRIMARY KEY,
// FOREIGN KEY, UNIQUE, NOT NULL, DEFAULT, AUTO_INCREMENT/SERIAL. Exotic constructs
// (CHECK constraints, generated columns, partitioning) are left out of the model
// rather than guessed at.

export interface SqlColumn {
  name: string;
  baseType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  default?: string;
  references?: { table: string; column: string };
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

function stripIdent(s: string): string {
  return s.trim().replace(/^[`"[]|[`"\]]$/g, '');
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function parseCreateTable(sql: string): SqlTable[] {
  const tables: SqlTable[] = [];
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\]\w.]+)\s*\(/gi;
  let m: RegExpExecArray | null;

  while ((m = tableRe.exec(sql))) {
    const tableName = stripIdent(m[1].split('.').pop() ?? m[1]);
    const openParen = tableRe.lastIndex - 1;

    let depth = 0;
    let end = -1;
    for (let i = openParen; i < sql.length; i++) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;

    const body = sql.slice(openParen + 1, end);
    const defs = splitTopLevel(body);
    const columns: SqlColumn[] = [];
    const tablePkCols: string[] = [];
    const tableUniqueCols: string[] = [];
    const tableFks: Record<string, { table: string; column: string }> = {};

    for (const def of defs) {
      const trimmed = def.trim();

      const pkMatch = trimmed.match(/^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        tablePkCols.push(...pkMatch[1].split(',').map(s => stripIdent(s)));
        continue;
      }
      const fkMatch = trimmed.match(/^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const col = stripIdent(fkMatch[1]);
        tableFks[col] = { table: stripIdent(fkMatch[2]), column: stripIdent(fkMatch[3]) };
        continue;
      }
      const uniqueMatch = trimmed.match(/^(?:CONSTRAINT\s+\S+\s+)?UNIQUE\s*\(([^)]+)\)/i);
      if (uniqueMatch) {
        tableUniqueCols.push(...uniqueMatch[1].split(',').map(s => stripIdent(s)));
        continue;
      }
      if (/^(CHECK|CONSTRAINT|KEY|INDEX)\b/i.test(trimmed)) continue; // not modeled

      // Column definition: name TYPE[(args)] [constraints...]
      const colMatch = trimmed.match(/^([`"[\]\w]+)\s+([A-Za-z][A-Za-z0-9_ ]*?)(?:\s*\(([^)]+)\))?(\s|$)/);
      if (!colMatch) continue;
      const colName = stripIdent(colMatch[1]);
      const baseType = colMatch[2].trim().toUpperCase();
      const argsRaw = colMatch[3];
      let length: number | undefined, precision: number | undefined, scale: number | undefined;
      if (argsRaw) {
        const nums = argsRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
        if (nums.length === 1) length = nums[0];
        else if (nums.length === 2) { precision = nums[0]; scale = nums[1]; }
      }

      const restStart = colMatch.index! + colMatch[0].length - (colMatch[4] ? colMatch[4].length : 0);
      const rest = trimmed.slice(restStart);
      const restUpper = rest.toUpperCase();

      const nullable = !/\bNOT\s+NULL\b/.test(restUpper);
      const primaryKey = /\bPRIMARY\s+KEY\b/.test(restUpper);
      const unique = /\bUNIQUE\b/.test(restUpper);
      const autoIncrement = /\b(AUTO_INCREMENT|AUTOINCREMENT)\b/.test(restUpper) || /^(SERIAL|BIGSERIAL|SMALLSERIAL)$/.test(baseType);
      const defaultMatch = rest.match(/DEFAULT\s+('[^']*'|"[^"]*"|[\w.]+\([^)]*\)|[\w.]+)/i);
      const refMatch = rest.match(/REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i);

      columns.push({
        name: colName,
        baseType,
        length, precision, scale,
        nullable,
        primaryKey,
        unique,
        autoIncrement,
        default: defaultMatch ? defaultMatch[1] : undefined,
        references: refMatch ? { table: stripIdent(refMatch[1]), column: stripIdent(refMatch[2]) } : undefined,
      });
    }

    for (const c of columns) {
      if (tablePkCols.includes(c.name)) c.primaryKey = true;
      if (tableUniqueCols.includes(c.name)) c.unique = true;
      if (tableFks[c.name]) c.references = tableFks[c.name];
    }

    tables.push({ name: tableName, columns });
  }
  return tables;
}

export type TypeCategory = 'int' | 'bigint' | 'smallint' | 'decimal' | 'float' | 'string' | 'text' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'json' | 'unknown';

export function typeCategory(baseType: string): TypeCategory {
  const t = baseType.toUpperCase().trim();
  if (['INT', 'INTEGER', 'INT4', 'MEDIUMINT', 'SERIAL'].includes(t)) return 'int';
  if (['BIGINT', 'INT8', 'BIGSERIAL'].includes(t)) return 'bigint';
  if (['SMALLINT', 'INT2', 'TINYINT', 'SMALLSERIAL'].includes(t)) return 'smallint';
  if (['DECIMAL', 'NUMERIC'].includes(t)) return 'decimal';
  if (['FLOAT', 'REAL', 'DOUBLE', 'DOUBLE PRECISION'].includes(t)) return 'float';
  if (['VARCHAR', 'CHAR', 'CHARACTER', 'CHARACTER VARYING'].includes(t)) return 'string';
  if (['TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT'].includes(t)) return 'text';
  if (['BOOLEAN', 'BOOL'].includes(t)) return 'boolean';
  if (t === 'DATE') return 'date';
  if (['DATETIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITHOUT TIME ZONE'].includes(t)) return 'datetime';
  if (t === 'UUID') return 'uuid';
  if (['JSON', 'JSONB'].includes(t)) return 'json';
  return 'unknown';
}

export function singularize(name: string): string {
  return name.replace(/ies$/, 'y').replace(/ses$/, 's').replace(/s$/, '');
}

export function toPascalCase(name: string): string {
  return name.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

export function toCamelCase(name: string): string {
  const p = toPascalCase(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}
