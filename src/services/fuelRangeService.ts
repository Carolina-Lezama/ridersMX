import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FuelBikeProfile {
  motorcycleId: string;
  motorcycleName: string;
  tankCapacityLiters: number | null;
  efficiencyKmPerLiter: number | null;
  reservePercent: number;
}

export interface FuelPlan {
  fullTankEquivalentCount: number;
  recommendedStops: number;
  safeRangePerTankKm: number;
  fullRangePerTankKm: number;
}

export const DEFAULT_FUEL_RESERVE_PERCENT = 20;

const storageKey = (userId: string) => `@ridersmx/fuel_profiles_v1/${userId}`;

export async function loadFuelBikeProfiles(userId: string): Promise<FuelBikeProfile[]> {
  const storedProfiles = await AsyncStorage.getItem(storageKey(userId));
  if (storedProfiles === null) return [];

  const parsed: unknown = JSON.parse(storedProfiles);
  if (!Array.isArray(parsed)) {
    throw new Error('La configuración local de combustible no tiene un formato válido.');
  }

  return parsed.map((profile): FuelBikeProfile => {
    if (
      typeof profile !== 'object'
      || profile === null
      || typeof profile.motorcycleId !== 'string'
      || typeof profile.motorcycleName !== 'string'
      || (profile.tankCapacityLiters !== null && typeof profile.tankCapacityLiters !== 'number')
      || (profile.efficiencyKmPerLiter !== null && typeof profile.efficiencyKmPerLiter !== 'number')
      || typeof profile.reservePercent !== 'number'
    ) {
      throw new Error('La configuración local de una motocicleta está incompleta o dañada.');
    }
    return profile;
  });
}

export async function saveFuelBikeProfiles(userId: string, profiles: FuelBikeProfile[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(profiles));
}

export function calculateFuelPlan(routeDistanceKm: number, profile: FuelBikeProfile): FuelPlan {
  const tankCapacity = profile.tankCapacityLiters;
  const efficiency = profile.efficiencyKmPerLiter;
  const reserve = profile.reservePercent;

  if (!Number.isFinite(routeDistanceKm) || routeDistanceKm <= 0) {
    throw new Error('La distancia de la ruta debe ser mayor que cero.');
  }
  if (tankCapacity === null || !Number.isFinite(tankCapacity) || tankCapacity <= 0) {
    throw new Error('Configura la capacidad del tanque.');
  }
  if (efficiency === null || !Number.isFinite(efficiency) || efficiency <= 0) {
    throw new Error('Configura el rendimiento promedio.');
  }
  if (!Number.isFinite(reserve) || reserve < 0 || reserve >= 100) {
    throw new Error('El margen de reserva debe ser de 0 a menos de 100%.');
  }

  const fullRangePerTankKm = tankCapacity * efficiency;
  const safeRangePerTankKm = fullRangePerTankKm * (1 - reserve / 100);
  return {
    fullTankEquivalentCount: Math.ceil(routeDistanceKm / fullRangePerTankKm),
    recommendedStops: Math.max(0, Math.ceil(routeDistanceKm / safeRangePerTankKm) - 1),
    safeRangePerTankKm,
    fullRangePerTankKm,
  };
}
