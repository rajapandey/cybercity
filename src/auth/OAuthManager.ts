import { AuthenticationError, NetworkError } from '../interfaces/types';
import { OAuthToken, OAuthConfig, TokenCache } from '../interfaces';

class InMemoryTokenCache implements TokenCache {
  private cache = new Map<string, any>();

  getItem(key: string): string | null {
    return this.cache.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
  }
}

export class OAuthManager {
  private token?: OAuthToken;
  private readonly tokenCacheKey: string;
  private cache: InMemoryTokenCache;

  constructor(
    private readonly config: OAuthConfig,
    private readonly httpClient: {
      post: (url: string, data: string, headers?: Record<string, string>) => Promise<unknown>;
    },
    private readonly cacheKey: string
  ) {
    this.tokenCacheKey = cacheKey;
    this.cache = new InMemoryTokenCache();
  }

  async authenticate(): Promise<void> {
    try {
      await this.loadTokenFromCache();
      if (this.isTokenValid()) {
        return;
      }
      await this.refreshToken();
    } catch (error) {
      throw new AuthenticationError(`OAuth authentication failed: ${(error as Error).message}`, error);
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.authenticate();
    if (!this.token) {
      throw new AuthenticationError('No valid OAuth token available');
    }

    return {
      'Authorization': `${this.token.tokenType} ${this.token.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async loadTokenFromCache(): Promise<void> {
    try {
      const cached = this.cache.getItem(this.tokenCacheKey);
      if (cached) {
        this.token = JSON.parse(cached);
      }
    } catch {
      this.token = undefined;
    }
  }

  private async saveTokenToCache(): Promise<void> {
    if (this.token) {
      try {
        this.cache.setItem(this.tokenCacheKey, JSON.stringify(this.token));
      } catch {
        // Cache write failed, but continue
      }
    }
  }

  private isTokenValid(): boolean {
    if (!this.token) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.token.obtainedAt + this.token.expiresIn;
    const bufferTime = 300;

    return (expiresAt - now) > bufferTime;
  }

  private async refreshToken(): Promise<void> {
    try {
      const formData = [
        `grant_type=client_credentials`,
        `client_id=${encodeURIComponent(this.config.clientId)}`,
        `client_secret=${encodeURIComponent(this.config.clientSecret)}`
      ].join('&');

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const response = await this.httpClient.post(this.config.tokenUrl, formData, headers) as any;

      if (!response.access_token) {
        throw new Error('Invalid OAuth response: missing access_token');
      }

      this.token = {
        accessToken: response.access_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in,
        scope: response.scope,
        obtainedAt: Math.floor(Date.now() / 1000),
      };
      await this.saveTokenToCache();
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(`Failed to refresh OAuth token: ${error.message}`, error);
      }
      throw error;
    }
  }

  async revokeToken(): Promise<void> {
    try {
      this.token = undefined;
      this.cache.removeItem(this.tokenCacheKey);
    } catch (error) {
      throw new AuthenticationError(`Failed to revoke token: ${(error as Error).message}`, error);
    }
  }

  getTokenInfo(): OAuthToken | null {
    return this.token || null;
  }
}
