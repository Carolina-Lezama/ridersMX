import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './assets/theme/ThemeContext';
import { useAppTimeTracker } from './src/utils/hooks/useAppTimeTracker';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  useAppTimeTracker();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem('@ya_vio_onboarding');
        setIsFirstLaunch(value === null);
      } catch (error) {
        setIsFirstLaunch(false);
      }
    };
    checkFirstLaunch();
  }, []);

  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootNavigator isFirstLaunch={isFirstLaunch} />
    </ThemeProvider>
  );
}