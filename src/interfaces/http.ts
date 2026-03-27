export interface IHTTPClient {
  get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T = unknown>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T>;
  put<T = unknown>(endpoint: string, data?: unknown): Promise<T>;
  delete<T = unknown>(endpoint: string): Promise<T>;
  setDefaultHeaders(headers: Record<string, string>): void;
}

export interface HTTPClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
}

export interface RequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
}
