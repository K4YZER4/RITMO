import { validateSync } from 'class-validator';
import { IsTodayOrFutureDate } from './fecha-mayor-a-hoy.decorator';

class FechaDto {
  @IsTodayOrFutureDate()
  fecha!: string;
}

describe('IsTodayOrFutureDate', () => {
  it('acepta hoy', () => {
    const dto = new FechaDto();
    dto.fecha = new Date().toISOString().slice(0, 10);
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('acepta una fecha futura', () => {
    const dto = new FechaDto();
    dto.fecha = '2999-12-31';
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza una fecha pasada', () => {
    const dto = new FechaDto();
    dto.fecha = '1990-01-01';
    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isTodayOrFutureDate).toMatch(/mayor o igual a la fecha actual/);
  });

  it('rechaza valores vacíos', () => {
    const dto = new FechaDto();
    dto.fecha = '';
    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
  });

  it('rechaza valores no string', () => {
    const dto = new FechaDto();
    dto.fecha = 123 as unknown as string;
    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
  });

  it('rechaza un formato de fecha inválido', () => {
    const dto = new FechaDto();
    dto.fecha = '01/01/2030';
    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
  });
});
