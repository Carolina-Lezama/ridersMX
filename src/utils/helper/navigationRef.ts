// navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';

type RootParamList = Record<string, object | undefined>;

export const navigationRef = createNavigationContainerRef<RootParamList>();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}