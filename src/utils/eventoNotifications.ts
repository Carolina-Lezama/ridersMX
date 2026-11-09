export const obtenerFechaEvento = (fecha: string, hora: string): Date | null => {
  const fechaValida = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const horaValida = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?$/i.exec(hora.trim());
  if (!fechaValida || !horaValida) return null;

  const [, anioTexto, mesTexto, diaTexto] = fechaValida;
  const [, horaTexto, minutoTexto, periodo] = horaValida;
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  let horas = Number(horaTexto);
  const minutos = Number(minutoTexto);

  if (mes < 1 || mes > 12 || minutos > 59) return null;
  if (periodo) {
    if (horas < 1 || horas > 12) return null;
    if (periodo.toLowerCase() === 'p' && horas < 12) horas += 12;
    if (periodo.toLowerCase() === 'a' && horas === 12) horas = 0;
  } else if (horas > 23) {
    return null;
  }

  const fechaEvento = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
  if (
    fechaEvento.getFullYear() !== anio
    || fechaEvento.getMonth() !== mes - 1
    || fechaEvento.getDate() !== dia
  ) {
    return null;
  }

  return fechaEvento;
};

export const obtenerFechaRecordatorioEvento = (
  fecha: string,
  hora: string,
  minutosAnticipacion = 30,
): Date | null => {
  const fechaEvento = obtenerFechaEvento(fecha, hora);
  if (!fechaEvento || !Number.isFinite(minutosAnticipacion) || minutosAnticipacion < 0) return null;

  return new Date(fechaEvento.getTime() - minutosAnticipacion * 60_000);
};

export const normalizarNumeroDecimal = (valor: string): string => {
  const digitosYPunto = valor.replace(/[^\d.]/g, '');
  const primerPunto = digitosYPunto.indexOf('.');
  if (primerPunto === -1) return digitosYPunto;

  return `${digitosYPunto.slice(0, primerPunto + 1)}${digitosYPunto.slice(primerPunto + 1).replace(/\./g, '')}`;
};

export const convertirNumeroOpcional = (valor: string, etiqueta: string): number | null => {
  if (!valor.trim()) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${etiqueta} debe ser un número igual o mayor que cero.`);
  }
  return numero;
};
