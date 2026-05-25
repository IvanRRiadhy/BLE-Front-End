import { Outlet } from 'react-router';
import LoadingBar from '../../LoadingBar';
import { Toaster } from 'react-hot-toast';

const BlankLayout = () => (
  <>
    <LoadingBar />
    <Outlet />
    <Toaster
      position="top-center"
      containerStyle={{
        fontSize: '1.15rem',
        padding: '16px 24px',
        minWidth: '500px',
      }}
      toastOptions={{
        success: {
          style: {
            background: 'darkgreen',
            color: '#fff',
          },
        },
        error: {
          style: {
            background: 'darkred',
            color: '#fff',
          },
        },
      }}
    />
  </>
);

export default BlankLayout;
