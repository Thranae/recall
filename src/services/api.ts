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
    const err = new Error(errorBody.error || `Request failed with status ${res.status}`);
    Object.assign(err, errorBody);
    throw err;
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

  async signup(
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; message: string; email: string; dev_otp?: string }> {
    return request<{ success: boolean; message: string; email: string; dev_otp?: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async verifySignupOtp(email: string, otp: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/verify-signup', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    setAuthToken(data.token);
    return data;
  },

  async resendOtp(email: string): Promise<{ success: boolean; message: string; dev_otp?: string }> {
    return request<{ success: boolean; message: string; dev_otp?: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; dev_otp?: string }> {
    return request<{ success: boolean; message: string; dev_otp?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, direct: true }),
    });
    setAuthToken(data.token);
    return data;
  },

  async loginGoogle(payload: {
    tokenId?: string;
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

  // Screenshots (Upload files individually so serverless 4.5MB request payload limit is never exceeded)
  async uploadScreenshots(files: File[]): Promise<{ message: string; screenshots: any[] }> {
    const allScreenshots: any[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('screenshots', file);
      const res = await request<{ message: string; screenshots: any[] }>('/screenshots/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.screenshots) {
        allScreenshots.push(...res.screenshots);
      }
    }
    return {
      message: `Successfully uploaded ${allScreenshots.length} screenshots.`,
      screenshots: allScreenshots,
    };
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
