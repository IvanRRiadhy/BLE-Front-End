import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom/client';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/Store';
import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import './_mockApis';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={<Spinner />} persistor={persistor}>
      <Suspense fallback={<Spinner />}>
        <App />
      </Suspense>
    </PersistGate>
  </Provider>,
);