import {
  convertirNumeroOpcional,
  normalizarNumeroDecimal,
  obtenerFechaEvento,
  obtenerFechaRecordatorioEvento,
} from '../eventoNotifications';

describe('parseo de fecha y hora de eventos', () => {
  it('interpreta formatos de 24 horas y de 12 horas en español', () => {
    expect(obtenerFechaEvento('2026-11-02', '18:45')?.getHours()).toBe(18);
    expect(obtenerFechaEvento('2026-11-02', '6:45 p. m.')?.getHours()).toBe(18);
    expect(obtenerFechaEvento('2026-11-02', '12:15 a. m.')?.getHours()).toBe(0);
  });

  it('rechaza fechas y horas inexistentes', () => {
    expect(obtenerFechaEvento('2026-02-30', '10:00')).toBeNull();
    expect(obtenerFechaEvento('2026-11-02', '25:00')).toBeNull();
    expect(obtenerFechaEvento('fecha', 'hora')).toBeNull();
  });

  it('programa el recordatorio 30 minutos antes en hora local', () => {
    const reminder = obtenerFechaRecordatorioEvento('2026-11-02', '10:15 a. m.');
    expect(reminder?.getHours()).toBe(9);
    expect(reminder?.getMinutes()).toBe(45);
  });
});

describe('validación de números opcionales del formulario', () => {
  it('permite decimales y elimina caracteres no numéricos', () => {
    expect(normalizarNumeroDecimal('1a2.5.8')).toBe('12.58');
    expect(convertirNumeroOpcional('12.5', 'Distancia')).toBe(12.5);
    expect(convertirNumeroOpcional('', 'Distancia')).toBeNull();
  });

  it('rechaza valores negativos o no numéricos', () => {
    expect(() => convertirNumeroOpcional('-1', 'Distancia')).toThrow('Distancia');
    expect(() => convertirNumeroOpcional('abc', 'Distancia')).toThrow('Distancia');
  });
});
