export interface User {
  id: string;
  email: string;
  full_name: string;
  employee_id?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFolder {
  id: string;
  name: string;
  users: User[];
  isExpanded: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface UserPerformance {
  id: string;
  user_id: number;
  performance_percentage: number;
  idle_time_seconds: number;
  focus_time_seconds: number;
  recorded_at: string;
  created_at: string;
}

export interface UserPerformanceCreate {
  user_id: number;
  performance_percentage: number;
  idle_time_seconds: number;
  focus_time_seconds: number;
  recorded_at: string;
}

export interface KeyItem {
  id: number;
  key: string;
}

