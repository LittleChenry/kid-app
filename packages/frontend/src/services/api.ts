const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  arithmetic: {
    getProblems: (params: Record<string, string | number>) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<any[]>(`/arithmetic/problems?${qs}`);
    },
    submit: (data: any) =>
      request<any>('/arithmetic/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getHistory: () => request<any[]>('/arithmetic/history'),
  },
  video: {
    list: () => request<any[]>('/video'),
    get: (id: string) => request<any>(`/video/${id}`),
    liveChannels: () => request<any[]>('/video/live'),
    categories: () => request<any[]>('/video/categories'),
    scan: () => request<any>('/video/scan', { method: 'POST' }),
  },
  media: {
    list: () => fetch('/media/videos').then((r) => r.json()),
    dir: (path?: string) => fetch(`/media/dir?path=${encodeURIComponent(path || '')}`).then((r) => r.json()),
    playlist: (id: string) => fetch(`/media/videos/${id}/playlist`).then((r) => r.json()),
  },
  calligraphy: {
    getCharacterCounts: () =>
      request<{difficulty: number; _count: number}[]>('/calligraphy/characters/counts'),
    getCharactersByDifficulty: (level: number, exclude?: string[]) => {
      const params = exclude?.length
        ? `?exclude=${exclude.map(e => encodeURIComponent(e)).join(',')}`
        : '';
      return request<any[]>(`/calligraphy/characters/difficulty/${level}${params}`);
    },
    getCharData: (char: string) =>
      request<any>(`/calligraphy/characters/${encodeURIComponent(char)}`),
    getRecentSessionChars: (difficulty: number) =>
      request<string[]>(`/calligraphy/sessions/recent/${difficulty}`),
    startSession: (difficulty: number) =>
      request<any>('/calligraphy/session/start', {
        method: 'POST',
        body: JSON.stringify({ difficulty }),
      }),
    completeSession: (sessionId: string, records: any[]) =>
      request<any>('/calligraphy/session/complete', {
        method: 'POST',
        body: JSON.stringify({ sessionId, records }),
      }),
    getSessions: () => request<any[]>('/calligraphy/sessions'),
    getSession: (id: string) => request<any>(`/calligraphy/sessions/${id}`),
  },
};
