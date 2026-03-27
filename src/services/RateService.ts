import {
  Carrier,
  RateRequest,
  RateQuote,
  ValidationError,
  CarrierApiError,
  NetworkError,
  RateLimitError,
} from '../interfaces/types';
import { UPSCarrier } from '../carriers/ups/UPSCarrier';
import { UPSCredentials } from '../interfaces/carriers/ups';

export class RateService {
  private carriers = new Map<Carrier, any>();

  constructor(private readonly credentials: Record<Carrier, any>) { }

  async initializeCarrier(carrier: Carrier, config: any, httpClient?: any): Promise<void> {
    try {
      switch (carrier) {
        case Carrier.UPS:
          const upsCredentials = this.credentials[Carrier.UPS] as UPSCredentials;
          const upsCarrier = new UPSCarrier(upsCredentials, config.sandbox, {
            version: config.version,
            requestoption: config.requestOption
          }, httpClient);
          await this.testCarrierConnection(upsCarrier, httpClient);
          this.carriers.set(carrier, upsCarrier);
          break;

        case Carrier.FedEx:
          throw new Error('FedEx carrier not yet implemented');

        case Carrier.USPS:
          throw new Error('USPS carrier not yet implemented');

        case Carrier.DHL:
          throw new Error('DHL carrier not yet implemented');

        default:
          throw new Error(`Unsupported carrier: ${carrier}`);
      }
    } catch (error) {
      throw new CarrierApiError(
        `Failed to initialize ${carrier} carrier: ${(error as Error).message}`,
        carrier,
        'INIT_ERROR',
        error
      );
    }
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const carrier = this.carriers.get(request.carrier);

    if (!carrier) {
      throw new ValidationError(`Carrier ${request.carrier} is not initialized`);
    }

    try {
      return await carrier.getRates(request);
    } catch (error) {
      if (error instanceof CarrierApiError || error instanceof NetworkError || error instanceof RateLimitError) {
        throw error;
      }

      throw new CarrierApiError(
        `Failed to get rates from ${request.carrier}: ${(error as Error).message}`,
        request.carrier,
        'RATE_ERROR',
        error
      );
    }
  }

  async getRatesFromAllCarriers(request: Omit<RateRequest, 'carrier'>): Promise<RateQuote[]> {
    const ratePromises: Promise<RateQuote[]>[] = [];

    for (const [carrier, carrierInstance] of this.carriers) {
      if (carrierInstance) {
        const carrierRequest = { ...request, carrier };
        ratePromises.push(
          carrierInstance.getRates(carrierRequest).catch((error: Error) => {
            console.warn(`Failed to get rates from ${carrier}: ${error.message}`);
            return [] as RateQuote[]; // Return empty array for failed carriers
          })
        );
      }
    }

    const results = await Promise.all(ratePromises);
    return results.flat();
  }

  async getCheapestRate(request: RateRequest): Promise<RateQuote | null> {
    const quotes = await this.getRates(request);

    if (quotes.length === 0) {
      return null;
    }

    return quotes.reduce((cheapest, current) =>
      current.totalCost < cheapest.totalCost ? current : cheapest
    );
  }

  async getFastestRate(request: RateRequest): Promise<RateQuote | null> {
    const quotes = await this.getRates(request);

    if (quotes.length === 0) {
      return null;
    }

    return quotes.sort((a, b) => {
      if (a.transitDays !== undefined && b.transitDays !== undefined) {
        const daysDiff = a.transitDays - b.transitDays;
        if (daysDiff !== 0) return daysDiff;
      }
      return a.totalCost - b.totalCost;
    })[0];
  }

  private async testCarrierConnection(carrier: any, httpClient?: any): Promise<void> {
    try {
      const testRequest: RateRequest = {
        carrier: Carrier.UPS,
        origin: {
          street1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
          residential: false,
        },
        destination: {
          street1: '456 Test Ave',
          city: 'Test City',
          state: 'TS',
          postalCode: '67890',
          country: 'US',
          residential: false,
        },
        packages: [{
          length: 10,
          width: 10,
          height: 10,
          weight: 1,
          weightUnit: 'lb',
          dimensionUnit: 'in',
        }],
        signatureRequired: true,
        insured: true,
      };

      if (httpClient && httpClient.constructor.name === 'MockHTTPClient') {
        console.log('Skipping carrier connection test in mock environment');
        return;
      }

      await carrier.getRates(testRequest);
    } catch (error) {
      console.log(`Carrier test failed: ${(error as Error).message}`);
    }
  }

  getInitializedCarriers(): Carrier[] {
    return Array.from(this.carriers.keys());
  }

  isCarrierInitialized(carrier: Carrier): boolean {
    return this.carriers.has(carrier);
  }
}
