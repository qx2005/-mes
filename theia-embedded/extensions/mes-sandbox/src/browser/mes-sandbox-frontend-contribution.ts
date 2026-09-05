import { inject, injectable } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser';
import { registerMesSourceLanguages } from './mes-source-languages';
import { registerPresentationHighlights } from './presentation-highlights';

type MesParentMessage = {
  source: 'mes-theia';
  type: 'ready' | 'saved';
  fileName?: string;
  filePath?: string;
  savedAt?: string;
};

type MesHostMessage = {
  source: 'mes-platform';
  type: 'save-active';
};

@injectable()
export class MesSandboxFrontendContribution implements CommandContribution, FrontendApplicationContribution {
  @inject(EditorManager)
  protected readonly editors!: EditorManager;

  protected parentOrigin: string | undefined;
  protected commands: CommandRegistry | undefined;
  protected discarding: Promise<void> = Promise.resolve();

  registerCommands(commands: CommandRegistry): void {
    this.commands = commands;
    commands.onDidExecuteCommand(event => {
      if (event.commandId === 'core.save' || event.commandId === 'core.saveAll') {
        const editorUri = this.editors.currentEditor?.editor.uri;
        const fullPath = editorUri?.path.toString() || '';
        const workspaceMarker = '/ide-workspace/bsq_usr/';
        this.notifyParent({
          source: 'mes-theia',
          type: 'saved',
          fileName: editorUri?.path.base,
          filePath: fullPath.includes(workspaceMarker)
            ? fullPath.slice(fullPath.indexOf(workspaceMarker) + workspaceMarker.length)
            : editorUri?.path.base,
          savedAt: new Date().toISOString()
        });
      }
    });
  }

  onStart(_app: FrontendApplication): void {
    registerMesSourceLanguages();
    registerPresentationHighlights();
    window.addEventListener('storage', event => {
      if (event.key !== 'mes-ide-reset-start-v1' && event.key !== 'mes-demo-reset-completed-v1') return;
      this.discarding = this.discarding.then(async () => {
        await Promise.all(this.editors.all.map(async editor => {
          await editor.saveable.revert?.();
          editor.dispose();
        }));
        Object.keys(localStorage).filter(key => key.startsWith('theia:/ide')).forEach(key => localStorage.removeItem(key));
      });
      if (event.key === 'mes-demo-reset-completed-v1') {
        void this.discarding.then(() => window.location.reload());
      }
    });

    try {
      this.parentOrigin = document.referrer ? new URL(document.referrer).origin : undefined;
    } catch {
      this.parentOrigin = undefined;
    }

    this.notifyParent({ source: 'mes-theia', type: 'ready' });

    window.addEventListener('message', event => {
      if (event.source !== window.parent || !this.parentOrigin || event.origin !== this.parentOrigin) {
        return;
      }
      const message = event.data as Partial<MesHostMessage> | undefined;
      if (message?.source === 'mes-platform' && message.type === 'save-active') {
        void this.commands?.executeCommand('core.save');
      }
    });
  }

  protected notifyParent(message: MesParentMessage): void {
    if (window.parent === window || !this.parentOrigin) {
      return;
    }
    window.parent.postMessage(message, this.parentOrigin);
  }
}
