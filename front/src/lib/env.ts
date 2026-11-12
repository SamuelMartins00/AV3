const apiUrl = import.meta.env.VITE_API_URL?.trim();

export const env = {
  apiUrl: apiUrl || '/api/v1',
} as const;
