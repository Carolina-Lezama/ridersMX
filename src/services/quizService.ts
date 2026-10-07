import preguntasData from '../constants/quizQuestions.json';
import { PreguntaQuiz } from '../components/QuizModal'; 

/**
 * Calcula el día actual del año (de 1 a 365/366)
 */
const obtenerDiaDelAno = (fecha: Date): number => {
  const inicioDeAno = new Date(fecha.getFullYear(), 0, 0);
  const diferencia = fecha.getTime() - inicioDeAno.getTime();
  const unDiaEnMilisegundos = 1000 * 60 * 60 * 24;
  
  return Math.floor(diferencia / unDiaEnMilisegundos);
};

/**
 * Obtiene la pregunta del día basada en una rotación matemática.
 * No requiere internet ni llamadas al backend.
 */
export const getPreguntaDelDia = (): PreguntaQuiz => {
  const preguntas: PreguntaQuiz[] = preguntasData as PreguntaQuiz[];
  
  if (!preguntas || preguntas.length === 0) {
    throw new Error('El banco de preguntas está vacío.');
  }

  const hoy = new Date();
  const diaDelAno = obtenerDiaDelAno(hoy);
  
  // Lógica principal: índice = día % total_de_preguntas
  const indice = diaDelAno % preguntas.length;

  return preguntas[indice];
};