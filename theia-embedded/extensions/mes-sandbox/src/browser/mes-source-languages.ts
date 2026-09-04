import * as monaco from '@theia/monaco-editor-core';

const javascriptKeywords = [
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for',
  'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
  'of', 'return', 'set', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield', 'require', 'module', 'exports'
];

const typescriptKeywords = [
  ...javascriptKeywords, 'abstract', 'any', 'as', 'asserts', 'bigint', 'boolean',
  'constructor', 'declare', 'enum', 'implements', 'infer', 'interface', 'is', 'keyof',
  'namespace', 'never', 'number', 'object', 'override', 'private', 'protected', 'public',
  'readonly', 'string', 'symbol', 'type', 'unknown'
];

function registerLanguage(id: string, extensions: string[], aliases: string[]): void {
  if (!monaco.languages.getLanguages().some(language => language.id === id)) {
    monaco.languages.register({ id, extensions, aliases });
  }
}

function scriptLanguage(keywords: string[]): monaco.languages.IMonarchLanguage {
  return {
    defaultToken: '',
    tokenPostfix: '.js',
    keywords,
    builtins: [
      'Array', 'Boolean', 'Date', 'Error', 'JSON', 'Map', 'Math', 'Number', 'Object',
      'Promise', 'RegExp', 'Set', 'String', 'Symbol', 'console', 'process', 'Buffer',
      'parseFloat', 'parseInt', 'isFinite', 'isNaN', 'setInterval', 'setTimeout'
    ],
    operators: [
      '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**', '*', '/', '%',
      '++', '--', '<<', '>>', '>>>', '&', '|', '^', '!', '~', '&&', '||', '??',
      '?', ':', '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '@'
    ],
    tokenizer: {
      root: [
        [/\b(function)(\s+)([a-zA-Z_$][\w$]*)/, ['keyword', 'white', 'identifier.function']],
        [/\b(class)(\s+)([A-Za-z_$][\w$]*)/, ['keyword', 'white', 'type.identifier']],
        [/\b(const|let|var)(\s+)([a-zA-Z_$][\w$]*)/, ['keyword', 'white', 'variable.declaration']],
        [/[a-zA-Z_$][\w$]*(?=\s*=>)/, 'variable.parameter'],
        [/[a-zA-Z_$][\w$]*(?=\s*\()/, { cases: { '@keywords': 'keyword', '@builtins': 'predefined', '@default': 'identifier.function' } }],
        [/\.[a-zA-Z_$][\w$]*/, 'variable.property'],
        [/[a-zA-Z_$][\w$]*(?=\s*:)/, 'key'],
        [/[A-Z][A-Z0-9_$]{2,}\b/, 'constant'],
        [/[A-Z][\w$]*/, 'type.identifier'],
        [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@builtins': 'predefined', '@default': 'identifier' } }],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
        [/\/(?![/*])(?:\\.|[^\/\r\n])+\/[dgimsuvy]*/, 'regexp'],
        [/`/, 'string', '@template'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@doubleString'],
        [/'/, 'string', '@singleString'],
        [/0[xX][0-9a-fA-F]+n?/, 'number.hex'],
        [/0[bB][01]+n?/, 'number.binary'],
        [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
        [/\d+n?/, 'number'],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
        [/[<>!~?:&|+\-*\/%^=]+/, 'operator']
      ],
      comment: [[/[^/*]+/, 'comment'], [/\*\//, 'comment', '@pop'], [/[/*]/, 'comment']],
      doubleString: [[/[^\\"]+/, 'string'], [/\\./, 'string.escape'], [/"/, 'string', '@pop']],
      singleString: [[/[^\\']+/, 'string'], [/\\./, 'string.escape'], [/'/, 'string', '@pop']],
      template: [[/[^\\`$]+/, 'string'], [/\\./, 'string.escape'], [/\$\{/, 'delimiter.bracket', '@bracketCounting'], [/`/, 'string', '@pop']],
      bracketCounting: [[/\{/, 'delimiter.bracket', '@bracketCounting'], [/\}/, 'delimiter.bracket', '@pop'], { include: 'root' }]
    }
  };
}

const jsonLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/"([^"\\]|\\.)*"(?=\s*:)/, 'key'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
      [/\b(true|false|null)\b/, 'keyword'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/[{}[\]]/, '@brackets'],
      [/[,:]/, 'delimiter']
    ],
    comment: [[/[^/*]+/, 'comment'], [/\*\//, 'comment', '@pop'], [/[/*]/, 'comment']]
  }
};

const markupLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/<!--/, 'comment', '@comment'],
      [/<!DOCTYPE/, 'metatag', '@tag'],
      [/<\/?[\w:-]+/, 'tag', '@tag'],
      [/&\w+;/, 'string.escape']
    ],
    comment: [[/-->/, 'comment', '@pop'], [/[^-]+/, 'comment'], [/./, 'comment']],
    tag: [[/[\w:-]+(?=\s*=)/, 'attribute.name'], [/=/, 'delimiter'], [/"[^"]*"|'[^']*'/, 'attribute.value'], [/\/?>/, 'tag', '@pop'], [/\s+/, 'white']]
  }
};

const cssLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\/\*/, 'comment', '@comment'],
      [/@[\w-]+/, 'keyword'],
      [/#[\w-]+/, 'tag'],
      [/\.[\w-]+/, 'type.identifier'],
      [/[\w-]+(?=\s*:)/, 'attribute.name'],
      [/#[0-9a-fA-F]{3,8}\b/, 'number.hex'],
      [/-?\d+(\.\d+)?(px|em|rem|vh|vw|%|s|ms|deg)?/, 'number'],
      [/"[^"]*"|'[^']*'/, 'string'],
      [/[{}():;,>+~]/, 'delimiter']
    ],
    comment: [[/[^/*]+/, 'comment'], [/\*\//, 'comment', '@pop'], [/[/*]/, 'comment']]
  }
};

const markdownLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/^#{1,6}\s.*$/, 'keyword'],
      [/^\s*>.*$/, 'comment'],
      [/^\s*([-*+] |\d+\. ).*$/, 'type.identifier'],
      [/```[\w-]*$/, 'string', '@codeblock'],
      [/`[^`]+`/, 'string'],
      [/\*\*[^*]+\*\*|__[^_]+__/, 'strong'],
      [/\*[^*]+\*|_[^_]+_/, 'emphasis'],
      [/!?\[[^\]]*\]\([^)]*\)/, 'string.link']
    ],
    codeblock: [[/^```\s*$/, 'string', '@pop'], [/.*$/, 'string']]
  }
};

const sqlLanguage: monaco.languages.IMonarchLanguage = {
  ignoreCase: true,
  keywords: ['select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'alter', 'drop', 'table', 'index', 'join', 'left', 'right', 'inner', 'outer', 'on', 'as', 'and', 'or', 'not', 'null', 'primary', 'key', 'foreign', 'references', 'order', 'group', 'by', 'having', 'limit'],
  tokenizer: {
    root: [
      [/[a-zA-Z_][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/--.*$/, 'comment'], [/\/\*/, 'comment', '@comment'],
      [/'([^']|'')*'/, 'string'], [/"([^"]|"")*"/, 'string'],
      [/\d+(\.\d+)?/, 'number'], [/[(),.;]/, 'delimiter'], [/[=<>+\-*\/]+/, 'operator']
    ],
    comment: [[/[^/*]+/, 'comment'], [/\*\//, 'comment', '@pop'], [/[/*]/, 'comment']]
  }
};

export function registerMesSourceLanguages(): void {
  registerLanguage('javascript', ['.js', '.mjs', '.cjs'], ['JavaScript', 'javascript']);
  registerLanguage('typescript', ['.ts'], ['TypeScript', 'typescript']);
  registerLanguage('typescriptreact', ['.tsx'], ['TypeScript React', 'tsx']);
  registerLanguage('json', ['.json'], ['JSON', 'json']);
  registerLanguage('html', ['.html', '.htm', '.vue'], ['HTML', 'html']);
  registerLanguage('css', ['.css', '.scss', '.less'], ['CSS', 'css']);
  registerLanguage('markdown', ['.md'], ['Markdown', 'markdown']);
  registerLanguage('sql', ['.sql'], ['SQL', 'sql']);

  monaco.languages.setMonarchTokensProvider('javascript', scriptLanguage(javascriptKeywords));
  monaco.languages.setMonarchTokensProvider('typescript', scriptLanguage(typescriptKeywords));
  monaco.languages.setMonarchTokensProvider('typescriptreact', scriptLanguage(typescriptKeywords));
  monaco.languages.setMonarchTokensProvider('json', jsonLanguage);
  monaco.languages.setMonarchTokensProvider('html', markupLanguage);
  monaco.languages.setMonarchTokensProvider('css', cssLanguage);
  monaco.languages.setMonarchTokensProvider('markdown', markdownLanguage);
  monaco.languages.setMonarchTokensProvider('sql', sqlLanguage);

  registerMesCodeTheme();
  registerJavaScriptCompletions();
}

function registerMesCodeTheme(): void {
  monaco.editor.defineTheme('mes-code-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'identifier.function', foreground: 'DCDCAA' },
      { token: 'variable.declaration', foreground: '4FC1FF' },
      { token: 'variable.parameter', foreground: '9CDCFE' },
      { token: 'variable.property', foreground: '9CDCFE' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'constant', foreground: '4FC1FF', fontStyle: 'bold' },
      { token: 'predefined', foreground: '4EC9B0' },
      { token: 'key', foreground: '9CDCFE' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.hex', foreground: 'B5CEA8' },
      { token: 'number.binary', foreground: 'B5CEA8' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorCursor.foreground': '#AEAFAD'
    }
  });
  monaco.editor.setTheme('mes-code-dark');
}

const javascriptSnippets: Array<{ label: string; detail: string; insertText: string }> = [
  { label: 'function', detail: '函数声明', insertText: 'function ${1:name}(${2:parameters}) {\n\t${0}\n}' },
  { label: 'async function', detail: '异步函数声明', insertText: 'async function ${1:name}(${2:parameters}) {\n\t${0}\n}' },
  { label: 'const', detail: '常量声明', insertText: 'const ${1:name} = ${0}' },
  { label: 'require', detail: 'CommonJS 模块导入', insertText: "const { ${1:member} } = require('${2:module}')" },
  { label: 'module.exports', detail: 'CommonJS 模块导出', insertText: 'module.exports = {\n\t${1:member}\n}' },
  { label: 'if', detail: '条件分支', insertText: 'if (${1:condition}) {\n\t${0}\n}' },
  { label: 'for of', detail: '遍历集合', insertText: 'for (const ${1:item} of ${2:items}) {\n\t${0}\n}' },
  { label: 'try catch', detail: '异常处理', insertText: 'try {\n\t${1}\n} catch (${2:error}) {\n\t${0}\n}' }
];

function registerJavaScriptCompletions(): void {
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      const modelWords = model.getValue().match(/[A-Za-z_$][\w$]{2,}/g) || [];
      const identifiers = Array.from(new Set([...javascriptKeywords, ...modelWords])).sort();
      const identifierSuggestions = identifiers.map(label => ({
        label,
        kind: javascriptKeywords.includes(label)
          ? monaco.languages.CompletionItemKind.Keyword
          : monaco.languages.CompletionItemKind.Variable,
        insertText: label,
        range,
        detail: javascriptKeywords.includes(label) ? 'JavaScript 关键字' : '当前文件标识符'
      }));
      const snippetSuggestions = javascriptSnippets.map(snippet => ({
        label: snippet.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: snippet.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: snippet.detail,
        sortText: '0_' + snippet.label
      }));
      return { suggestions: [...snippetSuggestions, ...identifierSuggestions] };
    }
  });
}
