import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initI18n } from './src/utils/i18n';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://3373520fddddc4a4b74ba3365b6f2b2a@o4511520125550592.ingest.us.sentry.io/4511520135577600',
  tracesSampleRate: 1.0,
});

export default Sentry.wrap(function App() {
  const [i18nReady, setI18nReady] = useState(false);
  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);
  if (!i18nReady) return <View style={{ flex: 1, backgroundColor: '#0A0A0F' }} />;
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
});