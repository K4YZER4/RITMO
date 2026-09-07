import { BadRequestException } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';

import { validationMessage } from '../exception/validation-message';
import { AppValidationPipe } from './app-validation.pipe';

class TestDto {
  @IsEmail(
    {},
    {
      message: validationMessage('INVALID_EMAIL', 'El correo no tiene un formato válido.'),
    },
  )
  @IsNotEmpty({
    message: validationMessage('REQUIRED_EMAIL', 'El correo es obligatorio.'),
  })
  correo!: string;
}

describe('AppValidationPipe', () => {
  const pipe = new AppValidationPipe();

  it('retorna INVALID_EMAIL cuando el correo tiene formato inválido', async () => {
    try {
      await pipe.transform({ correo: 'correo_invalido' }, { type: 'body', metatype: TestDto });

      fail('El pipe debió lanzar una excepción');
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      expect(error.getResponse()).toEqual({
        code: 'INVALID_EMAIL',
        message: 'El correo no tiene un formato válido.',
        statusCode: 400,
        details: { field: 'correo' },
      });
    }
  });

  it('retorna REQUIRED_EMAIL cuando el correo está vacío', async () => {
    try {
      await pipe.transform({ correo: '' }, { type: 'body', metatype: TestDto });

      fail('El pipe debió lanzar una excepción');
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      expect(error.getResponse()).toEqual({
        code: 'REQUIRED_EMAIL',
        message: 'El correo es obligatorio.',
        statusCode: 400,
        details: { field: 'correo' },
      });
    }
  });

  it('deja pasar un correo válido', async () => {
    const result: TestDto = (await pipe.transform(
      { correo: 'a@b.com' },
      { type: 'body', metatype: TestDto },
    )) as TestDto;

    expect(result).toEqual({ correo: 'a@b.com' });
  });
});
