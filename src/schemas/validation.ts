import { z } from 'zod';

export const RateRequestSchema = z.object({
  carrier: z.enum(['UPS', 'FedEx', 'USPS', 'DHL']),
  serviceLevel: z.string().optional(),
  origin: z.object({
    street1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    residential: z.boolean().optional(),
  }),
  destination: z.object({
    street1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    residential: z.boolean().optional(),
  }),
  packages: z.array(z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    weight: z.number(),
    weightUnit: z.enum(['lb', 'kg']),
    dimensionUnit: z.enum(['in', 'cm']),
  })),
  declaredValue: z.number().optional(),
  signatureRequired: z.boolean().optional(),
  insured: z.boolean().optional(),
});

export type RateRequest = z.infer<typeof RateRequestSchema>;
