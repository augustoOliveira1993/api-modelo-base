import { NextFunction, Request, Response } from 'express';
import { isAppError } from '../errors/AppError';
import { MongoErros, typeErrorsMongo } from '../errors/MongoErrors';
import { logger } from '../utils/logger';

export class ErrorMiddleware {
  public static handle(
    error: Error,
    request: Request,
    response: Response,
    _: NextFunction,
  ) {
    const ipRequest =
      request.ip?.split(':').length === 3 ? 'local' : request.ip?.split(':')[3];
    const requestId = request.requestId;
    const isProduction = process.env.NODE_ENV === 'production';

    const infoMessage = `> ${request.url} [${ipRequest} - ${
      request?.userEmail ? request?.body.email : 'anônimo'
    }]${requestId ? ` requestId=${requestId}` : ''}`;
    if (typeErrorsMongo.includes(error.name)) {
      const mongoError = new MongoErros(error);
      const errorResponse = mongoError.getMessage();
      return response.status(errorResponse.status).json(errorResponse);
    }
    if (isAppError(error)) {
      const err = error.getMessage();
      logger.error(
        `${infoMessage}: ${error.message} - Status: ${error.statusCode}`,
        {
          requestId,
          path: request.originalUrl,
          method: request.method,
          statusCode: error.statusCode,
          errorName: error.constructor.name,
        },
      );
      return response.status(err.status_code || 400).json({
        ...err,
        request_id: requestId,
      });
    }

    logger.error(`${infoMessage}: ${error.message} - Status: ${500}`, {
      requestId,
      path: request.originalUrl,
      method: request.method,
      statusCode: 500,
      errorName: error.name,
      stack: error.stack,
    });
    const errorResponse: Record<string, unknown> = {
      success: false,
      title: 'Ocorreu um erro interno!',
      message: 'Erro interno no servidor.',
      type_error: error.name,
    };

    if (!isProduction) {
      errorResponse.error = error.message;
      errorResponse.origin = error.stack?.split('\n').map(err => err.trim());
    }

    if (requestId) {
      errorResponse.request_id = requestId;
    }

    return response.status(500).json(errorResponse);
  }
}
