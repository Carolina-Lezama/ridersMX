import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { supabase } from '../../../services/supabase';
import {
  cargarDiarioRutas,
  eliminarEntradaDiario,
  guardarEntradaDiario,
  type JournalEntry,
  type JournalEntryDraft,
} from '../../../services/routeJournalService';
import DiarioRutasScreen from '../DiarioRutasScreen';

jest.mock('../../../services/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
  },
}));

jest.mock('../../../services/routeJournalService', () => ({
  cargarDiarioRutas: jest.fn(),
  eliminarEntradaDiario: jest.fn(),
  guardarEntradaDiario: jest.fn(),
}));

jest.mock('../../../../assets/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../../../../assets/theme/theme').lightTheme,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  __esModule: true,
  default: { openURL: jest.fn() },
}));

const review = {
  id: 'bitacora-1',
  eventoId: 'evento-1',
  titulo: 'Ruta Sierra',
  destino: 'Mirador del Valle',
  fecha: '2026-11-20',
  distanciaKm: 120,
  calificacion: 5,
  comentario: null,
};

const crearEntrada = (draft: JournalEntryDraft, perfilId = 'rider-1'): JournalEntry => ({
  id: draft.id ?? 'diario-1',
  perfil_id: perfilId,
  bitacora_id: draft.bitacora_id,
  tipo_registro: draft.tipo_registro,
  nombre: draft.nombre,
  tipo_camino: draft.tipo_camino,
  ubicacion_url: draft.ubicacion_url,
  latitud: draft.latitud,
  longitud: draft.longitud,
  notas_asfalto: draft.notas_asfalto,
  notas_clima: draft.notas_clima,
  created_at: '2026-11-24T18:00:00.000Z',
});

const crearPunto = (
  id: string,
  tipo: Exclude<JournalEntry['tipo_registro'], 'ruta'>,
  nombre: string,
  camino: JournalEntry['tipo_camino'],
): JournalEntry => ({
  id,
  perfil_id: 'rider-1',
  bitacora_id: null,
  tipo_registro: tipo,
  nombre,
  tipo_camino: camino,
  ubicacion_url: null,
  latitud: null,
  longitud: null,
  notas_asfalto: null,
  notas_clima: null,
  created_at: '2026-11-24T18:00:00.000Z',
});

