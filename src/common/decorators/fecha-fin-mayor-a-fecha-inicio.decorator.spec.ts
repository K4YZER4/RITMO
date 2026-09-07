import { validateSync } from 'class-validator';
import { IsAfterOrEqualTo } from './fecha-fin-mayor-a-fecha-inicio.decorator';

class FechaDto {
  @IsAfterOrEqualTo('fechaInicio', {
    message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
  })
  fechaFin!: string;

  fechaInicio!: string;
}

describe('IsAfterOrEqualTo', () => {
  it('acepta fechas iguales', () => {
    const dto = new FechaDto();

    dto.fechaInicio = '2023-01-01';
    dto.fechaFin = '2023-01-01';

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('acepta fecha fin mayor a fecha inicio', () => {
    const dto = new FechaDto();

    dto.fechaInicio = '2023-01-01';
    dto.fechaFin = '2023-01-02';

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza fecha fin menor a fecha inicio', () => {
    const dto = new FechaDto();

    dto.fechaInicio = '2023-01-02';
    dto.fechaFin = '2023-01-01';

    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isAfterOrEqualTo');
    expect(errors[0].constraints?.isAfterOrEqualTo).toBe(
      'La fecha de fin debe ser mayor o igual a la fecha de inicio',
    );
  });
});
