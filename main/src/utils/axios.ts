 import axios from 'axios';
import { fetchAlarmSettingsDT } from 'src/store/apps/alarmsetting/alarmSettings';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';
import { useDispatch } from 'src/store/Store';

 export const BASE_URL = import.meta.env.VITE_API_BASE_URL;

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

 const axiosServices = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-BIOPEOPLETRACKING-API-KEY': import.meta.env.VITE_API_KEY,

    },
 });

 axiosServices.interceptors.request.use(request => {
   const ApplicationId = localStorage.getItem('applicationId');
 const levelPriority = localStorage.getItem('levelPriority');
  const accessToken = localStorage.getItem('token');
  // console.log(request)
  // console.log('Request : ', request);
  if (accessToken) {
    request.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (request.method === 'post' && levelPriority === 'System') {
    if (request.data instanceof FormData) {
  if (ApplicationId !== null) {
    request.data.append('ApplicationId', ApplicationId);
    // console.log('Appended ApplicationId to FormData');
  } else {
    console.error('ApplicationId is null');
  }
    } else if (
      request.headers['Content-Type'] === 'application/json' &&
      typeof request.data === 'string'
    ) {
      const dataObj = JSON.parse(request.data);
      dataObj.ApplicationId = ApplicationId;
      request.data = JSON.stringify(dataObj);
      // console.log('Updated JSON payload with ApplicationId', dataObj);
    } else if (typeof request.data === 'object' && request.data !== null) {
      request.data.ApplicationId = ApplicationId;
      // console.log('Updated object payload with ApplicationId', request.data);
    }
  }
  return request;
}, error => {
  return Promise.reject(error);
});
 
axiosServices.interceptors.response.use(
  response => {
    if (
      typeof response.data === 'string' &&
      response.headers['content-type'] &&
      response.headers['content-type'].includes('application/json')
    ) {
      try {
        response.data = JSON.parse(response.data);
      } catch (e) {
        // leave as is if parsing fails
      }
    }
    return response;
  },
  async error => {
          const dispatch = useDispatch();
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the request as retried to avoid infinite loops.
      try {
        const refreshToken = localStorage.getItem('refreshToken'); // Retrieve the stored refresh token.

        // Make a request to your auth server to refresh the token.
        const response = await axios.post(`${BASE_URL}/api/Auth/refresh/`, {
          refreshToken,
          headers: {
                    'X-API-KEY-TRACKING-PEOPLE': import.meta.env.VITE_API_KEY,
          }
        });
        const res = response.data.collection.data; // Extract the collection from the response.
        const { token } = response.data.collection.data; // Extract the new access and refresh tokens from the response.
        // console.log('New access token:', response);
        console.log("res: ", res);
        // Store the new access and refresh tokens.
        localStorage.setItem('token', token);
        // localStorage.setItem('refreshToken', newRefreshToken);
        // Update the header for the retried request
        originalRequest.headers['Authorization'] = `Bearer ${token}`;

        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Token refreshed successfully:', token);
                dispatch(fetchAlarmSettingsDT(defaultAlarmSettingFilter));
        // console.log('originalRequest: ', originalRequest);
        // dispatch(setTokenAvailable(true)); // Dispatch an action to update the token state in the store.
        return axiosServices(originalRequest); // Retry the original request with the new access token.
      } catch (refreshError) {
        // Handle refresh token errors by clearing stored tokens and redirecting to the login page.
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        // localStorage.removeItem('refreshToken');
          if (onSessionExpired) onSessionExpired();
        // dispatch(setTokenAvailable(false)); // Dispatch an action to update the token state in the store.
        // dispatch(setSession("expired"))
        // window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
        // 🚨 Handle 403 Forbidden by redirecting to Main Menu
    // if (error.response?.status === 403) {
    //   window.location.href = '/'; // Adjust route as needed
    //   return Promise.reject(error); // still reject in case you want to catch it
    // }
    return Promise.reject(error); // For all other errors, return the error as is.
  }
);
 
 export default axiosServices;
 