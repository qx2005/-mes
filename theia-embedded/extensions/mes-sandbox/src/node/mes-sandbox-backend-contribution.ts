import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import type { Application, Request, Response } from '@theia/core/shared/express';

@injectable()
export class MesSandboxBackendContribution implements BackendApplicationContribution {
  configure(app: Application): void {
    app.get('/mes-sandbox/health', (_request: Request, response: Response) => {
      response.json({
        ok: true,
        service: 'mes-embedded-theia',
        port: 3188,
        workspace: 'ide-workspace/bsq_usr',
        isolation: 'filesystem-boundary',
        deployMode: 'simulation'
      });
    });
  }
}
