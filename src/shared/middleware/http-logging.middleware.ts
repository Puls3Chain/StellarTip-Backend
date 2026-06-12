import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../logging/logging.config';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new StructuredLogger();

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const requestId =
        ((req as unknown as Record<string, unknown>)['requestId'] as
          | string
          | undefined) ?? '';

      const meta: Record<string, unknown> = {
        method,
        url: originalUrl,
        statusCode,
        duration,
        requestId,
      };

      const msg = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(msg, undefined, 'HTTP', meta);
      } else if (statusCode >= 400) {
        this.logger.warn(msg, 'HTTP', meta);
      } else {
        this.logger.log(msg, 'HTTP', meta);
      }
    });

    next();
  }
}
