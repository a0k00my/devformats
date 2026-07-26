import type { SqlColumn, SqlTable } from './sqlDdlParser';
import { typeCategory, singularize, toPascalCase, toCamelCase } from './sqlDdlParser';

// Only literal defaults (numbers, quoted strings, true/false) and the common
// "now" functions are translated — anything else is surfaced as a comment
// rather than guessed at, since a wrong fabricated default is worse than none.
type DefaultKind = { kind: 'number'; value: string } | { kind: 'string'; value: string } | { kind: 'bool'; value: boolean } | { kind: 'now' } | { kind: 'raw'; value: string };

function describeDefault(raw: string): DefaultKind {
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { kind: 'number', value: raw };
  if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) return { kind: 'string', value: raw.slice(1, -1) };
  if (/^(TRUE|FALSE)$/i.test(raw)) return { kind: 'bool', value: /true/i.test(raw) };
  if (/^(CURRENT_TIMESTAMP|NOW\(\)|CURRENT_DATE)$/i.test(raw)) return { kind: 'now' };
  return { kind: 'raw', value: raw };
}

function pyStr(s: string): string { return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`; }
function jsStr(s: string): string { return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`; }

// ── Prisma ──
const PRISMA_TYPE: Record<string, string> = {
  int: 'Int', bigint: 'BigInt', smallint: 'Int', decimal: 'Decimal', float: 'Float',
  string: 'String', text: 'String', boolean: 'Boolean', date: 'DateTime', datetime: 'DateTime',
  uuid: 'String', json: 'Json', unknown: 'String',
};

export function toPrisma(tables: SqlTable[]): string {
  const blocks = tables.map(table => {
    const modelName = toPascalCase(singularize(table.name));
    const fields = table.columns.map(c => {
      const cat = typeCategory(c.baseType);
      const type = PRISMA_TYPE[cat];
      const attrs: string[] = [];
      if (c.primaryKey) attrs.push('@id');
      if (c.autoIncrement) attrs.push('@default(autoincrement())');
      else if (c.default) {
        const d = describeDefault(c.default);
        if (d.kind === 'number') attrs.push(`@default(${d.value})`);
        else if (d.kind === 'string') attrs.push(`@default(${jsStr(d.value)})`);
        else if (d.kind === 'bool') attrs.push(`@default(${d.value})`);
        else if (d.kind === 'now') attrs.push('@default(now())');
        else attrs.push(`// SQL default not translated: ${c.default}`);
      }
      if (c.unique && !c.primaryKey) attrs.push('@unique');
      if (c.references) attrs.push(`// FK -> ${c.references.table}.${c.references.column}`);
      const optional = c.nullable && !c.primaryKey ? '?' : '';
      const line = `  ${toCamelCase(c.name)}  ${type}${optional}`;
      return attrs.length ? `${line}  ${attrs.join(' ')}` : line;
    });
    return `model ${modelName} {\n${fields.join('\n')}\n}`;
  });
  return blocks.join('\n\n');
}

// ── Drizzle (pg-core) ──
const DRIZZLE_FN: Record<string, string> = {
  int: 'integer', bigint: 'bigint', smallint: 'smallint', decimal: 'numeric', float: 'real',
  string: 'varchar', text: 'text', boolean: 'boolean', date: 'date', datetime: 'timestamp',
  uuid: 'uuid', json: 'jsonb', unknown: 'text',
};

function drizzleDefault(d: DefaultKind, fnName: string): string | null {
  if (d.kind === 'number') return d.value;
  if (d.kind === 'string') return jsStr(d.value);
  if (d.kind === 'bool') return String(d.value);
  if (d.kind === 'now') return fnName === 'timestamp' || fnName === 'date' ? 'sql`now()`' : null;
  return null;
}

