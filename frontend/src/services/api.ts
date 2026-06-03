import axios from 'axios';
import type { User, AuthResponse, UserPerformance, UserPerformanceCreate } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies
});

// Add auth token to requests (fallback for non-cookie auth)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error;
  }
);

// Auth Service
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', { email, password });
    // Store token in localStorage as fallback
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// User Service
export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get(`/api/admin/users/${id}`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/users/${id}`);
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/api/admin/users/${id}`, data);
    return response.data;
  },
};

// Performance Service
export const performanceService = {
  storePerformance: async (data: UserPerformanceCreate): Promise<UserPerformance> => {
    const response = await api.post('/api/data/performance', data);
    return response.data;
  },

  getUserPerformance: async (userId: number, startDate?: string, endDate?: string): Promise<any> => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/api/data/performance/user/${userId}`, { params });
    return response.data;
  },
};

// Photo Service
export const photoService = {
  getEmployeePhotosDayWise: async (employeeId: string): Promise<any> => {
    const safeEmployeeId = employeeId.replace(/\//g, "_");
    const response = await api.get(`/api/data/photos/employee/${safeEmployeeId}/day-wise`);
    return response.data;
  },

  getEmployeePhotos: async (employeeId: string, date?: string, page?: number, limit?: number): Promise<any> => {
    const params: any = {};
    if (date) params.date = date;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const response = await api.get(`/api/data/photos/employee/${employeeId}`, { params });
    return response.data;
  },

  uploadPhoto: async (file: File, userId?: string, email?: string, name?: string, employeeId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    if (email) formData.append('email', email);
    if (name) formData.append('name', name);
    if (employeeId) formData.append('employee_id', employeeId);
    
    const response = await api.post('/api/data/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
