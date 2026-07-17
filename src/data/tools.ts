// Single source of truth for every tool on the site. Nav, footer, homepage
// cards, category pages, search index, sitemap, and related-tools sections
// all read from this file — never hardcode a tool list anywhere else.

export type Category = 'json' | 'yaml' | 'xml' | 'converters' | 'generators' | 'encoding' | 'jwt';

export type Tool = {
  slug: string;
  name: string;
  category: Category;
  description: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  icon: string; // lucide-react icon name
  related: string[];
  status: 'live' | 'planned';
  addedAt: string; // ISO date
};

export const CATEGORY_META: Record<Category, { name: string; description: string; icon: string }> = {
  json: {
    name: 'JSON',
    description: 'Format, validate, minify, view, query, and diff JSON documents.',
    icon: 'Braces',
  },
  yaml: {
    name: 'YAML',
    description: 'Format, validate, and parse YAML configuration files.',
    icon: 'FileText',
  },
  xml: {
    name: 'XML',
    description: 'Format, validate, and parse XML documents with namespace support.',
    icon: 'Code2',
  },
  converters: {
    name: 'Converters',
    description: 'Convert between JSON, YAML, XML, CSV, and TypeScript.',
    icon: 'ArrowLeftRight',
  },
  generators: {
    name: 'Generators',
    description: 'Generate TypeScript interfaces, Go structs, and Python dataclasses from JSON.',
    icon: 'Wand2',
  },
  encoding: {
    name: 'Encoding',
    description: 'Base64, URL, and HTML encode/decode utilities.',
    icon: 'Binary',
  },
  jwt: {
    name: 'JWT',
    description: 'Decode and inspect JSON Web Tokens.',
    icon: 'KeyRound',
  },
};

