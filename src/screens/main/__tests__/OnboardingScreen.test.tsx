import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../OnboardingScreen';

describe('flujo de onboarding', () => {
  it.each([
    { hasSession: true, expectedRoute: 'MainApp' },
    { hasSession: false, expectedRoute: 'Login' },
  ])('continúa según el estado de sesión', async ({ hasSession, expectedRoute }) => {
    const navigation = { replace: jest.fn() };
    const { getByText } = await render(
      <OnboardingScreen
        navigation={navigation}
        route={{ params: { hasSession } }}
      />,
    );

    await fireEvent.press(getByText('Saltar'));
    await fireEvent.press(getByText('Empezar'));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(expectedRoute);
    });
  });
});
