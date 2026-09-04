import { injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { DiskFileSystemProvider } from '@theia/filesystem/lib/node/disk-file-system-provider';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Limits every Theia file operation to the isolated MES source snapshot.
 * The real MES repository, database and runtime configuration remain outside
 * the IDE boundary even if a user invokes an Open File/Open Workspace command.
 */
@injectable()
export class MesSandboxFileSystemProvider extends DiskFileSystemProvider {
  protected readonly sandboxRoot = path.resolve(
    process.cwd(),
    '../ide-workspace/bsq_usr'
  );

  protected override toFilePath(resource: URI): string {
    const requestedPath = path.resolve(FileUri.fsPath(resource));
    this.assertInsideSandbox(requestedPath);
    return requestedPath;
  }

  override async fsPath(resource: URI): Promise<string> {
    return this.toFilePath(resource);
  }

  protected assertInsideSandbox(requestedPath: string): void {
    if (!this.isInside(this.sandboxRoot, requestedPath)) {
      throw new Error('在线 IDE 仅允许访问 MES 源码隔离副本。');
    }

    // Existing symlinks must not be usable to escape the isolated source directory.
    let existingPath = requestedPath;
    while (!fs.existsSync(existingPath)) {
      const parent = path.dirname(existingPath);
      if (parent === existingPath) break;
      existingPath = parent;
    }
    const realRoot = fs.realpathSync.native(this.sandboxRoot);
    const realExistingPath = fs.realpathSync.native(existingPath);
    if (!this.isInside(realRoot, realExistingPath)) {
      throw new Error('源码隔离工作区中的符号链接不能访问外部项目文件。');
    }
  }

  protected isInside(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
  }
}
