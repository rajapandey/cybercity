import { RateRequest, RateQuote } from './types';

export interface ICarrier {
  getRates(request: RateRequest): Promise<RateQuote[]>;
}

export interface ICarrierConfig {
  carrier: string;
  enabled: boolean;
  sandbox: boolean;
  credentials: Record<string, unknown>;
  rateLimits?: {
    requestsPerSecond?: number;
    requestsPerDay?: number;
  };
}

export interface ICarrierFactory {
  createCarrier(config: ICarrierConfig): ICarrier;
}
