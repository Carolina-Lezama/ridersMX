import AsyncStorage from '@react-native-async-storage/async-storage';

const getSelectionKey = (userId: string) => `@moto_principal_${userId}`;

export const getSelectedMotorcycleId = (userId: string) =>
  AsyncStorage.getItem(getSelectionKey(userId));

export const setSelectedMotorcycleId = (userId: string, motorcycleId: string) =>
  AsyncStorage.setItem(getSelectionKey(userId), motorcycleId);

export const clearSelectedMotorcycleId = (userId: string) =>
  AsyncStorage.removeItem(getSelectionKey(userId));
