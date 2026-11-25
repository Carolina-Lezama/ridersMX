import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRE_RIDE_CHECKLIST_STORAGE_KEY = '@ridersmx/pre_ride_checklist_v1';

export const PRE_RIDE_CHECKLIST_SECTIONS = [
  {
    id: 'tires',
    title: 'T — Llantas y ruedas',
    items: [
      { id: 'tire-pressure', label: 'Presión de llantas', detail: 'Revisa la presión en frío según el manual.' },
      { id: 'tire-condition', label: 'Condición de llantas', detail: 'Busca desgaste, grietas, objetos incrustados o deformaciones.' },
      { id: 'wheels', label: 'Ruedas', detail: 'Comprueba que no haya daños ni juego anormal.' },
    ],
  },
  {
    id: 'controls',
    title: 'C — Controles',
    items: [
      { id: 'throttle', label: 'Acelerador', detail: 'Debe girar libremente y regresar al soltarlo.' },
      { id: 'levers', label: 'Manetas y cables', detail: 'Revisa que estén firmes, sin daños y se muevan con suavidad.' },
      { id: 'brakes', label: 'Frenos', detail: 'Verifica el tacto y funcionamiento de ambos frenos.' },
    ],
  },
  {
    id: 'lights',
    title: 'L — Luces y sistema eléctrico',
    items: [
      { id: 'headlight', label: 'Faro y luz trasera', detail: 'Confirma que enciendan correctamente.' },
      { id: 'brake-light', label: 'Luz de freno', detail: 'Prueba la luz con ambos frenos.' },
      { id: 'signals-horn', label: 'Direccionales y claxon', detail: 'Comprueba que funcionen antes de salir.' },
    ],
  },
  {
    id: 'oil',
    title: 'O — Aceite y otros fluidos',
    items: [
      { id: 'engine-oil', label: 'Aceite del motor', detail: 'Verifica el nivel con el procedimiento del fabricante.' },
      { id: 'brake-fluid', label: 'Líquido de frenos', detail: 'Revisa el nivel y busca fugas.' },
      { id: 'fuel', label: 'Combustible', detail: 'Planea la ruta y confirma que tengas suficiente combustible.' },
    ],
  },
  {
    id: 'chassis',
    title: 'C — Chasis',
    items: [
      { id: 'chain', label: 'Cadena o transmisión', detail: 'Comprueba tensión, lubricación y desgaste según el manual.' },
      { id: 'suspension', label: 'Suspensión', detail: 'Busca fugas o daños visibles.' },
      { id: 'fasteners', label: 'Sujeciones', detail: 'Revisa que no haya piezas o accesorios sueltos.' },
    ],
  },
  {
    id: 'stands',
    title: 'S — Soportes y equipo',
    items: [
      { id: 'stands', label: 'Pata lateral y soporte central', detail: 'Comprueba que se muevan y aseguren correctamente.' },
      { id: 'tools', label: 'Herramientas y equipo', detail: 'Lleva herramientas básicas y el equipo de protección necesario.' },
    ],
  },
] as const;

export type PreRideChecklistItemId =
  (typeof PRE_RIDE_CHECKLIST_SECTIONS)[number]['items'][number]['id'];
export type PreRideChecklistProgress = Partial<Record<PreRideChecklistItemId, boolean>>;

const checklistItemIds = new Set<string>(
  PRE_RIDE_CHECKLIST_SECTIONS.flatMap(section => section.items.map(item => item.id)),
);

export async function loadPreRideChecklist(): Promise<PreRideChecklistProgress> {
  const savedProgress = await AsyncStorage.getItem(PRE_RIDE_CHECKLIST_STORAGE_KEY);
  if (savedProgress === null) return {};

  const parsed: unknown = JSON.parse(savedProgress);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('El progreso guardado de la checklist no tiene un formato válido.');
  }

  const progress: PreRideChecklistProgress = {};
  for (const [id, checked] of Object.entries(parsed)) {
    if (checklistItemIds.has(id) && typeof checked === 'boolean') {
      progress[id as PreRideChecklistItemId] = checked;
    }
  }
  return progress;
}

export async function savePreRideChecklist(progress: PreRideChecklistProgress): Promise<void> {
  await AsyncStorage.setItem(PRE_RIDE_CHECKLIST_STORAGE_KEY, JSON.stringify(progress));
}
