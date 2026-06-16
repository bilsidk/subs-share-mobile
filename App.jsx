import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components';
import { initI18n } from './src/utils/i18n';
import { loadPricing } from './src/utils/helpers';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://3373520fddddc4a4b74ba3365b6f2b2a@o4511520125550592.ingest.us.sentry.io/4511520135577600',
  tracesSampleRate: 0.2,
});

export default Sentry.wrap(function App() {
  const [i18nReady, setI18nReady] = useState(false);
  useEffect(() => {
    Promise.all([initI18n(), loadPricing()]).then(() => setI18nReady(true));
  }, []);
  if (!i18nReady) return <View style={{ flex: 1, backgroundColor: '#0A0A0F' }} />;
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
});