describe('DiarioRutasScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'rider-1' } } },
      error: null,
    } as never);
    jest.mocked(cargarDiarioRutas).mockResolvedValue({
      rutasRevisadas: [review],
      entradas: [],
    });
    jest.mocked(guardarEntradaDiario).mockImplementation(async (perfilId, draft) => crearEntrada(draft, perfilId));
    jest.mocked(eliminarEntradaDiario).mockResolvedValue(undefined);
    jest.mocked(Linking.openURL).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marca una ruta revisada como favorita, guarda su tipo y notas y permite filtrarla', async () => {
    const { getByLabelText, getByPlaceholderText, getByRole, getByText } = await render(
      <DiarioRutasScreen navigation={{ goBack: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText('Ruta Sierra')).toBeTruthy());
    await fireEvent.press(getByLabelText('Marcar Ruta Sierra como favorita'));

    await waitFor(() => expect(getByText('Editar ruta favorita')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Camino Curvas' }));
    await fireEvent.changeText(getByPlaceholderText('Baches, curvas, tramos en reparación...'), 'Pavimento en buen estado');
    await fireEvent.press(getByRole('button', { name: 'Guardar en diario' }));

    await waitFor(() => expect(getByText('120 km · 5/5 · Curvas')).toBeTruthy());
    expect(guardarEntradaDiario).toHaveBeenCalledTimes(2);
    expect(guardarEntradaDiario).toHaveBeenNthCalledWith(
      1,
      'rider-1',
      expect.objectContaining({
        tipo_registro: 'ruta',
        bitacora_id: 'bitacora-1',
        nombre: 'Mirador del Valle',
      }),
    );
    expect(guardarEntradaDiario).toHaveBeenNthCalledWith(
      2,
      'rider-1',
      expect.objectContaining({
        id: 'diario-1',
        tipo_camino: 'curvas',
        notas_asfalto: 'Pavimento en buen estado',
      }),
    );

    await fireEvent.press(getByRole('button', { name: 'Filtrar por Curvas' }));
    expect(getByText('Mirador del Valle')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Filtrar por Terracería' }));
    expect(getByText('No hay rutas favoritas clasificadas con este tipo de camino.')).toBeTruthy();
  });

  it('guarda un punto con coordenadas y abre su ubicación en Google Maps', async () => {
    const { getByLabelText, getByPlaceholderText, getByRole, getByText } = await render(
      <DiarioRutasScreen navigation={{ goBack: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText('Ruta Sierra')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Agregar punto de interés' }));
    await fireEvent.changeText(getByPlaceholderText('Nombre de ruta o punto'), 'Gasolinera confiable');
    await fireEvent.changeText(getByPlaceholderText('Latitud'), '19.4326');
    await fireEvent.changeText(getByPlaceholderText('Longitud'), '-99.1332');
    await fireEvent.press(getByRole('button', { name: 'Guardar en diario' }));

    await waitFor(() => expect(getByText('Gasolinera confiable')).toBeTruthy());
    expect(guardarEntradaDiario).toHaveBeenCalledWith(
      'rider-1',
      expect.objectContaining({
        tipo_registro: 'gasolinera',
        nombre: 'Gasolinera confiable',
        latitud: 19.4326,
        longitud: -99.1332,
      }),
    );

    await fireEvent.press(getByLabelText('Abrir ubicación de Gasolinera confiable en Google Maps'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=19.4326,-99.1332',
    ));
  });

  it('rechaza coordenadas fuera de rango antes de guardar', async () => {
    const { getByPlaceholderText, getByRole, getByText } = await render(
      <DiarioRutasScreen navigation={{ goBack: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText('Ruta Sierra')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Agregar punto de interés' }));
    await fireEvent.changeText(getByPlaceholderText('Nombre de ruta o punto'), 'Punto fuera de rango');
    await fireEvent.changeText(getByPlaceholderText('Latitud'), '91');
    await fireEvent.changeText(getByPlaceholderText('Longitud'), '0');
    await fireEvent.press(getByRole('button', { name: 'Guardar en diario' }));

    expect(getByText('Las coordenadas deben estar dentro de los rangos válidos de latitud y longitud.')).toBeTruthy();
    expect(guardarEntradaDiario).not.toHaveBeenCalled();
  });

  it('combina el filtro de tipo de punto con el de camino e incluye puntos sin clasificar', async () => {
    jest.mocked(cargarDiarioRutas).mockResolvedValue({
      rutasRevisadas: [],
      entradas: [
        crearPunto('gas-sin-camino', 'gasolinera', 'Gasolinera sin camino', null),
        crearPunto('gas-curvas', 'gasolinera', 'Gasolinera en curvas', 'curvas'),
        crearPunto('mirador-sin-camino', 'mirador', 'Mirador sin camino', null),
      ],
    });

    const { getByRole, getByText, queryByText } = await render(
      <DiarioRutasScreen navigation={{ goBack: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText('Gasolinera sin camino')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Filtrar puntos por Gasolinera' }));
    expect(getByText('Gasolinera sin camino')).toBeTruthy();
    expect(getByText('Gasolinera en curvas')).toBeTruthy();
    expect(queryByText('Mirador sin camino')).toBeNull();

    await fireEvent.press(getByRole('button', { name: 'Filtrar por Curvas' }));
    expect(getByText('Gasolinera en curvas')).toBeTruthy();
    expect(queryByText('Gasolinera sin camino')).toBeNull();

    await fireEvent.press(getByRole('button', { name: 'Filtrar puntos por Mirador' }));
    expect(getByText('No hay puntos de interés que coincidan con los filtros seleccionados.')).toBeTruthy();

    await fireEvent.press(getByRole('button', { name: 'Filtrar por Sin clasificar' }));
    expect(getByText('Mirador sin camino')).toBeTruthy();
    expect(queryByText('Gasolinera sin camino')).toBeNull();
  });
});
