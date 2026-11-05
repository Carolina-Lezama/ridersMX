import React from 'react';
import LoginScreen from '../../auth/LoginScreen';

export default function AgregarCuentaScreen(props: any) {
  return <LoginScreen {...props} addingAccount />;
}