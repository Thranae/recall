import type { User, Screenshot, ExtractedMessage, GameResult, SearchResponse } from '../types';
import { Capacitor } from '@capacitor/core';

export const PROD_BACKEND_URL = 'https://web-app-vert-nu.vercel.app/api';

export function getApiBase(): string {
  if (typeof window === 'undefined') return '/api';

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;

  try {
    if (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web') {
      return PROD_BACKEND_URL;
    }
  } catch {
    // fallback to location heuristics below
  }

  const loc = window.location;
  if (
    loc.protocol === 'capacitor:' ||
    loc.protocol === 'file:' ||
    loc.protocol === 'ionic:' ||
    loc.protocol === 'content:'
  ) {
    return PROD_BACKEND_URL;
  }

  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    if (loc.port !== '5173') {
      return PROD_BACKEND_URL;
    }
  }

  return '/api';
}

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

  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const errorBody = await res.json().catch(() => ({}));
      const err = new Error(errorBody.error || `Request failed with status ${res.status}`);
      Object.assign(err, errorBody);
      throw err;
    } else {
      const text = await res.text().catch(() => '');
      throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
    }
  }

  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  const text = await res.text().catch(() => '');
  if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
    throw new Error('Unable to connect to Recall servers. Please verify your internet connection.');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Received non-JSON response from server.');
  }
}

export const api = {
  askVault: (query: string, category?: string) =>
    request<import('../types').VaultAskResponse>('/search/ask', {
      method: 'POST',
      body: JSON.stringify({ query, category }),
    }),

  askScreenshot: (id: string, question: string) =>
    request<import('../types').ImageQuestionResponse>(`/screenshots/${encodeURIComponent(id)}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  aiRedactScreenshot: (
    id: string,
    instruction: string,
    ocrWords?: import('../types').AiRedactWordHint[]
  ) =>
    request<import('../types').AiRedactResponse>(`/screenshots/${encodeURIComponent(id)}/ai-redact`, {
      method: 'POST',
      body: JSON.stringify({ instruction, ocrWords }),
    }),

  reanalyzeBatch: () =>
    request<import('../types').BatchReanalyzeResponse>('/screenshots/batch/reanalyze-all', {
      method: 'POST',
    }),

  getSimilarScreenshots: (id: string) =>
    request<{ similar: import('../types').SimilarMemoryItem[] }>(`/screenshots/${encodeURIComponent(id)}/similar`),

  getCoachInsights: (id: string) =>
    request<import('../types').SmartCoachResponse>(`/screenshots/${encodeURIComponent(id)}/coach`, {
      method: 'POST',
    }),

  getVaultInsights: () =>
    request<import('../types').VaultInsightsSummary>('/screenshots/insights/summary'),

  cleanDuplicates: (ids: string[]) =>
    request<{ success: boolean; deleted: number }>('/screenshots/duplicates/clean', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
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

  // Screenshots (Compress oversized photos client-side & upload concurrently in batches of 5 for near-instant uploads)
  async optimizeImageForUpload(file: File): Promise<File> {
    const MIN_COMPRESS_BYTES = 450 * 1024;
    if (
      file.size < MIN_COMPRESS_BYTES ||
      /\.(gif|svg|heic|heif)$/i.test(file.name) ||
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml'
    ) {
      return file;
    }

    try {
      const MAX_DIM = 1600;
      let width = 0;
      let height = 0;
      let drawSource: CanvasImageSource | null = null;
      let objectUrl: string | null = null;
      let bitmap: ImageBitmap | null = null;

      if (typeof createImageBitmap === 'function') {
        bitmap = await createImageBitmap(file);
        width = bitmap.width;
        height = bitmap.height;
        drawSource = bitmap;
      } else {
        objectUrl = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = objectUrl!;
        });
        width = img.naturalWidth || img.width;
        height = img.naturalHeight || img.height;
        drawSource = img;
      }

      if (!width || !height || !drawSource) {
        if (bitmap) bitmap.close();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return file;
      }

      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (bitmap) bitmap.close();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return file;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(drawSource, 0, 0, targetW, targetH);

      if (bitmap) bitmap.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.84)
      );
      if (!blob || blob.size >= file.size * 0.9) {
        return file;
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'screenshot';
      return new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });
    } catch {
      return file;
    }
  },

  async uploadScreenshots(files: File[]): Promise<{ message: string; screenshots: any[] }> {
    const allScreenshots: any[] = [];
    const errors: string[] = [];

    // Parallel client optimization + upload chunking (5 at a time) for sub-second perceived upload
    const CHUNK_SIZE = 5;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (rawFile) => {
          try {
            const file = await this.optimizeImageForUpload(rawFile);
            const formData = new FormData();
            formData.append('screenshots', file);
            const res = await request<{ message: string; screenshots: any[] }>('/screenshots/upload', {
              method: 'POST',
              body: formData,
            });
            if (res.screenshots) {
              allScreenshots.push(...res.screenshots);
            }
          } catch (err: any) {
            errors.push(`${rawFile.name}: ${err.message || 'failed'}`);
          }
        })
      );
    }

    if (allScreenshots.length === 0 && errors.length > 0) {
      throw new Error(errors[0]);
    }
    return {
      message: `Successfully uploaded ${allScreenshots.length} screenshots.${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
      screenshots: allScreenshots,
    };
  },

  async processPendingScreenshots(): Promise<{ processed: boolean; screenshotId?: string; category?: string }> {
    return request<{ processed: boolean; screenshotId?: string; category?: string }>('/screenshots/process-pending', {
      method: 'POST',
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
    return `${getApiBase()}/screenshots/image/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async updateMetadata(id: string, updates: { original_filename?: string; name?: string; category?: string; visual_description?: string; tags?: string[] }): Promise<void> {
    await request(`/screenshots/${id}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async renameScreenshot(id: string, name: string): Promise<void> {
    await this.updateMetadata(id, { original_filename: name });
  },

  async deleteScreenshot(id: string): Promise<void> {
    await request(`/screenshots/${id}`, {
      method: 'DELETE',
    });
  },

  async reanalyze(id: string): Promise<{
    message: string;
    screenshot: Screenshot;
    messages: ExtractedMessage[];
    game_result: GameResult | null;
  }> {
    return request<{
      message: string;
      screenshot: Screenshot;
      messages: ExtractedMessage[];
      game_result: GameResult | null;
    }>(`/screenshots/${id}/reanalyze`, {
      method: 'POST',
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
