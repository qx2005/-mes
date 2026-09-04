import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MesSandboxFrontendContribution } from './mes-sandbox-frontend-contribution';

export default new ContainerModule(bind => {
  bind(MesSandboxFrontendContribution).toSelf().inSingletonScope();
  bind(CommandContribution).toService(MesSandboxFrontendContribution);
  bind(FrontendApplicationContribution).toService(MesSandboxFrontendContribution);
});
