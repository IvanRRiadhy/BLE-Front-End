 import axios from 'axios';

 const axiosServices = axios.create({
    baseURL: 'http://192.168.1.116:5000',
    headers: {
        'Content-Type': 'application/json',
    },
 });

 axiosServices.interceptors.request.use(request => {
  const accessToken = localStorage.getItem('token');
  if (accessToken) {
    request.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return request;
}, error => {
  return Promise.reject(error);
});
 
axiosServices.interceptors.response.use(
  response => response, // Directly return successful responses.
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the request as retried to avoid infinite loops.
      try {
        const refreshToken = localStorage.getItem('refreshToken'); // Retrieve the stored refresh token.
        // Make a request to your auth server to refresh the token.
        const response = await axios.post('http://192.168.1.116:5000/api/Auth/refresh/', {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        // Store the new access and refresh tokens.
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        // Update the authorization header with the new access token.
        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return axiosServices(originalRequest); // Retry the original request with the new access token.
      } catch (refreshError) {
        // Handle refresh token errors by clearing stored tokens and redirecting to the login page.
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error); // For all other errors, return the error as is.
  }
);
 
 export default axiosServices;
 