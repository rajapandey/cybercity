import { z } from 'zod';

export const AddressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2, 'Country code must be 2 characters'),
  residential: z.boolean().optional().default(false),
});

export type Address = z.infer<typeof AddressSchema>;

export const PackageSchema = z.object({
  length: z.number().positive('Length must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  weight: z.number().positive('Weight must be positive'),
  weightUnit: z.enum(['lb', 'kg']).default('lb'),
  dimensionUnit: z.enum(['in', 'cm']).default('in'),
  packageType: z.string().optional(),
  description: z.string().optional(),
});

export type Package = z.infer<typeof PackageSchema>;

export enum Carrier {
  UPS = 'UPS',
  FedEx = 'FedEx',
  USPS = 'USPS',
  DHL = 'DHL',
}

export enum ServiceLevel {
  GROUND = 'GROUND',
  NEXT_DAY = 'NEXT_DAY',
  SECOND_DAY = 'SECOND_DAY',
  EXPRESS = 'EXPRESS',
  STANDARD = 'STANDARD',
}

export const RateRequestSchema = z.object({
  carrier: z.nativeEnum(Carrier),
  serviceLevel: z.nativeEnum(ServiceLevel).optional(),
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1, 'At least one package is required'),
  declaredValue: z.number().optional(),
  signatureRequired: z.boolean().optional().default(false),
  insured: z.boolean().optional().default(false),
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

export const RateQuoteSchema = z.object({
  carrier: z.nativeEnum(Carrier),
  serviceLevel: z.nativeEnum(ServiceLevel),
  totalCost: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  estimatedDelivery: z.string().optional(),
  transitDays: z.number().optional(),
  quoteId: z.string(),
  validUntil: z.string().optional(),
  breakdown: z.array(z.object({
    name: z.string(),
    amount: z.number(),
  })).optional(),
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;

export const ShipmentRequestSchema = z.object({
  rateQuote: RateQuoteSchema,
  referenceNumber: z.string().optional(),
  instructions: z.string().optional(),
});

export type ShipmentRequest = z.infer<typeof ShipmentRequestSchema>;

export const ShipmentResponseSchema = z.object({
  shipmentId: z.string(),
  trackingNumber: z.string(),
  carrier: z.nativeEnum(Carrier),
  serviceLevel: z.nativeEnum(ServiceLevel),
  labelUrl: z.string().optional(),
  labelData: z.string().optional(),
  totalCost: z.number(),
  currency: z.string().default('USD'),
  estimatedDelivery: z.string().optional(),
  trackingUrl: z.string().optional(),
  createdAt: z.string(),
});

export type ShipmentResponse = z.infer<typeof ShipmentResponseSchema>;

export const TrackingInfoSchema = z.object({
  trackingNumber: z.string(),
  carrier: z.nativeEnum(Carrier),
  status: z.string(),
  estimatedDelivery: z.string().optional(),
  deliveredAt: z.string().optional(),
  events: z.array(z.object({
    timestamp: z.string(),
    status: z.string(),
    location: z.string().optional(),
    description: z.string(),
  })),
});

export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;

export const CarrierConfigSchema = z.object({
  carrier: z.nativeEnum(Carrier),
  enabled: z.boolean().default(true),
  sandbox: z.boolean().default(true),
  credentials: z.record(z.string(), z.unknown()),
  rateLimits: z.object({
    requestsPerSecond: z.number().positive().optional(),
    requestsPerDay: z.number().positive().optional(),
  }).optional(),
});

export type CarrierConfig = z.infer<typeof CarrierConfigSchema>;

export abstract class CarrierIntegrationError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends CarrierIntegrationError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class AuthenticationError extends CarrierIntegrationError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

export class RateLimitError extends CarrierIntegrationError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;
  constructor(message: string = 'Rate limit exceeded', public readonly retryAfter?: number) {
    super(message);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

export class CarrierApiError extends CarrierIntegrationError {
  readonly code = 'CARRIER_API_ERROR';
  readonly statusCode = 502;
  constructor(
    message: string,
    public readonly carrier: string,
    public readonly carrierCode?: string,
    details?: unknown
  ) {
    super(message, details);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      carrier: this.carrier,
      carrierCode: this.carrierCode,
    };
  }
}

export class NetworkError extends CarrierIntegrationError {
  readonly code = 'NETWORK_ERROR';
  readonly statusCode = 503;
}