export function toDrizzle(tables: SqlTable[]): string {
  const importsNeeded = new Set(['pgTable']);
  let usesSql = false;

  const blocks = tables.map(table => {
    const varName = toCamelCase(table.name);
    const fields = table.columns.map(c => {
      const cat = typeCategory(c.baseType);
      // Postgres serial/bigserial express auto-increment through the column type
      // itself (a sequence-backed default) — there's no separate builder call for it.
      const fnName = c.autoIncrement && cat === 'int' ? 'serial'
        : c.autoIncrement && cat === 'bigint' ? 'bigserial'
        : DRIZZLE_FN[cat];
      importsNeeded.add(fnName);
      let expr = fnName === 'varchar' && c.length
        ? `varchar('${c.name}', { length: ${c.length} })`
        : fnName === 'numeric' && c.precision
        ? `numeric('${c.name}', { precision: ${c.precision}, scale: ${c.scale ?? 0} })`
        : fnName === 'bigint'
        ? `bigint('${c.name}', { mode: 'number' })`
        : fnName === 'bigserial'
        ? `bigserial('${c.name}', { mode: 'number' })`
        : `${fnName}('${c.name}')`;
      if (c.primaryKey) expr += '.primaryKey()';
      if (!c.nullable && !c.primaryKey) expr += '.notNull()';
      if (c.unique && !c.primaryKey) expr += '.unique()';
      let defaultComment = '';
      if (c.default && !c.autoIncrement) {
        const d = drizzleDefault(describeDefault(c.default), fnName);
        if (d) { expr += `.default(${d})`; if (d.startsWith('sql`')) usesSql = true; }
        else defaultComment = ` // SQL default not translated: ${c.default}`;
      }
      const refComment = c.references ? ` // FK -> ${c.references.table}.${c.references.column}` : '';
      return `  ${toCamelCase(c.name)}: ${expr},${refComment}${defaultComment}`;
    });
    return `export const ${varName} = pgTable('${table.name}', {\n${fields.join('\n')}\n});`;
  });

  const importList = Array.from(importsNeeded).sort().join(', ');
  const sqlImport = usesSql ? `import { sql } from 'drizzle-orm';\n` : '';
  return `${sqlImport}import { ${importList} } from 'drizzle-orm/pg-core';\n\n${blocks.join('\n\n')}`;
}

// ── TypeORM ──
const TYPEORM_TYPE: Record<string, string> = {
  int: 'int', bigint: 'bigint', smallint: 'smallint', decimal: 'decimal', float: 'float',
  string: 'varchar', text: 'text', boolean: 'boolean', date: 'date', datetime: 'timestamp',
  uuid: 'uuid', json: 'json', unknown: 'varchar',
};
const TS_TYPE: Record<string, string> = {
  int: 'number', bigint: 'number', smallint: 'number', decimal: 'number', float: 'number',
  string: 'string', text: 'string', boolean: 'boolean', date: 'Date', datetime: 'Date',
  uuid: 'string', json: 'any', unknown: 'string',
};

export function toTypeOrm(tables: SqlTable[]): string {
  const decorators = new Set(['Entity', 'Column']);

  const blocks = tables.map(table => {
    const className = toPascalCase(singularize(table.name));
    const fields = table.columns.map(c => {
      const cat = typeCategory(c.baseType);
      const camel = toCamelCase(c.name);
      const tsType = TS_TYPE[cat];
      const refComment = c.references ? ` // FK -> ${c.references.table}.${c.references.column}` : '';

      if (c.primaryKey && c.autoIncrement) {
        decorators.add('PrimaryGeneratedColumn');
        return `  @PrimaryGeneratedColumn()\n  ${camel}: ${tsType};${refComment}`;
      }
      if (c.primaryKey) {
        decorators.add('PrimaryColumn');
        let pkOpts = '';
        let pkComment = '';
        if (c.default) {
          const d = describeDefault(c.default);
          if (d.kind === 'number') pkOpts = `({ default: ${d.value} })`;
          else if (d.kind === 'string') pkOpts = `({ default: ${jsStr(d.value)} })`;
          else if (d.kind === 'bool') pkOpts = `({ default: ${d.value} })`;
          else pkComment = ` // SQL default not translated: ${c.default}`;
        }
        return `  @PrimaryColumn${pkOpts || '()'}\n  ${camel}: ${tsType};${refComment}${pkComment}`;
      }

      const opts: string[] = [`type: '${TYPEORM_TYPE[cat]}'`];
      if (c.length) opts.push(`length: ${c.length}`);
      if (c.nullable) opts.push('nullable: true');
      if (c.unique) opts.push('unique: true');
      let unmappedDefault = '';
      if (c.default) {
        const d = describeDefault(c.default);
        if (d.kind === 'number') opts.push(`default: ${d.value}`);
        else if (d.kind === 'string') opts.push(`default: ${jsStr(d.value)}`);
        else if (d.kind === 'bool') opts.push(`default: ${d.value}`);
        else if (d.kind === 'now') opts.push("default: () => 'CURRENT_TIMESTAMP'");
        else unmappedDefault = ` // SQL default not translated: ${c.default}`;
      }
      const optional = c.nullable ? '?' : '';
      return `  @Column({ ${opts.join(', ')} })\n  ${camel}${optional}: ${tsType};${refComment}${unmappedDefault}`;
    });
    return `@Entity('${table.name}')\nexport class ${className} {\n${fields.join('\n\n')}\n}`;
  });

  const importList = Array.from(decorators).sort().join(', ');
  return `import { ${importList} } from 'typeorm';\n\n${blocks.join('\n\n')}`;
}