export const tools: Tool[] = [
  // ── Wave 1: ported from the old site, live today ──
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    category: 'json',
    description: 'Beautify and pretty-print JSON with configurable indentation.',
    metaTitle: 'JSON Formatter — Beautify & Pretty-Print JSON | DevFormats',
    metaDescription: 'Format and beautify JSON online with syntax highlighting, configurable indentation, and instant validation. 100% client-side — nothing leaves your browser.',
    keywords: ['json formatter', 'json beautifier', 'pretty print json', 'format json online'],
    icon: 'Braces',
    related: ['json-validator', 'json-minifier', 'json-viewer', 'json-to-yaml'],
    status: 'live',
    addedAt: '2025-01-10',
  },
  {
    slug: 'json-validator',
    name: 'JSON Validator',
    category: 'json',
    description: 'Check JSON syntax against RFC 8259 with exact line/column error reporting.',
    metaTitle: 'JSON Validator — RFC 8259 Syntax Checker | DevFormats',
    metaDescription: 'Validate JSON syntax against RFC 8259 with exact line and column error locations, plus key-count and depth stats. Runs entirely in your browser.',
    keywords: ['json validator', 'validate json online', 'json syntax checker', 'json lint'],
    icon: 'CheckCircle2',
    related: ['json-formatter', 'json-schema-validator', 'json-parser'],
    status: 'live',
    addedAt: '2025-01-10',
  },
  {
    slug: 'json-minifier',
    name: 'JSON Minifier',
    category: 'json',
    description: 'Strip whitespace to produce the smallest valid JSON payload.',
    metaTitle: 'JSON Minifier — Compress JSON Online | DevFormats',
    metaDescription: 'Minify JSON by removing all whitespace and line breaks. See exact byte savings and compression percentage — all processed locally in your browser.',
    keywords: ['json minifier', 'minify json', 'compress json', 'json compressor'],
    icon: 'Minimize2',
    related: ['json-formatter', 'json-validator'],
    status: 'live',
    addedAt: '2025-01-10',
  },
  {
    slug: 'json-to-csv',
    name: 'JSON to CSV',
    category: 'converters',
    description: 'Convert a JSON array of objects into a spreadsheet-ready CSV file.',
    metaTitle: 'JSON to CSV Converter | DevFormats',
    metaDescription: 'Convert JSON arrays of objects to CSV instantly in your browser. Keys become column headers — download as a .csv file with zero data upload.',
    keywords: ['json to csv', 'convert json to csv', 'json to csv converter online'],
    icon: 'Table',
    related: ['csv-to-json', 'json-formatter'],
    status: 'live',
    addedAt: '2025-01-10',
  },
  {
    slug: 'json-diff',
    name: 'JSON Diff',
    category: 'json',
    description: 'Compare two JSON documents side by side with dot-notation key paths.',
    metaTitle: 'JSON Diff Checker — Compare Two JSON Documents | DevFormats',
    metaDescription: 'Compare two JSON documents side by side. Colour-coded additions, deletions, and changes with full dot-notation key paths — no data sent to any server.',
    keywords: ['json diff', 'json compare', 'compare json online', 'json difference checker'],
    icon: 'GitCompare',
    related: ['json-formatter', 'json-validator'],
    status: 'live',
    addedAt: '2025-01-10',
  },

  // ── Wave 2: highest ROI new tools ──
  {
    slug: 'yaml-formatter',
    name: 'YAML Formatter',
    category: 'yaml',
    description: 'Format and validate YAML with 2-space or 4-space indentation.',
    metaTitle: 'YAML Formatter — Format & Validate YAML Online | DevFormats',
    metaDescription: 'Format, validate, and minify YAML online with configurable indentation and exact error line/column reporting. Runs entirely client-side.',
    keywords: ['yaml formatter', 'format yaml online', 'yaml beautifier', 'yaml validator'],
    icon: 'FileText',
    related: ['yaml-to-json', 'json-to-yaml', 'yaml-validator'],
    status: 'live',
    addedAt: '2026-07-20',
  },
  {
    slug: 'xml-formatter',
    name: 'XML Formatter',
    category: 'xml',
    description: 'Pretty-print XML with namespace, CDATA, and comment support.',
    metaTitle: 'XML Formatter — Format & Beautify XML Online | DevFormats',
    metaDescription: 'Format and beautify XML documents online with full namespace, CDATA, and comment support. 100% client-side processing.',
    keywords: ['xml formatter', 'format xml online', 'xml beautifier', 'pretty print xml'],
    icon: 'Code2',
    related: ['xml-validator', 'xml-to-json', 'json-to-xml'],
    status: 'live',
    addedAt: '2026-07-20',
  },
  {
    slug: 'json-to-yaml',
    name: 'JSON to YAML',
    category: 'converters',
    description: 'Convert JSON to YAML while preserving key order.',
    metaTitle: 'JSON to YAML Converter | DevFormats',
    metaDescription: 'Convert JSON to YAML online, preserving key order and structure. No data leaves your browser.',
    keywords: ['json to yaml', 'convert json to yaml', 'json to yaml converter'],
    icon: 'ArrowRightLeft',
    related: ['yaml-to-json', 'yaml-formatter', 'json-formatter'],
    status: 'live',
    addedAt: '2026-07-21',
  },
  {
    slug: 'yaml-to-json',
    name: 'YAML to JSON',
    category: 'converters',
    description: 'Convert YAML to JSON with instant syntax validation.',
    metaTitle: 'YAML to JSON Converter | DevFormats',
    metaDescription: 'Convert YAML to JSON online with instant syntax validation. Processed entirely in your browser — no uploads.',
    keywords: ['yaml to json', 'convert yaml to json', 'yaml to json converter'],
    icon: 'ArrowRightLeft',
    related: ['json-to-yaml', 'yaml-formatter', 'json-formatter'],
    status: 'live',
    addedAt: '2026-07-21',
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    category: 'jwt',
    description: 'Decode JWT header, payload, and signature with expiry and algorithm warnings.',
    metaTitle: 'JWT Decoder — Decode & Verify JSON Web Tokens | DevFormats',
    metaDescription: 'Decode JWT header, payload, and signature. Shows algorithm, expiry as relative time, and warns on alg:none or expired tokens. Runs locally.',
    keywords: ['jwt decoder', 'decode jwt', 'jwt debugger', 'json web token decoder'],
    icon: 'KeyRound',
    related: ['base64', 'json-formatter', 'json-viewer'],
    status: 'live',
    addedAt: '2026-07-22',
  },

  // ── Wave 3: volume plays ──
  {
    slug: 'base64',
    name: 'Base64 Encode/Decode',
    category: 'encoding',
    description: 'Encode or decode Base64 for text and files, Unicode-safe.',
    metaTitle: 'Base64 Encode & Decode Online | DevFormats',
    metaDescription: 'Encode and decode Base64 for text and files, including a URL-safe variant. Unicode-safe via TextEncoder — all processing happens in your browser.',
    keywords: ['base64 encode', 'base64 decode', 'base64 converter online'],
    icon: 'Binary',
    related: ['url-encode', 'jwt-decoder'],
    status: 'live',
    addedAt: '2026-07-23',
  },
  {
    slug: 'csv-to-json',
    name: 'CSV to JSON',
    category: 'converters',
    description: 'Convert CSV to JSON with delimiter detection and header toggle.',
    metaTitle: 'CSV to JSON Converter | DevFormats',
    metaDescription: 'Convert CSV to JSON online with automatic delimiter detection, header toggle, and support for quoted and escaped fields.',
    keywords: ['csv to json', 'convert csv to json', 'csv to json converter'],
    icon: 'Table',
    related: ['json-to-csv', 'json-formatter'],
    status: 'live',
    addedAt: '2026-07-23',
  },
  {
    slug: 'json-to-typescript',
    name: 'JSON to TypeScript',
    category: 'generators',
    description: 'Generate TypeScript interfaces or type aliases from JSON.',
    metaTitle: 'JSON to TypeScript Interface Generator | DevFormats',
    metaDescription: 'Generate TypeScript interfaces or type aliases from JSON, with optional fields and configurable root name. Runs entirely client-side.',
    keywords: ['json to typescript', 'json to interface', 'typescript interface generator'],
    icon: 'FileCode',
    related: ['go-struct-generator', 'python-dataclass-generator', 'json-formatter'],
    status: 'live',
    addedAt: '2026-07-24',
  },
  {
    slug: 'json-viewer',
    name: 'JSON Viewer',
    category: 'json',
    description: 'Browse JSON as a collapsible tree with search and path copy.',
    metaTitle: 'JSON Viewer — Collapsible Tree View | DevFormats',
    metaDescription: 'View JSON as a collapsible tree with in-tree search and one-click path copy. No data ever leaves your browser.',
    keywords: ['json viewer', 'json tree view', 'view json online'],
    icon: 'ListTree',
    related: ['json-formatter', 'jsonpath'],
    status: 'live',
    addedAt: '2026-07-24',
  },
  {
    slug: 'json-parser',
    name: 'JSON Parser',
    category: 'json',
    description: 'Parse JSON and get clear, actionable syntax error explanations.',
    metaTitle: 'JSON Parser — Parse & Explain JSON Errors | DevFormats',
    metaDescription: 'Parse JSON online and get clear explanations of syntax errors, not just "invalid JSON". Runs entirely in your browser.',
    keywords: ['json parser', 'parse json online', 'json syntax error explained'],
    icon: 'FileSearch',
    related: ['json-validator', 'json-formatter'],
    status: 'live',
    addedAt: '2026-07-25',
  },

  // ── Wave 4: depth ──
  {
    slug: 'json-schema-validator',
    name: 'JSON Schema Validator',
    category: 'json',
    description: 'Validate JSON against a JSON Schema with JSON-pointer error paths.',
    metaTitle: 'JSON Schema Validator | DevFormats',
    metaDescription: 'Validate JSON documents against a JSON Schema, with errors reported as JSON pointers. Powered by Ajv, all client-side.',
    keywords: ['json schema validator', 'validate json schema', 'ajv online'],
    icon: 'ShieldCheck',
    related: ['json-validator', 'jsonpath'],
    status: 'planned',
    addedAt: '2026-07-26',
  },
  {
    slug: 'jsonpath',
    name: 'JSONPath Tester',
    category: 'json',
    description: 'Run live JSONPath queries and see matched values and paths.',
    metaTitle: 'JSONPath Tester — Live JSONPath Query Tool | DevFormats',
    metaDescription: 'Test JSONPath expressions live against your JSON, seeing matched values and their paths instantly. All processing happens in your browser.',
    keywords: ['jsonpath tester', 'jsonpath online', 'jsonpath query tool'],
    icon: 'Search',
    related: ['json-viewer', 'json-schema-validator'],
    status: 'planned',
    addedAt: '2026-07-26',
  },
  {
    slug: 'json-to-xml',
    name: 'JSON to XML',
    category: 'converters',
    description: 'Convert JSON to well-formed XML.',
    metaTitle: 'JSON to XML Converter | DevFormats',
    metaDescription: 'Convert JSON to well-formed XML online. No data leaves your browser.',
    keywords: ['json to xml', 'convert json to xml', 'json to xml converter'],
    icon: 'ArrowRightLeft',
    related: ['xml-to-json', 'xml-formatter'],
    status: 'planned',
    addedAt: '2026-07-27',
  },
  {
    slug: 'xml-to-json',
    name: 'XML to JSON',
    category: 'converters',
    description: 'Convert XML to JSON, preserving attributes and namespaces.',
    metaTitle: 'XML to JSON Converter | DevFormats',
    metaDescription: 'Convert XML to JSON online, preserving attributes and namespaces. Runs entirely in your browser.',
    keywords: ['xml to json', 'convert xml to json', 'xml to json converter'],
    icon: 'ArrowRightLeft',
    related: ['json-to-xml', 'xml-formatter'],
    status: 'planned',
    addedAt: '2026-07-27',
  },
  {
    slug: 'xml-validator',
    name: 'XML Validator',
    category: 'xml',
    description: 'Check XML well-formedness with exact error line/column.',
    metaTitle: 'XML Validator — Check XML Well-Formedness | DevFormats',
    metaDescription: 'Validate XML documents for well-formedness with exact error line and column reporting. All client-side, no uploads.',
    keywords: ['xml validator', 'validate xml online', 'xml syntax checker'],
    icon: 'CheckCircle2',
    related: ['xml-formatter', 'xml-parser'],
    status: 'planned',
    addedAt: '2026-07-28',
  },
  {
    slug: 'xml-parser',
    name: 'XML Parser',
    category: 'xml',
    description: 'Parse XML and inspect its structure as a tree.',
    metaTitle: 'XML Parser — Parse & Inspect XML | DevFormats',
    metaDescription: 'Parse XML documents and inspect the resulting structure as a tree. Runs entirely in your browser.',
    keywords: ['xml parser', 'parse xml online'],
    icon: 'FileSearch',
    related: ['xml-validator', 'xml-formatter'],
    status: 'planned',
    addedAt: '2026-07-28',
  },
  {
    slug: 'yaml-validator',
    name: 'YAML Validator',
    category: 'yaml',
    description: 'Validate YAML syntax against the YAML 1.2 spec.',
    metaTitle: 'YAML Validator — YAML 1.2 Syntax Checker | DevFormats',
    metaDescription: 'Validate YAML syntax against the YAML 1.2 specification with exact error reporting. All client-side.',
    keywords: ['yaml validator', 'validate yaml online', 'yaml syntax checker'],
    icon: 'CheckCircle2',
    related: ['yaml-formatter', 'yaml-parser'],
    status: 'planned',
    addedAt: '2026-07-29',
  },
  {
    slug: 'yaml-parser',
    name: 'YAML Parser',
    category: 'yaml',
    description: 'Parse YAML and inspect the resulting document structure.',
    metaTitle: 'YAML Parser — Parse & Inspect YAML | DevFormats',
    metaDescription: 'Parse YAML documents and inspect the resulting structure. Runs entirely in your browser.',
    keywords: ['yaml parser', 'parse yaml online'],
    icon: 'FileSearch',
    related: ['yaml-validator', 'yaml-formatter'],
    status: 'planned',
    addedAt: '2026-07-29',
  },

  // ── Wave 5: generators & encoding ──
  {
    slug: 'go-struct-generator',
    name: 'Go Struct Generator',
    category: 'generators',
    description: 'Generate Go structs with JSON tags from a JSON document.',
    metaTitle: 'Go Struct Generator from JSON | DevFormats',
    metaDescription: 'Generate Go structs with json tags from a JSON document, all in your browser. No data leaves your device.',
    keywords: ['json to go struct', 'go struct generator', 'generate go struct from json'],
    icon: 'FileCode',
    related: ['json-to-typescript', 'python-dataclass-generator'],
    status: 'planned',
    addedAt: '2026-07-30',
  },
  {
    slug: 'python-dataclass-generator',
    name: 'Python Dataclass Generator',
    category: 'generators',
    description: 'Generate Python dataclasses from a JSON document.',
    metaTitle: 'Python Dataclass Generator from JSON | DevFormats',
    metaDescription: 'Generate Python dataclasses from a JSON document, all in your browser. No data leaves your device.',
    keywords: ['json to python dataclass', 'python dataclass generator', 'generate dataclass from json'],
    icon: 'FileCode',
    related: ['json-to-typescript', 'go-struct-generator'],
    status: 'planned',
    addedAt: '2026-07-30',
  },
  {
    slug: 'url-encode',
    name: 'URL Encode',
    category: 'encoding',
    description: 'Percent-encode text for safe use in URLs.',
    metaTitle: 'URL Encode Online | DevFormats',
    metaDescription: 'Percent-encode text for safe use in URLs. Runs entirely in your browser.',
    keywords: ['url encode', 'url encoder online', 'percent encode'],
    icon: 'Link2',
    related: ['url-decode', 'base64'],
    status: 'planned',
    addedAt: '2026-07-31',
  },
  {
    slug: 'url-decode',
    name: 'URL Decode',
    category: 'encoding',
    description: 'Decode percent-encoded URL text back to plain text.',
    metaTitle: 'URL Decode Online | DevFormats',
    metaDescription: 'Decode percent-encoded URL text back to plain text. Runs entirely in your browser.',
    keywords: ['url decode', 'url decoder online', 'percent decode'],
    icon: 'Link2',
    related: ['url-encode', 'base64'],
    status: 'planned',
    addedAt: '2026-07-31',
  },
  {
    slug: 'html-encode',
    name: 'HTML Encode',
    category: 'encoding',
    description: 'Escape HTML entities to safely display raw markup as text.',
    metaTitle: 'HTML Encode Online | DevFormats',
    metaDescription: 'Escape HTML entities so raw markup displays safely as text. Runs entirely in your browser.',
    keywords: ['html encode', 'html entity encode', 'escape html online'],
    icon: 'Code2',
    related: ['html-decode', 'url-encode'],
    status: 'planned',
    addedAt: '2026-08-01',
  },
  {
    slug: 'html-decode',
    name: 'HTML Decode',
    category: 'encoding',
    description: 'Unescape HTML entities back to raw characters.',
    metaTitle: 'HTML Decode Online | DevFormats',
    metaDescription: 'Unescape HTML entities back to raw characters. Runs entirely in your browser.',
    keywords: ['html decode', 'html entity decode', 'unescape html online'],
    icon: 'Code2',
    related: ['html-encode', 'url-decode'],
    status: 'planned',
    addedAt: '2026-08-01',
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find(t => t.slug === slug);
}

export function getToolsByCategory(category: Category): Tool[] {
  return tools.filter(t => t.category === category);
}

export function getLiveTools(): Tool[] {
  return tools.filter(t => t.status === 'live');
}

export function getRecentTools(limit = 8): Tool[] {
  return [...tools].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, limit);
}

// Guarantees >=3 links per tool page (internal-linking requirement) by
// backfilling from the same category when the registry's explicit
// `related` list is short, rather than hand-maintaining 3+ entries on
// every one of ~30 registry rows.
export function getRelatedTools(tool: Tool, limit = 6): Tool[] {
  const explicit = tool.related
    .map(slug => getTool(slug))
    .filter((t): t is Tool => Boolean(t));

  const seen = new Set([tool.slug, ...explicit.map(t => t.slug)]);
  const backfill = tools.filter(t => t.category === tool.category && !seen.has(t.slug));

  return [...explicit, ...backfill].slice(0, Math.max(limit, 3));
}
