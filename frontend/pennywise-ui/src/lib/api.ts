// API client for Pennywise backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Types matching backend DTOs
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUser {
  username: string;
  email: string;
}

export interface UpdateUser {
  username?: string;
  email?: string;
}

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
}

export interface CreateExpense {
  title: string;
  description?: string;
  amount: number;
  date: string;
  userId: number;
  categoryId: number;
}

export interface UpdateExpense {
  title?: string;
  description?: string;
  amount?: number;
  date?: string;
  categoryId?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategory {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategory {
  name?: string;
  description?: string;
  color?: string;
}

// Helper for handling API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }
  
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// User API
export const userApi = {
  async getById(id: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    return handleResponse<User>(response);
  },

  async getByEmail(email: string): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(email)}`);
    if (response.status === 404) return null;
    return handleResponse<User>(response);
  },

  async create(user: CreateUser): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return handleResponse<User>(response);
  },

  async update(id: number, user: UpdateUser): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return handleResponse<User>(response);
  },
};

// Expense API
export const expenseApi = {
  async getAll(userId: number): Promise<Expense[]> {
    const response = await fetch(`${API_BASE_URL}/expenses/user/${userId}`);
    return handleResponse<Expense[]>(response);
  },

  async getById(id: number, userId: number): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`);
    return handleResponse<Expense>(response);
  },

  async getByDateRange(userId: number, startDate: string, endDate: string): Promise<Expense[]> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    const response = await fetch(
      `${API_BASE_URL}/expenses/user/${userId}/daterange?${params}`
    );
    return handleResponse<Expense[]>(response);
  },

  async getByCategory(userId: number, categoryId: number): Promise<Expense[]> {
    const response = await fetch(
      `${API_BASE_URL}/expenses/user/${userId}/category/${categoryId}`
    );
    return handleResponse<Expense[]>(response);
  },

  async create(expense: CreateExpense): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return handleResponse<Expense>(response);
  },

  async update(id: number, userId: number, expense: UpdateExpense): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return handleResponse<Expense>(response);
  },

  async delete(id: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },
};

// Category API
export const categoryApi = {
  async getAll(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return handleResponse<Category[]>(response);
  },

  async getById(id: number): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`);
    return handleResponse<Category>(response);
  },

  async create(category: CreateCategory): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    return handleResponse<Category>(response);
  },

  async update(id: number, category: UpdateCategory): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    return handleResponse<Category>(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },
};
