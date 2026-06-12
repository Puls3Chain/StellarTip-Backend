import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const httpCtx = context.switchToHttp();
    const httpResponse = httpCtx.getResponse<Response>();
    const httpRequest = httpCtx.getRequest<Request>();
    const requestId =
      (httpRequest as unknown as Record<string, unknown>)['requestId'] as
        | string
        | undefined ?? '';

    return next.handle().pipe(
      map((responseBody: T) => ({
        success: true as const,
        statusCode: httpResponse.statusCode,
        data: responseBody,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
