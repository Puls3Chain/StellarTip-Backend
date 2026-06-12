import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLogger } from '../logging/logging.config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    const errors: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || message;
        if (Array.isArray(resp.message)) {
          errors.push(...(resp.message as string[]));
          message = errors[0] || message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (Number(status) >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        'ExceptionFilter',
        {
          requestId:
            (request as unknown as Record<string, unknown>)['requestId'] ||
            'unknown',
          statusCode: status,
        },
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      errors: errors.length > 0 ? errors : undefined,
      requestId:
        (request as unknown as Record<string, unknown>)['requestId'] ||
        'unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
