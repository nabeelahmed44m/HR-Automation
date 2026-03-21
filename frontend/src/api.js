import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

// Add a request interceptor to include the Bearer token in every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 Unauthorized errors (e.g., token expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Logout user and redirect to login if token is invalid/expired
            localStorage.removeItem('token');
            // We can't use navigate() here directly without being in a React component component, 
            // but we can force redirect if needed: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
