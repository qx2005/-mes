import * as monaco from '@theia/monaco-editor-core';
import linesByFile = require('./presentation-lines.json');

/** 使用模型装饰标记待输入行，不改变文件内容或撤销历史。 */
export function registerPresentationHighlights(): void {
  const style = document.createElement('style');
  style.textContent = '.monaco-editor .mes-presentation-blank { background: rgba(135, 206, 250, .24); }';
  document.head.appendChild(style);
  const attached = new WeakSet<monaco.editor.ITextModel>();

  const attach = (model: monaco.editor.ITextModel): void => {
    if (attached.has(model)) { return; }
    const path = decodeURIComponent(model.uri.path).replace(/\\/g, '/');
    const entry = Object.entries(linesByFile).find(([file]) =>
      path.endsWith('/ide-workspace/bsq_usr/' + file));
    if (!entry) { return; }
    attached.add(model);
    let ids = model.deltaDecorations([], entry[1]
      .filter(line => line <= model.getLineCount() && !model.getLineContent(line).trim())
      .map(line => ({
        range: new monaco.Range(line, 1, line, model.getLineMaxColumn(line)),
        options: {
          description: '待填写代码行',
          isWholeLine: true,
          className: 'mes-presentation-blank',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      })));

    const changes = model.onDidChangeContent(() => {
      const completed = ids.filter(id => {
        const range = model.getDecorationRange(id);
        return !range || !!model.getLineContent(range.startLineNumber).trim();
      });
      if (completed.length) {
        model.deltaDecorations(completed, []);
        ids = ids.filter(id => !completed.includes(id));
      }
    });
    model.onWillDispose(() => changes.dispose());
  };
  monaco.editor.getModels().forEach(attach);
  monaco.editor.onDidCreateModel(attach);
}
