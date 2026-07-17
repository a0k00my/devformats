export type Lang = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'hi' | 'pt' | 'ja';

export const LANG_LABELS: Record<Lang, string> = {
  en: 'EN', es: 'ES', fr: 'FR', de: 'DE',
  zh: '中文', hi: 'हिन्दी', pt: 'PT', ja: '日本語',
};

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  zh: '中文', hi: 'हिन्दी', pt: 'Português', ja: '日本語',
};

type Translations = Record<string, string> & {
  format: string; minify: string; copy: string; copied: string;
  download: string; loadFile: string; clear: string;
  validate: string; compare: string; convertToCsv: string;
  input: string; output: string; result: string;
  original: string; modified: string; diffResults: string;
  csvOutput: string; jsonInput: string;
  pasteJson: string; pasteOriginal: string; pasteModified: string;
  pasteArray: string;
  clickFormat: string; clickMinify: string; clickValidate: string;
  clickCompare: string; clickConvert: string; fixError: string;
  validJson: string; invalidJson: string; noErrors: string;
  errorFound: string; syntaxError: string;
  totalKeys: string; maxDepth: string;
  rows: string; cols: string;
  identical: string; copyOutput: string; copyCSV: string;
  downloadCSV: string; inputFormatted: string; outputMinified: string;
  viewTree: string; viewRaw: string;
  // nav
  navFormatter: string; navValidator: string; navMinifier: string;
  navToCsv: string; navDiff: string;
};

