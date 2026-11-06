import { validate } from 'class-validator';

import { IsPastDate } from './fecha-pasada.decorator';

class BirthDateDto {
  @IsPastDate()
  value!: string;
}

describe('IsPastDate', () => {
  it('accepts a date before today', async () => {
    const dto = new BirthDateDto();
    dto.value = '1990-01-01';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects today and future dates', async () => {
    const dto = new BirthDateDto();
    dto.value = new Date().toISOString().slice(0, 10);

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
