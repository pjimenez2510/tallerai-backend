import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { type Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: { message?: string; data?: T } | T) => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const hasMessageKey =
          data !== null &&
          data !== undefined &&
          typeof data === 'object' &&
          'message' in data;

        return {
          statusCode: response.statusCode,
          message: hasMessageKey
            ? (data as { message: string }).message
            : 'Success',
          data: hasMessageKey
            ? ((data as { data?: T }).data ?? null)
            : (data as T),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
