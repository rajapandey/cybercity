export interface TokenCache {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
  obtainedAt: number;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}
