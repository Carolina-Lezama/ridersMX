import preguntasData from '../../constants/quizQuestions.json';
import { getPreguntaDelDia } from '../quizService';

describe('pregunta del día', () => {
  it('avanza por fecha de calendario incluso al cruzar el cambio de horario estacional', () => {
    const preguntaDel8 = getPreguntaDelDia(new Date(2026, 2, 8));
    const preguntaDel9 = getPreguntaDelDia(new Date(2026, 2, 9));

    const preguntas = preguntasData as Array<{ id: string }>;
    const indiceDel8 = preguntas.findIndex(({ id }) => id === preguntaDel8.id);
    const indiceDel9 = preguntas.findIndex(({ id }) => id === preguntaDel9.id);

    expect(indiceDel9).toBe((indiceDel8 + 1) % preguntas.length);
  });
});
