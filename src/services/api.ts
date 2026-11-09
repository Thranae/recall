import type { User, Screenshot, ExtractedMessage, GameResult, SearchResponse } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('recall_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('recall_auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('recall_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAuthToken(data.token);
    return data;
  },

  async loginGoogle(payload: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  }): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(data.token);
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const data = await request<{ user: User }>('/auth/me');
      return data.user;
    } catch {
      removeAuthToken();
      return null;
    }
  },

  logout(): void {
    removeAuthToken();
  },

  // Screenshots
  async uploadScreenshots(files: File[]): Promise<{ message: string; screenshots: any[] }> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('screenshots', file);
    }
    return request<{ message: string; screenshots: any[] }>('/screenshots/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getScreenshots(category?: string, status?: string): Promise<{ screenshots: Screenshot[]; total: number }> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (status && status !== 'all') params.set('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ screenshots: Screenshot[]; total: number }>(`/screenshots${qs}`);
  },

  async getScreenshotDetails(id: string): Promise<{
    screenshot: Screenshot;
    messages: ExtractedMessage[];
    game_result: GameResult | null;
  }> {
    return request<{
      screenshot: Screenshot;
      messages: ExtractedMessage[];
      game_result: GameResult | null;
    }>(`/screenshots/${id}`);
  },

  getImageUrl(id: string): string {
    const token = getAuthToken();
    return `${API_BASE}/screenshots/image/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async updateMetadata(id: string, updates: { category?: string; visual_description?: string; tags?: string[] }): Promise<void> {
    await request(`/screenshots/${id}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteScreenshot(id: string): Promise<void> {
    await request(`/screenshots/${id}`, {
      method: 'DELETE',
    });
  },

  // Search
  async search(query: string, category?: string): Promise<SearchResponse> {
    return request<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify({ query, category }),
    });
  },

  // Test Benchmark Seeding
  async seedBenchmarkData(): Promise<{ message: string; seeded_screenshots: string[] }> {
    return request<{ message: string; seeded_screenshots: string[] }>('/test-data/seed', {
      method: 'POST',
    });
  },
};
