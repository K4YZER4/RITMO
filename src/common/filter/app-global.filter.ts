import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const path = request.url;
    const timestamp = new Date().toISOString();
    const requestId = (request as Request & { requestId?: string }).requestId ?? null;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handleKnownRequestError(exception);

      return response.status(prismaError.statusCode).json({
        requestId,
        code: prismaError.code,
        message: prismaError.message,
        statusCode: prismaError.statusCode,
        timestamp,
        path,
        details: prismaError.details,
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        requestId,
        code: 'PRISMA_VALIDATION_ERROR',
        message: 'La consulta enviada a la base de datos es inválida.',
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        details: exception.message,
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        requestId,
        code: 'PRISMA_INITIALIZATION_ERROR',
        message: 'No se pudo inicializar la conexión con la base de datos.',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp,
        path,
        details: exception.message,
      });
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        requestId,
        code: 'PRISMA_ENGINE_PANIC',
        message: 'El motor de base de datos falló inesperadamente.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        details: exception.message,
      });
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        requestId,
        code: 'PRISMA_UNKNOWN_ERROR',
        message: 'Ocurrió un error desconocido en la base de datos.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        details: exception.message,
      });
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let code = 'HTTP_EXCEPTION';
      let message = 'Ocurrió un error.';
      let details: unknown = null;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const errorObj = exceptionResponse as Record<string, unknown>;

        code = typeof errorObj.code === 'string' ? errorObj.code : code;
        message =
          typeof errorObj.message === 'string'
            ? errorObj.message
            : Array.isArray(errorObj.message)
              ? errorObj.message.join(', ')
              : message;
        details = errorObj.details ?? null;
      }

      return response.status(statusCode).json({
        requestId,
        code,
        message,
        statusCode,
        timestamp,
        path,
        details,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      requestId,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno del servidor.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      details: null,
    });
  }

  private handleKnownRequestError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_VALUE_TOO_LONG',
          message: 'Uno de los valores enviados es demasiado largo para su columna.',
          details: exception.meta ?? null,
        };

      case 'P2001':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PRISMA_RECORD_NOT_FOUND',
          message: 'El registro solicitado no existe.',
          details: exception.meta ?? null,
        };

      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'PRISMA_UNIQUE_CONSTRAINT',
          message: `Ya existe un registro con el valor único en: ${this.formatTarget(
            exception.meta?.target,
          )}.`,
          details: exception.meta ?? null,
        };

      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_FOREIGN_KEY_CONSTRAINT',
          message: 'Falló una restricción de llave foránea.',
          details: exception.meta ?? null,
        };

      case 'P2004':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_CONSTRAINT_FAILED',
          message: 'Una restricción de base de datos falló durante la operación.',
          details: exception.meta ?? null,
        };

      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_NULL_CONSTRAINT',
          message: 'Un campo obligatorio no puede ser null.',
          details: exception.meta ?? null,
        };

      case 'P2012':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_MISSING_REQUIRED_VALUE',
          message: 'Falta un valor obligatorio.',
          details: exception.meta ?? null,
        };

      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_REQUIRED_RELATION_VIOLATION',
          message: 'La operación viola una relación obligatoria.',
          details: exception.meta ?? null,
        };

      case 'P2015':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PRISMA_RELATED_RECORD_NOT_FOUND',
          message: 'No se encontró un registro relacionado.',
          details: exception.meta ?? null,
        };

      case 'P2016':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_QUERY_INTERPRETATION_ERROR',
          message: 'Error al interpretar la consulta.',
          details: exception.meta ?? null,
        };

      case 'P2018':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PRISMA_CONNECTED_RECORD_NOT_FOUND',
          message: 'No se encontró un registro conectado requerido.',
          details: exception.meta ?? null,
        };

      case 'P2020':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_VALUE_OUT_OF_RANGE',
          message: 'El valor enviado está fuera del rango permitido para ese campo.',
          details: exception.meta ?? null,
        };

      case 'P2021':
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'PRISMA_TABLE_NOT_FOUND',
          message: 'La tabla no existe en la base de datos actual.',
          details: exception.meta ?? null,
        };

      case 'P2022':
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'PRISMA_COLUMN_NOT_FOUND',
          message: 'La columna no existe en la base de datos actual.',
          details: exception.meta ?? null,
        };

      case 'P2024':
        return {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          code: 'PRISMA_CONNECTION_TIMEOUT',
          message: 'Se agotó el tiempo al intentar obtener una conexión a la base de datos.',
          details: exception.meta ?? null,
        };

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PRISMA_OPERATION_RECORD_NOT_FOUND',
          message: 'El registro requerido para la operación no fue encontrado.',
          details: exception.meta ?? null,
        };

      case 'P2033':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'PRISMA_NUMBER_OUT_OF_RANGE',
          message: 'El número enviado no cabe en un entero con signo de 64 bits.',
          details: exception.meta ?? null,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'PRISMA_UNHANDLED_ERROR',
          message: `Error de Prisma no manejado: ${exception.code}.`,
          details: exception.meta ?? null,
        };
    }
  }

  private formatTarget(target: unknown): string {
    if (Array.isArray(target)) {
      return target.join(', ');
    }

    if (typeof target === 'string') {
      return target;
    }

    return 'campo desconocido';
  }
}