// ── SQLAlchemy ──
function saType(c: SqlColumn, cat: string): string {
  switch (cat) {
    case 'int': return 'Integer';
    case 'bigint': return 'BigInteger';
    case 'smallint': return 'SmallInteger';
    case 'decimal': return `Numeric(${c.precision ?? 10}, ${c.scale ?? 0})`;
    case 'float': return 'Float';
    case 'string': return `String(${c.length ?? 255})`;
    case 'text': return 'Text';
    case 'boolean': return 'Boolean';
    case 'date': return 'Date';
    case 'datetime': return 'DateTime';
    case 'uuid': return 'String(36)';
    case 'json': return 'JSON';
    default: return 'String';
  }
}

export function toSqlAlchemy(tables: SqlTable[]): string {
  const typesUsed = new Set<string>();

  const blocks = tables.map(table => {
    const className = toPascalCase(singularize(table.name));
    const fields = table.columns.map(c => {
      const cat = typeCategory(c.baseType);
      const typeExpr = saType(c, cat);
      typesUsed.add(typeExpr.split('(')[0]);

      const args: string[] = [typeExpr];
      if (c.references) args.push(`ForeignKey('${c.references.table}.${c.references.column}')`);
      if (c.primaryKey) args.push('primary_key=True');
      if (c.autoIncrement) args.push('autoincrement=True');
      if (!c.nullable && !c.primaryKey) args.push('nullable=False');
      if (c.unique && !c.primaryKey) args.push('unique=True');
      let unmappedDefault = '';
      if (c.default) {
        const d = describeDefault(c.default);
        if (d.kind === 'number') args.push(`default=${d.value}`);
        else if (d.kind === 'string') args.push(`default=${pyStr(d.value)}`);
        else if (d.kind === 'bool') args.push(`default=${d.value ? 'True' : 'False'}`);
        else if (d.kind === 'now') args.push('default=datetime.utcnow');
        else unmappedDefault = `  # SQL default not translated: ${c.default}`;
      }
      if (c.references) typesUsed.add('ForeignKey');
      return `    ${c.name} = Column(${args.join(', ')})${unmappedDefault}`;
    });
    return `class ${className}(Base):\n    __tablename__ = '${table.name}'\n\n${fields.join('\n')}`;
  });

  const importList = Array.from(typesUsed).sort().join(', ');
  const usesNow = tables.some(t => t.columns.some(c => c.default && describeDefault(c.default).kind === 'now'));
  const datetimeImport = usesNow ? 'from datetime import datetime\n' : '';
  return `from sqlalchemy import Column, ${importList}\nfrom sqlalchemy.ext.declarative import declarative_base\n${datetimeImport}\nBase = declarative_base()\n\n\n${blocks.join('\n\n\n')}`;
}
