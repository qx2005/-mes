import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { FileSystemProvider } from '@theia/filesystem/lib/common/files';
import { DiskFileSystemProvider } from '@theia/filesystem/lib/node/disk-file-system-provider';
import { MesSandboxBackendContribution } from './mes-sandbox-backend-contribution';
import { MesSandboxFileSystemProvider } from './mes-sandbox-file-system-provider';

export default new ContainerModule((bind, _unbind, _isBound, rebind) => {
  bind(MesSandboxFileSystemProvider).toSelf().inSingletonScope();
  rebind(DiskFileSystemProvider).toService(MesSandboxFileSystemProvider);
  rebind(FileSystemProvider).toService(MesSandboxFileSystemProvider);
  bind(MesSandboxBackendContribution).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(MesSandboxBackendContribution);
});