const t: Record<Lang, Translations> = {
  en: {
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
  },
  es: {
    format: '⚡ Formatear', minify: 'Minificar', copy: 'Copiar', copied: '✓ Copiado',
    download: '↓ Descargar', loadFile: '↑ Cargar', clear: 'Limpiar',
    validate: '✓ Validar', compare: '⚡ Comparar', convertToCsv: '⚡ Convertir a CSV',
    input: 'Entrada', output: 'Salida', result: 'Resultado',
    original: 'Original', modified: 'Modificado', diffResults: 'Diferencias',
    csvOutput: 'Salida CSV', jsonInput: 'Entrada JSON',
    pasteJson: 'Pega tu JSON aquí…',
    pasteOriginal: 'Pega el JSON original…',
    pasteModified: 'Pega el JSON modificado…',
    pasteArray: 'Pega un array JSON como [{"clave": "valor"}]…',
    clickFormat: 'pega JSON y haz clic en Formatear', clickMinify: 'clic en Minificar para comprimir',
    clickValidate: 'clic en Validar para comprobar', clickCompare: 'pega JSON en ambos paneles y compara',
    clickConvert: 'el CSV aparecerá aquí', fixError: '← corrige el error',
    validJson: 'JSON Válido', invalidJson: 'JSON Inválido', noErrors: 'Sin errores de sintaxis',
    errorFound: 'error encontrado', syntaxError: 'Error de Sintaxis:',
    totalKeys: 'Total de Claves', maxDepth: 'Profundidad Máx.',
    rows: 'filas', cols: 'cols',
    identical: 'Objetos idénticos', copyOutput: 'Copiar Salida', copyCSV: 'Copiar CSV',
    downloadCSV: '↓ Descargar .csv', inputFormatted: 'Entrada (Formateada)', outputMinified: 'Salida (Minificada)',
    viewTree: '⌥ Árbol', viewRaw: '{ } Texto',
    navFormatter: 'Formateador', navValidator: 'Validador', navMinifier: 'Minificador', navToCsv: 'JSON→CSV', navDiff: 'Diferencias',
  },
  fr: {
    format: '⚡ Formater', minify: 'Minifier', copy: 'Copier', copied: '✓ Copié',
    download: '↓ Télécharger', loadFile: '↑ Charger', clear: 'Effacer',
    validate: '✓ Valider', compare: '⚡ Comparer', convertToCsv: '⚡ Convertir en CSV',
    input: 'Entrée', output: 'Sortie', result: 'Résultat',
    original: 'Original', modified: 'Modifié', diffResults: 'Différences',
    csvOutput: 'Sortie CSV', jsonInput: 'Entrée JSON',
    pasteJson: 'Collez votre JSON ici…',
    pasteOriginal: 'Collez le JSON original…',
    pasteModified: 'Collez le JSON modifié…',
    pasteArray: 'Collez un tableau JSON comme [{"clé": "valeur"}]…',
    clickFormat: 'collez du JSON et cliquez sur Formater', clickMinify: 'cliquez sur Minifier pour compresser',
    clickValidate: 'cliquez sur Valider pour vérifier', clickCompare: 'collez du JSON dans les deux panneaux et comparez',
    clickConvert: 'le CSV apparaîtra ici', fixError: '← corriger l\'erreur',
    validJson: 'JSON Valide', invalidJson: 'JSON Invalide', noErrors: 'Aucune erreur de syntaxe',
    errorFound: 'erreur trouvée', syntaxError: 'Erreur de Syntaxe:',
    totalKeys: 'Total de Clés', maxDepth: 'Profondeur Max.',
    rows: 'lignes', cols: 'cols',
    identical: 'Objets identiques', copyOutput: 'Copier Sortie', copyCSV: 'Copier CSV',
    downloadCSV: '↓ Télécharger .csv', inputFormatted: 'Entrée (Formatée)', outputMinified: 'Sortie (Minifiée)',
    viewTree: '⌥ Arbre', viewRaw: '{ } Brut',
    navFormatter: 'Formateur', navValidator: 'Validateur', navMinifier: 'Minificateur', navToCsv: 'JSON→CSV', navDiff: 'Diff',
  },
  de: {
    format: '⚡ Formatieren', minify: 'Minifizieren', copy: 'Kopieren', copied: '✓ Kopiert',
    download: '↓ Herunterladen', loadFile: '↑ Laden', clear: 'Leeren',
    validate: '✓ Validieren', compare: '⚡ Vergleichen', convertToCsv: '⚡ In CSV konvertieren',
    input: 'Eingabe', output: 'Ausgabe', result: 'Ergebnis',
    original: 'Original', modified: 'Geändert', diffResults: 'Unterschiede',
    csvOutput: 'CSV-Ausgabe', jsonInput: 'JSON-Eingabe',
    pasteJson: 'JSON hier einfügen…',
    pasteOriginal: 'Originales JSON einfügen…',
    pasteModified: 'Geändertes JSON einfügen…',
    pasteArray: 'JSON-Array einfügen wie [{"Schlüssel": "Wert"}]…',
    clickFormat: 'JSON einfügen und Formatieren klicken', clickMinify: 'Minifizieren klicken zum Komprimieren',
    clickValidate: 'Validieren klicken zum Prüfen', clickCompare: 'JSON in beide Felder einfügen und vergleichen',
    clickConvert: 'CSV erscheint hier', fixError: '← Fehler beheben',
    validJson: 'Gültiges JSON', invalidJson: 'Ungültiges JSON', noErrors: 'Keine Syntaxfehler',
    errorFound: 'Fehler gefunden', syntaxError: 'Syntaxfehler:',
    totalKeys: 'Gesamte Schlüssel', maxDepth: 'Max. Tiefe',
    rows: 'Zeilen', cols: 'Spalten',
    identical: 'Objekte sind identisch', copyOutput: 'Ausgabe kopieren', copyCSV: 'CSV kopieren',
    downloadCSV: '↓ .csv herunterladen', inputFormatted: 'Eingabe (Formatiert)', outputMinified: 'Ausgabe (Minifiziert)',
    viewTree: '⌥ Baum', viewRaw: '{ } Roh',
    navFormatter: 'Formatierer', navValidator: 'Prüfer', navMinifier: 'Minimierer', navToCsv: 'JSON→CSV', navDiff: 'Vergleich',
  },
  zh: {
    format: '⚡ 格式化', minify: '压缩', copy: '复制', copied: '✓ 已复制',
    download: '↓ 下载', loadFile: '↑ 加载文件', clear: '清除',
    validate: '✓ 验证', compare: '⚡ 比较', convertToCsv: '⚡ 转换为CSV',
    input: '输入', output: '输出', result: '结果',
    original: '原始', modified: '修改后', diffResults: '差异结果',
    csvOutput: 'CSV输出', jsonInput: 'JSON输入',
    pasteJson: '在此粘贴您的JSON…',
    pasteOriginal: '粘贴原始JSON…',
    pasteModified: '粘贴修改后的JSON…',
    pasteArray: '粘贴JSON数组，如[{"key": "value"}]…',
    clickFormat: '粘贴JSON后点击格式化', clickMinify: '点击压缩以压缩',
    clickValidate: '点击验证以检查', clickCompare: '在两个面板中粘贴JSON并比较',
    clickConvert: 'CSV将在此显示', fixError: '← 修复错误',
    validJson: '有效的JSON', invalidJson: '无效的JSON', noErrors: '没有语法错误',
    errorFound: '个错误', syntaxError: '语法错误:',
    totalKeys: '总键数', maxDepth: '最大深度',
    rows: '行', cols: '列',
    identical: '对象相同', copyOutput: '复制输出', copyCSV: '复制CSV',
    downloadCSV: '↓ 下载.csv', inputFormatted: '输入（已格式化）', outputMinified: '输出（已压缩）',
    viewTree: '⌥ 树形', viewRaw: '{ } 原始',
    navFormatter: '格式化', navValidator: '验证', navMinifier: '压缩', navToCsv: 'JSON→CSV', navDiff: '对比',
  },
  hi: {
    format: '⚡ फ़ॉर्मेट', minify: 'मिनिफाई', copy: 'कॉपी', copied: '✓ कॉपी हुआ',
    download: '↓ डाउनलोड', loadFile: '↑ फ़ाइल लोड', clear: 'साफ़',
    validate: '✓ सत्यापित', compare: '⚡ तुलना', convertToCsv: '⚡ CSV में बदलें',
    input: 'इनपुट', output: 'आउटपुट', result: 'परिणाम',
    original: 'मूल', modified: 'संशोधित', diffResults: 'अंतर',
    csvOutput: 'CSV आउटपुट', jsonInput: 'JSON इनपुट',
    pasteJson: 'यहाँ JSON पेस्ट करें…',
    pasteOriginal: 'मूल JSON पेस्ट करें…',
    pasteModified: 'संशोधित JSON पेस्ट करें…',
    pasteArray: 'JSON array पेस्ट करें जैसे [{"key": "value"}]…',
    clickFormat: 'JSON पेस्ट करें और फ़ॉर्मेट पर क्लिक करें', clickMinify: 'मिनिफाई पर क्लिक करें',
    clickValidate: 'सत्यापित पर क्लिक करें', clickCompare: 'दोनों पैनल में JSON पेस्ट करें और तुलना करें',
    clickConvert: 'CSV यहाँ दिखेगा', fixError: '← त्रुटि ठीक करें',
    validJson: 'मान्य JSON', invalidJson: 'अमान्य JSON', noErrors: 'कोई वाक्यविन्यास त्रुटि नहीं',
    errorFound: 'त्रुटि मिली', syntaxError: 'वाक्यविन्यास त्रुटि:',
    totalKeys: 'कुल कुंजियाँ', maxDepth: 'अधिकतम गहराई',
    rows: 'पंक्तियाँ', cols: 'कॉलम',
    identical: 'ऑब्जेक्ट समान हैं', copyOutput: 'आउटपुट कॉपी', copyCSV: 'CSV कॉपी',
    downloadCSV: '↓ .csv डाउनलोड', inputFormatted: 'इनपुट (फ़ॉर्मेटेड)', outputMinified: 'आउटपुट (मिनिफाइड)',
    viewTree: '⌥ ट्री', viewRaw: '{ } रॉ',
    navFormatter: 'फ़ॉर्मेटर', navValidator: 'वैलिडेटर', navMinifier: 'मिनिफायर', navToCsv: 'JSON→CSV', navDiff: 'अंतर',
  },
  pt: {
    format: '⚡ Formatar', minify: 'Minificar', copy: 'Copiar', copied: '✓ Copiado',
    download: '↓ Baixar', loadFile: '↑ Carregar', clear: 'Limpar',
    validate: '✓ Validar', compare: '⚡ Comparar', convertToCsv: '⚡ Converter para CSV',
    input: 'Entrada', output: 'Saída', result: 'Resultado',
    original: 'Original', modified: 'Modificado', diffResults: 'Diferenças',
    csvOutput: 'Saída CSV', jsonInput: 'Entrada JSON',
    pasteJson: 'Cole seu JSON aqui…',
    pasteOriginal: 'Cole o JSON original…',
    pasteModified: 'Cole o JSON modificado…',
    pasteArray: 'Cole um array JSON como [{"chave": "valor"}]…',
    clickFormat: 'cole JSON e clique em Formatar', clickMinify: 'clique em Minificar para comprimir',
    clickValidate: 'clique em Validar para verificar', clickCompare: 'cole JSON nos dois painéis e compare',
    clickConvert: 'CSV aparecerá aqui', fixError: '← corrigir o erro',
    validJson: 'JSON Válido', invalidJson: 'JSON Inválido', noErrors: 'Sem erros de sintaxe',
    errorFound: 'erro encontrado', syntaxError: 'Erro de Sintaxe:',
    totalKeys: 'Total de Chaves', maxDepth: 'Profundidade Máx.',
    rows: 'linhas', cols: 'colunas',
    identical: 'Objetos são idênticos', copyOutput: 'Copiar Saída', copyCSV: 'Copiar CSV',
    downloadCSV: '↓ Baixar .csv', inputFormatted: 'Entrada (Formatada)', outputMinified: 'Saída (Minificada)',
    viewTree: '⌥ Árvore', viewRaw: '{ } Texto',
    navFormatter: 'Formatador', navValidator: 'Validador', navMinifier: 'Minificador', navToCsv: 'JSON→CSV', navDiff: 'Diferença',
  },
  ja: {
    format: '⚡ フォーマット', minify: '圧縮', copy: 'コピー', copied: '✓ コピー済',
    download: '↓ ダウンロード', loadFile: '↑ ファイル読込', clear: 'クリア',
    validate: '✓ 検証', compare: '⚡ 比較', convertToCsv: '⚡ CSVに変換',
    input: '入力', output: '出力', result: '結果',
    original: 'オリジナル', modified: '変更後', diffResults: '差分結果',
    csvOutput: 'CSV出力', jsonInput: 'JSON入力',
    pasteJson: 'JSONをここに貼り付け…',
    pasteOriginal: '元のJSONを貼り付け…',
    pasteModified: '変更後のJSONを貼り付け…',
    pasteArray: 'JSON配列を貼り付け [{"key": "value"}]…',
    clickFormat: 'JSONを貼り付けてフォーマットをクリック', clickMinify: '圧縮をクリック',
    clickValidate: '検証をクリック', clickCompare: '両パネルにJSONを貼り付けて比較',
    clickConvert: 'CSVがここに表示されます', fixError: '← エラーを修正',
    validJson: '有効なJSON', invalidJson: '無効なJSON', noErrors: '構文エラーなし',
    errorFound: 'エラー見つかりました', syntaxError: '構文エラー:',
    totalKeys: '総キー数', maxDepth: '最大深度',
    rows: '行', cols: '列',
    identical: 'オブジェクトは同一', copyOutput: '出力をコピー', copyCSV: 'CSVをコピー',
    downloadCSV: '↓ .csvダウンロード', inputFormatted: '入力（フォーマット済）', outputMinified: '出力（圧縮済）',
    viewTree: '⌥ ツリー', viewRaw: '{ } 生データ',
    navFormatter: 'フォーマッタ', navValidator: '検証', navMinifier: '圧縮', navToCsv: 'JSON→CSV', navDiff: '差分',
  },
};

export { t as translations };

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('jfo-lang') as Lang;
  return (stored && t[stored]) ? stored : 'en';
}

export function setLang(lang: Lang) {
  if (typeof window !== 'undefined') localStorage.setItem('jfo-lang', lang);
}
