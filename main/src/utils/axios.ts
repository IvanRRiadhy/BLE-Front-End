import axios, { AxiosInstance } from 'axios';
import { getConfig } from 'src/config';


// ✔ USE THIS INSTEAD
export let BASE_URL = '';
export let CDN_URL = '';
export let API_ENGINE_URL = '';

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

// const axiosServices = axios.create({
//   headers: {
//     'Content-Type': 'application/json',
//     'X-BIOPEOPLETRACKING-API-KEY': import.meta.env.VITE_API_KEY,
//   },
// });

// ✔ Set BASE_URL only after config.json is loaded
export function initializeAxiosBaseURL() {
  const config = getConfig();
  BASE_URL = config.API_BASE_URL;
  CDN_URL = config.CDN_URL;
  API_ENGINE_URL = config.API_ENGINE_URL;

  const instances = [axiosServices, axiosCdn, axiosEngine];
  instances.forEach((instance) => {
    instance.defaults.baseURL = instance === axiosServices ? BASE_URL : (instance === axiosCdn ? CDN_URL : API_ENGINE_URL);
    instance.defaults.headers.common['X-BIOPEOPLETRACKING-API-KEY'] = config.API_KEY;
  });
}

type AxiosServiceOptions = {
  getBaseUrl: () => string;
};

export const axiosServices = createAxiosService({
  getBaseUrl: () => BASE_URL,
});

export const axiosCdn = createAxiosService({
  getBaseUrl: () => CDN_URL,
});

export const axiosEngine = createAxiosService({
  getBaseUrl: () => API_ENGINE_URL,
});

function createAxiosService({ getBaseUrl }: AxiosServiceOptions): AxiosInstance {
  const instance = axios.create({
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ✅ Set baseURL and API Key dynamically (after config.json loaded)
  instance.interceptors.request.use(request => {
    const config = getConfig();
    request.baseURL = getBaseUrl();
    request.headers['X-BIOPEOPLETRACKING-API-KEY'] = config.API_KEY;
    
    let ApplicationId: string | null = null;
    const levelPriority = localStorage.getItem('levelPriority');
    if(levelPriority !== 'System') {
      ApplicationId = localStorage.getItem('applicationId');
    }
    const accessToken = localStorage.getItem('token');

    if (accessToken) {
      request.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (request.method === 'post' && levelPriority === 'System') {
      if (request.data instanceof FormData) {
        if (ApplicationId){ 
          console.log("Appending ApplicationId to FormData: ", ApplicationId, levelPriority);
          request.data.append('ApplicationId', ApplicationId)};
      } else if (
        request.headers['Content-Type'] === 'application/json' &&
        typeof request.data === 'string'
      ) {
        const dataObj = JSON.parse(request.data);
        if(ApplicationId){
        console.log("Appending ApplicationId to JSON string data: ", ApplicationId, levelPriority);
        
        dataObj.ApplicationId = ApplicationId;
        }
        request.data = JSON.stringify(dataObj);
      } else if (typeof request.data === 'object' && request.data !== null) {
        if(ApplicationId) {
        console.log("Appending ApplicationId to request.data: ", ApplicationId, levelPriority);
        request.data.ApplicationId = ApplicationId;
        }
      }
    }

    return request;
  });

  instance.interceptors.response.use(
    response => {
      if (
        typeof response.data === 'string' &&
        response.headers['content-type']?.includes('application/json')
      ) {
        try {
          response.data = JSON.parse(response.data);
        } catch {}
      }
      return response;
    },
    async error => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');

          const response = await axios.post(
            `${getBaseUrl()}/api/Auth/refresh/`,
            { refreshToken },
            {
              headers: {
                'X-BIOPEOPLETRACKING-API-KEY': getConfig().API_KEY,
              },
            }
          );

          const { token } = response.data.collection.data;

          localStorage.setItem('token', token);
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          return instance(originalRequest);
        } catch (err) {
          localStorage.removeItem('token');
          if (onSessionExpired) onSessionExpired();
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
 
 export default axiosServices;
 