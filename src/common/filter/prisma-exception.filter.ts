import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, message, error, details } = this.handleKnownRequestError(exception);

      return response.status(status).json({
        statusCode: status,
        error,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid Prisma query parameters.',
        details: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message: 'Database connection could not be initialized.',
        details: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Database engine crashed unexpectedly.',
        details: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Unknown database error.',
        details: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    throw exception;
  }

  private handleKnownRequestError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'One of the provided values is too long for its column.',
          details: exception.meta ?? null,
        };

      case 'P2001':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record does not exist.',
          details: exception.meta ?? null,
        };

      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: `Unique constraint failed on field(s): ${this.formatTarget(
            exception.meta?.target,
          )}`,
          details: exception.meta ?? null,
        };

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Foreign key constraint failed.',
          details: exception.meta ?? null,
        };

      case 'P2004':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A database constraint failed on this operation.',
          details: exception.meta ?? null,
        };

      case 'P2011':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A required field cannot be null.',
          details: exception.meta ?? null,
        };

      case 'P2012':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A required value is missing.',
          details: exception.meta ?? null,
        };

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'The change would violate a required relation.',
          details: exception.meta ?? null,
        };

      case 'P2015':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'A related record could not be found.',
          details: exception.meta ?? null,
        };

      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Query interpretation error.',
          details: exception.meta ?? null,
        };

      case 'P2018':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'A required connected record was not found.',
          details: exception.meta ?? null,
        };

      case 'P2020':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'The provided value is out of range for the field type.',
          details: exception.meta ?? null,
        };

      case 'P2021':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'The table does not exist in the current database.',
          details: exception.meta ?? null,
        };

      case 'P2022':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'The column does not exist in the current database.',
          details: exception.meta ?? null,
        };

      case 'P2024':
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          error: 'Request Timeout',
          message: 'Timed out while acquiring a database connection.',
          details: exception.meta ?? null,
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record was not found.',
          details: exception.meta ?? null,
        };

      case 'P2033':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'The provided number does not fit into a 64-bit signed integer.',
          details: exception.meta ?? null,
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: `Unhandled Prisma error: ${exception.code}`,
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

    return 'unknown field';
  }
}
