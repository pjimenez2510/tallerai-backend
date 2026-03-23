import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let error: string;

    const httpStatusName = (HttpStatus as Record<number, string | undefined>)[status] ?? 'Error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = httpStatusName;
    } else {
      const responseObj = exceptionResponse as ExceptionResponseObject;
      const rawMessage = responseObj.message;
      message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : (rawMessage ?? 'An error occurred');
      error = responseObj.error ?? httpStatusName;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
