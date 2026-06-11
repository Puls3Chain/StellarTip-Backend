import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
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

    return next.handle().pipe(
      map((responseBody: T) => ({
        success: true as const,
        statusCode: httpResponse.statusCode,
        data: responseBody,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
