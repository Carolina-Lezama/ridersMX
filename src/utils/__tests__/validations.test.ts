import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../validations';

describe('validación de correo electrónico', () => {
  it('acepta direcciones con formato válido', () => {
    expect(isValidEmail('rider@example.com')).toBe(true);
    expect(isValidEmail('rider.name+test@sub.example.mx')).toBe(true);
  });

  it('rechaza direcciones incompletas o con espacios', () => {
    expect(isValidEmail('rider.example.com')).toBe(false);
    expect(isValidEmail('rider@localhost')).toBe(false);
    expect(isValidEmail(' rider@example.com ')).toBe(false);
  });
});

describe('validación de contraseña', () => {
  it('requiere como mínimo la longitud configurada', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('123456')).toBe(true);
  });
});
