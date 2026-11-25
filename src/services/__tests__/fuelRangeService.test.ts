import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateFuelPlan,
  loadFuelBikeProfiles,
  saveFuelBikeProfiles,
  FuelBikeProfile,
} from '../fuelRangeService';

describe('fuelRangeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  });

  it('calcula autonomía con reserva y paradas antes de agotar el tanque', () => {
    const profile: FuelBikeProfile = {
      motorcycleId: 'moto-1',
      motorcycleName: 'Moto',
      tankCapacityLiters: 15,
      efficiencyKmPerLiter: 20,
      reservePercent: 20,
    };

    expect(calculateFuelPlan(500, profile)).toEqual({
      fullTankEquivalentCount: 2,
      recommendedStops: 2,
      safeRangePerTankKm: 240,
      fullRangePerTankKm: 300,
    });
    expect(calculateFuelPlan(200, profile).recommendedStops).toBe(0);
    expect(calculateFuelPlan(240, profile).recommendedStops).toBe(0);
    expect(calculateFuelPlan(241, profile).recommendedStops).toBe(1);
  });

  it('rechaza distancias que no se pueden planificar', () => {
    const profile: FuelBikeProfile = {
      motorcycleId: 'moto-1',
      motorcycleName: 'Moto',
      tankCapacityLiters: null,
      efficiencyKmPerLiter: null,
      reservePercent: 20,
    };

    expect(() => calculateFuelPlan(0, profile)).toThrow('La distancia de la ruta debe ser mayor que cero.');
    expect(() => calculateFuelPlan(100, profile)).toThrow('Configura la capacidad del tanque.');
  });

  it('guarda y carga los perfiles de combustible localmente por usuario', async () => {
    const profiles: FuelBikeProfile[] = [{
      motorcycleId: 'moto-1',
      motorcycleName: 'Moto',
      tankCapacityLiters: 15,
      efficiencyKmPerLiter: 20,
      reservePercent: 20,
    }];
    let storedValue: string | null = null;
    jest.mocked(AsyncStorage.getItem).mockImplementation(async () => storedValue);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
      storedValue = value;
    });

    await saveFuelBikeProfiles('user-1', profiles);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@ridersmx/fuel_profiles_v1/user-1',
      JSON.stringify(profiles),
    );
    await expect(loadFuelBikeProfiles('user-1')).resolves.toEqual(profiles);
  });
});
