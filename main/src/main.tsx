import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { loadRuntimeConfig } from './config';
import { initializeAxiosBaseURL } from './utils/axios';

import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import './_mockApis';
import { initializeMQTTConfig, updateMQTTBrokerURL } from './store/apps/tracking/MQTT';
import { initializeEngineConfig } from './store/apps/crud/engine';
import { initializeNTFYConfig } from './store/apps/tracking/NTFY';

// ✅ Buat QueryClient instance global
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // tidak refetch saat window aktif kembali
      retry: 2, // otomatis retry 2x jika gagal
      staleTime: 5_000, // data dianggap fresh 1 menit
      gcTime: 5 * 60_000, // garbage collect cache setelah 5 menit
    },
  },
});

async function startApp() {
  // 🧹 Clean up large localStorage entry before starting (Freeing space for tokens)
  if (localStorage.getItem('persist:root')) {
    console.log('Cleaning up large Redux state from localStorage...');
    localStorage.removeItem('persist:root');
  }

  await loadRuntimeConfig();
  initializeAxiosBaseURL();
  initializeMQTTConfig();
  updateMQTTBrokerURL();
  initializeEngineConfig();
  initializeNTFYConfig();
  // 🟩 3. THEN render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <Provider store={store}>
      <PersistGate loading={<Spinner />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<Spinner />}>
            <App />
          </Suspense>
        </QueryClientProvider>
      </PersistGate>
    </Provider>,
  );
}

// 🟩 Start the application
startApp();
