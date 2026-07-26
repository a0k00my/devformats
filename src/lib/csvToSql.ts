// Builds SQL INSERT statements from parsed CSV rows (PapaParse output with
// dynamicTyping, so numbers/booleans already come through as real JS types).

function sqlIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function toSqlInserts(rows: Record<string, unknown>[], tableName: string): string {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const table = sqlIdentifier(tableName || 'table_name');
  const columnList = columns.map(sqlIdentifier).join(', ');

  return rows
    .map(row => {
      const values = columns.map(c => sqlValue(row[c])).join(', ');
      return `INSERT INTO ${table} (${columnList}) VALUES (${values});`;
    })
    .join('\n');
}
