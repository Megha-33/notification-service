import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: { message?: string; error?: unknown } =
      exception instanceof HttpException
        ? (exception.getResponse() as unknown as { message?: string; error?: unknown })
        : { message: (exception as unknown)?.toString() };

    response.status(status).json({
      success: false,
      message: errorResponse.message || 'Something went wrong',
      data: null,
      errors: errorResponse.error ?? exception,
    });
  }
}