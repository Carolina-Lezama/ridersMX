import preguntasData from '../constants/quizQuestions.json';
import { PreguntaQuiz } from '../components/QuizModal'; 

/**
 * Calcula el día actual del año (de 1 a 365/366)
 */
const obtenerDiaDelAno = (fecha: Date): number => {
  const inicioDeAnoUTC = Date.UTC(fecha.getFullYear(), 0, 1);
  const fechaUTC = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const unDiaEnMilisegundos = 1000 * 60 * 60 * 24;

  return Math.floor((fechaUTC - inicioDeAnoUTC) / unDiaEnMilisegundos) + 1;
};

/**
 * Obtiene la pregunta del día basada en una rotación matemática.
 * No requiere internet ni llamadas al backend.
 */
export const getPreguntaDelDia = (fecha: Date = new Date()): PreguntaQuiz => {
  const preguntas: PreguntaQuiz[] = preguntasData as PreguntaQuiz[];
  
  if (!preguntas || preguntas.length === 0) {
    throw new Error('El banco de preguntas está vacío.');
  }

  const diaDelAno = obtenerDiaDelAno(fecha);
  
  const indice = (diaDelAno - 1) % preguntas.length;

  return preguntas[indice];
};