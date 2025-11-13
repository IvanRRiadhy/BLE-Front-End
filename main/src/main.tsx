import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import './_mockApis';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={<Spinner />} persistor={persistor}>
      {/* ✅ Tambahkan React Query Provider di luar Suspense */}
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<Spinner />}>
          <App />
        </Suspense>

        {/* (Optional) Devtools: bisa dibuka di pojok kanan bawah */}
        {/* <ReactQueryDevtools initialIsOpen={false}/> */}
      </QueryClientProvider>
    </PersistGate>
  </Provider>,
);
