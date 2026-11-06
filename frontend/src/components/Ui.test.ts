import { describe, expect, it } from 'vitest';

import { fullName } from './Ui';

describe('fullName', () => {
  it('joins the first and last name', () => {
    expect(fullName({ nombre: 'Ana', apellidoPaterno: 'Ritmo' })).toBe('Ana Ritmo');
  });
});
