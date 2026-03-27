import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { NetworkError, RateLimitError } from '../interfaces/types';
import { HTTPClientConfig, RequestConfig, IHTTPClient } from '../interfaces';

export class HTTPClient implements IHTTPClient {
  private axios: AxiosInstance;

  constructor(config: HTTPClientConfig) {
    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.axios.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('HTTP request error:', error);
        return Promise.reject(error);
      }
    );

    this.axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url: config.endpoint,
      headers: config.headers,
      params: config.params,
      data: config.data,
      timeout: config.timeout,
    };

    const response: AxiosResponse<T> = await this.axios.request(axiosConfig);
    return response.data;
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'GET',
      params,
    });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'POST',
      data,
      headers,
    });
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'PUT',
      data,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'DELETE',
    });
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.axios.defaults.headers, headers);
  }

  private handleError(error: any): Error {
    if (error.response) {
      const { status, statusText, data } = error.response;
      const message = data?.message || statusText || 'HTTP Error';

      switch (status) {
        case 400:
          return new Error(`Bad Request: ${message}`);
        case 401:
          return new Error(`Unauthorized: ${message}`);
        case 403:
          return new Error(`Forbidden: ${message}`);
        case 404:
          return new Error(`Not Found: ${message}`);
        case 429:
          const retryAfter = error.response.headers?.['retry-after'];
          return new RateLimitError(`Rate limit exceeded: ${message}`, retryAfter ? parseInt(retryAfter) : undefined);
        case 500:
        case 502:
        case 503:
        case 504:
          return new NetworkError(`Service unavailable: ${message}`);
        default:
          return new Error(`HTTP ${status}: ${message}`);
      }
    } else if (error.request) {
      return new NetworkError('No response received from server');
    } else {
      return new NetworkError(error.message || 'Network error occurred');
    }
  }
}
