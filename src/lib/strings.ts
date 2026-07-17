// Flat English-only UI strings. Replaces the old multi-language i18n system —
// v1 is English-only (see devformats-build-prompt.md, hard constraint #4).
export const strings: Record<string, string> = {
  format: '⚡ Format', minify: 'Minify', copy: 'Copy', copied: '✓ Copied',
  download: '↓ Download', loadFile: '↑ Load File', clear: 'Clear',
  validate: '✓ Validate', compare: '⚡ Compare', convertToCsv: '⚡ Convert to CSV',
  input: 'Input', output: 'Output', result: 'Result',
  original: 'Original', modified: 'Modified', diffResults: 'Diff Results',
  csvOutput: 'CSV Output', jsonInput: 'JSON Input',
  pasteJson: 'Paste your JSON here…',
  pasteOriginal: 'Paste original JSON…',
  pasteModified: 'Paste modified JSON…',
  pasteArray: 'Paste a JSON array like [{"key": "value"}]…',
  clickFormat: 'paste JSON and click Format', clickMinify: 'click Minify to compress',
  clickValidate: 'click Validate to check', clickCompare: 'paste JSON in both panels and click Compare',
  clickConvert: 'CSV output appears here', fixError: '← fix the error',
  validJson: 'Valid JSON', invalidJson: 'Invalid JSON', noErrors: 'No syntax errors found',
  errorFound: 'error found', syntaxError: 'SyntaxError:',
  totalKeys: 'Total Keys', maxDepth: 'Max Depth',
  rows: 'rows', cols: 'cols',
  identical: 'Objects are identical', copyOutput: 'Copy Output', copyCSV: 'Copy CSV',
  downloadCSV: '↓ Download .csv', inputFormatted: 'Input (Formatted)', outputMinified: 'Output (Minified)',
  viewTree: '⌥ Tree', viewRaw: '{ } Raw',
  navFormatter: 'Formatter', navValidator: 'Validator', navMinifier: 'Minifier', navToCsv: 'JSON→CSV', navDiff: 'Diff',
  navAbout: 'About', navContact: 'Contact', navPrivacy: 'Privacy', navTerms: 'Terms',
  footerTools: 'Tools', footerLinks: 'Links', footerSpec: 'Spec',
  footerDesc: 'Fast, free, and private developer tools. All processing happens in your browser — no data sent to any server.',
  footerCopy: 'All processing is done locally in your browser.',
  clientSide: 'CLIENT-SIDE',
  diffAdded: 'added', diffRemoved: 'removed', diffChanged: 'changed',
  inputTooLarge: 'Input exceeds 5 MB — paste a smaller JSON document.',
};

export function tr(key: string): string {
  return strings[key] ?? key;
}
