import axios, { AxiosInstance } from 'axios';
import { getConfig } from 'src/config';

// Global withCredentials removed to prevent CORS issues on non-auth endpoints
// axios.defaults.withCredentials = false;

// ✔ USE THIS INSTEAD
export let BASE_URL = '';
export let CDN_URL = '';
export let API_ENGINE_URL = '';

// 🧠 In-Memory RAM storage (pure variable, no localStorage persistence)
let accessToken: string | null = null;
let authResponse: any = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const setAuthResponse = (data: any) => {
  authResponse = data;
};

export const getAuthResponse = (): any => {
  return authResponse;
};

export const clearSession = () => {
  accessToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('response');
  localStorage.removeItem('levelPriority');
  localStorage.removeItem('applicationId');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('fullName');
  localStorage.removeItem('groupName');
  localStorage.removeItem('accessibleBuildings');
};

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

// Shared promise to prevent concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const config = getConfig();
      const rawBaseUrl = config.API_BASE_URL || '';
      const baseUrl = rawBaseUrl.replace(/\/+$/, '');
      const refreshUrl = baseUrl ? `${baseUrl}/api/Auth/refresh` : '/api/Auth/refresh';

      let response;
      try {
        // Body refreshToken dihilangkan karena dikirim via HttpOnly cookie
        response = await axios.post(
          refreshUrl,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-BIOPEOPLETRACKING-API-KEY': config.API_KEY,
            },
          }
        );
      } catch (postErr: any) {
        // Jika 404, coba dengan trailing slash
        if (postErr?.response?.status === 404) {
          response = await axios.post(
            `${refreshUrl}/`,
            {},
            {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json',
                'X-BIOPEOPLETRACKING-API-KEY': config.API_KEY,
              },
            }
          );
        } else {
          throw postErr;
        }
      }

      const token =
        response.data?.collection?.data?.token ??
        response.data?.data?.token ??
        response.data?.token;

      if (!token) {
        throw new Error('Refresh token response missing access token');
      }

      setAccessToken(token);
      const resData = response.data?.collection?.data ?? response.data?.data ?? response.data;
      setAuthResponse(resData);
      return token;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        clearSession();
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const logoutUser = async (): Promise<void> => {
  try {
    const config = getConfig();
    const rawBaseUrl = config.API_BASE_URL || '';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const logoutUrl = baseUrl ? `${baseUrl}/api/Auth/logout` : '/api/Auth/logout';

    try {
      await axios.post(
        logoutUrl,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-BIOPEOPLETRACKING-API-KEY': config.API_KEY,
          },
        }
      );
    } catch (postErr: any) {
      if (postErr?.response?.status === 404) {
        await axios.post(
          `${logoutUrl}/`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-BIOPEOPLETRACKING-API-KEY': config.API_KEY,
            },
          }
        );
      } else {
        throw postErr;
      }
    }
  } catch (err) {
    console.error('Logout API error:', err);
  } finally {
    clearSession();
    // Targeted localStorage cleanup: preserve Remember this Device items
    const itemsToKeep = [
      'rememberedAdminUsername',
      'rememberedVisitorUsername',
      'rememberMePreference',
      'rememberedLoginMode',
    ];
    Object.keys(localStorage).forEach((key) => {
      if (!itemsToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
    window.location.href = '/auth/login';
  }
};

// Fallback backend URL jika di config.json sengaja dikosongkan ("")
export const DEFAULT_BACKEND_URL = 'http://192.168.1.96:5000';

// ✔ Set BASE_URL only after config.json is loaded
export function initializeAxiosBaseURL() {
  const config = getConfig();
  // Jika config.API_BASE_URL kosong, gunakan string kosong untuk API calls (relative proxy)
  // dan BASE_URL fallback ke DEFAULT_BACKEND_URL untuk resource eksternal seperti gambar
  BASE_URL = config.API_BASE_URL || DEFAULT_BACKEND_URL;
  CDN_URL = config.CDN_URL || BASE_URL;
  API_ENGINE_URL = config.API_ENGINE_URL;

  const instances = [axiosServices, axiosCdn, axiosEngine];
  instances.forEach((instance) => {
    instance.defaults.baseURL = instance === axiosServices ? (config.API_BASE_URL || '') : (instance === axiosCdn ? CDN_URL : API_ENGINE_URL);
    instance.defaults.headers.common['X-BIOPEOPLETRACKING-API-KEY'] = config.API_KEY;
  });
}

type AxiosServiceOptions = {
  getBaseUrl: () => string;
};

export const axiosServices = createAxiosService({
  getBaseUrl: () => getConfig().API_BASE_URL || '',
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
  instance.interceptors.request.use(async request => {
    const config = getConfig();
    request.baseURL = getBaseUrl();
    request.headers['X-BIOPEOPLETRACKING-API-KEY'] = config.API_KEY;
    
    let ApplicationId: string | null = null;
    const levelPriority = localStorage.getItem('levelPriority');
    if (levelPriority !== 'System') {
      ApplicationId = localStorage.getItem('applicationId');
    }

    const isAuthUrl =
      request.url?.includes('/api/Auth/login') ||
      request.url?.includes('/api/Auth/refresh') ||
      request.url?.includes('/api/Auth/altcha') ||
      request.url?.includes('/api/Auth/forgot-password') ||
      request.url?.includes('/api/Auth/reset-password') ||
      request.url?.includes('/api/Auth/confirm-account');

    // Only attach credentials to auth URLs to avoid CORS errors on other endpoints
    if (isAuthUrl) {
      request.withCredentials = true;
    }

    const currentToken = getAccessToken();
    const hasSession = !!localStorage.getItem('levelPriority');

    if (!currentToken && !isAuthUrl && hasSession) {
      try {
        const token = await refreshAccessToken();
        if (token) {
          if (typeof request.headers?.set === 'function') {
            request.headers.set('Authorization', `Bearer ${token}`);
          } else {
            request.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (err) {
        if (onSessionExpired) onSessionExpired();
        return Promise.reject(err);
      }
    } else if (currentToken) {
      if (typeof request.headers?.set === 'function') {
        request.headers.set('Authorization', `Bearer ${currentToken}`);
      } else {
        request.headers['Authorization'] = `Bearer ${currentToken}`;
      }
    }

    if (request.method === 'post' && levelPriority === 'System') {
      if (request.data instanceof FormData) {
        if (ApplicationId) { 
          console.log("Appending ApplicationId to FormData: ", ApplicationId, levelPriority);
          request.data.append('ApplicationId', ApplicationId);
        }
      } else if (
        request.headers['Content-Type'] === 'application/json' &&
        typeof request.data === 'string'
      ) {
        const dataObj = JSON.parse(request.data);
        if (ApplicationId) {
          console.log("Appending ApplicationId to JSON string data: ", ApplicationId, levelPriority);
          dataObj.ApplicationId = ApplicationId;
        }
        request.data = JSON.stringify(dataObj);
      } else if (typeof request.data === 'object' && request.data !== null) {
        if (ApplicationId) {
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

      const isAuthUrl =
        originalRequest?.url?.includes('/api/Auth/login') ||
        originalRequest?.url?.includes('/api/Auth/refresh') ||
        originalRequest?.url?.includes('/api/Auth/altcha');

      const isTokenExpired =
        error.response?.status === 401 ||
        (error.response?.status === 403 &&
          (error.response?.data?.msg?.toLowerCase().includes('token') ||
           error.response?.data?.message?.toLowerCase().includes('token')));

      if (isTokenExpired && !originalRequest?._retry && !isAuthUrl) {
        originalRequest._retry = true;

        try {
          const token = await refreshAccessToken();

          if (typeof originalRequest.headers?.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
          } else {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          return instance(originalRequest);
        } catch (err) {
          clearSession();
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
 