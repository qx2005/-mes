import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import type { Application, Request, Response } from '@theia/core/shared/express';
import { execFile } from 'child_process';
import * as path from 'path';

@injectable()
export class MesSandboxBackendContribution implements BackendApplicationContribution {
  protected resetting = false;

  protected async authorize(request: Request): Promise<boolean> {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return false;
    const result = await fetch('http://127.0.0.1:8080/getInfo', {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(10000)
    });
    const body = await result.json() as { code?: number; roles?: string[]; permissions?: string[] };
    return result.ok && body.code === 200 && (
      !!body.roles?.includes('admin') || !!body.permissions?.includes('*:*:*') ||
      !!body.permissions?.includes('mes:pro:workorder:remove')
    );
  }

  protected baseline(action: 'status' | 'restore'): Promise<unknown> {
    return new Promise((resolve, reject) => {
      execFile(process.execPath, [path.resolve(process.cwd(), '../tools/ide-baseline.cjs'), action],
        { windowsHide: true, timeout: 300000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) { reject(new Error(stderr.trim() || error.message)); return; }
          try { resolve(JSON.parse(stdout)); } catch (parseError) { reject(parseError); }
        });
    });
  }

  configure(app: Application): void {
    app.get('/mes-sandbox/demo-baseline', async (request: Request, response: Response) => {
      try {
        if (!await this.authorize(request)) { response.status(403).json({ code: 403, msg: '当前账号需要演示工单清理权限才能重置 IDE' }); return; }
        response.json({ code: 200, data: await this.baseline('status') });
      } catch (error) { response.status(500).json({ code: 500, msg: String(error) }); }
    });
    app.post('/mes-sandbox/demo-reset', async (request: Request, response: Response) => {
      try {
        if (!await this.authorize(request)) { response.status(403).json({ code: 403, msg: '当前账号需要演示工单清理权限才能重置 IDE' }); return; }
        if (this.resetting) { response.status(409).json({ code: 409, msg: 'IDE 正在还原，请稍后重试' }); return; }
        this.resetting = true;
        try { response.json({ code: 200, data: await this.baseline('restore') }); }
        finally { this.resetting = false; }
      } catch (error) { response.status(500).json({ code: 500, msg: String(error) }); }
    });
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
