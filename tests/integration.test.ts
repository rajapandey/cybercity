import { RateService } from '../src/services/RateService';
import { Carrier, ServiceLevel, RateRequest } from '../src/interfaces/types';
import { UPSCarrier } from '../src/carriers/ups/UPSCarrier';
import { IHTTPClient } from '../src/interfaces/http';

class MockHTTPClient implements IHTTPClient {
  private responses: any[] = [];

  setMockResponse(response: any) {
    this.responses.push(response);
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    // Mock implementation - no headers to set
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    throw new Error('GET method not implemented in mock');
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    throw new Error('PUT method not implemented in mock');
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    throw new Error('DELETE method not implemented in mock');
  }

  async post<T = unknown>(endpoint: string, data?: unknown, headers?: any): Promise<T> {
    if (endpoint.includes('/security/v1/oauth/token')) {
      return {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'rating',
      } as T;
    }

    // Simulate rate response
    if (endpoint.includes('/rating/v2409/Shop')) {
      return {
        RateResponse: {
          Response: {
            ResponseStatus: {
              Code: '1',
              Description: 'Success',
            },
          },
          RatedShipment: [
            {
              Service: {
                Code: '03',
                Description: 'UPS Ground',
              },
              TransportationCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '12.50',
              },
              ServiceOptionsCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '2.00',
              },
              TotalCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '14.50',
              },
              GuaranteedDelivery: {
                BusinessDaysInTransit: '3',
                DeliveryByTime: '23:59',
              },
            },
            {
              Service: {
                Code: '01',
                Description: 'UPS Next Day Air',
              },
              TransportationCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '45.00',
              },
              ServiceOptionsCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '5.00',
              },
              TotalCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '50.00',
              },
              GuaranteedDelivery: {
                BusinessDaysInTransit: '1',
                DeliveryByTime: '10:30',
              },
            },
          ],
        },
      } as T;
    }

    throw new Error('Unexpected endpoint');
  }
}

describe('RateService Integration Tests', () => {
  let rateService: RateService;
  let mockHTTPClient: MockHTTPClient;

  beforeEach(async () => {
    mockHTTPClient = new MockHTTPClient();
    rateService = new RateService({
      [Carrier.UPS]: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accountNumber: 'test-account-number',
      },
      [Carrier.FedEx]: {},
      [Carrier.USPS]: {},
      [Carrier.DHL]: {},
    });

    await rateService.initializeCarrier(Carrier.UPS, {
      sandbox: true,
      version: 'v2409',
      requestOption: 'Shop'
    }, mockHTTPClient);
  });

  describe('Carrier Initialization', () => {
    test('should initialize UPS carrier successfully', async () => {
      await expect(
        rateService.initializeCarrier(Carrier.UPS, { sandbox: true })
      ).resolves.not.toThrow();

      expect(rateService.isCarrierInitialized(Carrier.UPS)).toBe(true);
      expect(rateService.getInitializedCarriers()).toContain(Carrier.UPS);
    });

    test('should throw error for unsupported carrier', async () => {
      await expect(
        rateService.initializeCarrier(Carrier.FedEx as any, {})
      ).rejects.toThrow('FedEx carrier not yet implemented');
    });
  });

  describe('Rate Shopping', () => {
    test('should get rates from UPS', async () => {
      const rateRequest: RateRequest = {
        carrier: Carrier.UPS,
        serviceLevel: ServiceLevel.GROUND,
        origin: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          residential: false,
        },
        destination: {
          street1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          residential: true,
        },
        packages: [
          {
            length: 10,
            width: 8,
            height: 6,
            weight: 5,
            weightUnit: 'lb',
            dimensionUnit: 'in',
          },
        ],
        signatureRequired: true,
        insured: true,
      };

      const quotes = await rateService.getRates(rateRequest);

      expect(quotes).toHaveLength(2);
      expect(quotes[0]).toMatchObject({
        carrier: Carrier.UPS,
        serviceLevel: ServiceLevel.GROUND,
        totalCost: 14.50,
        currency: 'USD',
        transitDays: 3,
      });

      expect(quotes[1]).toMatchObject({
        carrier: Carrier.UPS,
        serviceLevel: ServiceLevel.NEXT_DAY,
        totalCost: 50.00,
        currency: 'USD',
        transitDays: 1,
      });
    });

    test('should find cheapest rate', async () => {
      const rateRequest: RateRequest = {
        carrier: Carrier.UPS,
        origin: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          residential: false,
        },
        destination: {
          street1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          residential: true,
        },
        packages: [
          {
            length: 10,
            width: 8,
            height: 6,
            weight: 5,
            weightUnit: 'lb',
            dimensionUnit: 'in',
          },
        ],
        signatureRequired: true,
        insured: true,
      };

      const cheapest = await rateService.getCheapestRate(rateRequest);

      expect(cheapest).toMatchObject({
        carrier: Carrier.UPS,
        serviceLevel: ServiceLevel.GROUND,
        totalCost: 14.50,
        currency: 'USD',
      });
    });

    test('should find fastest rate', async () => {
      const rateRequest: RateRequest = {
        carrier: Carrier.UPS,
        origin: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          residential: false,
        },
        destination: {
          street1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          residential: true,
        },
        packages: [
          {
            length: 10,
            width: 8,
            height: 6,
            weight: 5,
            weightUnit: 'lb',
            dimensionUnit: 'in',
          },
        ],
        signatureRequired: true,
        insured: true,
      };

      const fastest = await rateService.getFastestRate(rateRequest);

      expect(fastest).toMatchObject({
        carrier: Carrier.UPS,
        serviceLevel: ServiceLevel.NEXT_DAY,
        totalCost: 50.00,
        currency: 'USD',
        transitDays: 1,
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle uninitialized carrier error', async () => {
      const rateRequest: RateRequest = {
        carrier: Carrier.FedEx,
        origin: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          residential: false,
        },
        destination: {
          street1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          residential: true,
        },
        packages: [
          {
            length: 10,
            width: 8,
            height: 6,
            weight: 5,
            weightUnit: 'lb',
            dimensionUnit: 'in',
          },
        ],
        signatureRequired: true,
        insured: true,
      };

      await expect(rateService.getRates(rateRequest)).rejects.toThrow('Carrier FedEx is not initialized');
    });
  });
});

describe('UPSCarrier Unit Tests', () => {
  let upsCarrier: UPSCarrier;
  let mockHTTPClient: MockHTTPClient;

  beforeEach(() => {
    mockHTTPClient = new MockHTTPClient();
    upsCarrier = new UPSCarrier({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accountNumber: 'test-account-number',
    }, true, {
      version: 'v2409',
      requestoption: 'Shop'
    }, mockHTTPClient);
  });

  test('should build UPS rate request correctly', async () => {
    const rateRequest: RateRequest = {
      carrier: Carrier.UPS,
      serviceLevel: ServiceLevel.GROUND,
      origin: {
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        residential: false,
      },
      destination: {
        street1: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
        residential: true,
      },
      packages: [
        {
          length: 10,
          width: 8,
          height: 6,
          weight: 5,
          weightUnit: 'lb',
          dimensionUnit: 'in',
        },
      ],
      signatureRequired: true,
      insured: true,
    };

    const quotes = await upsCarrier.getRates(rateRequest);

    expect(quotes).toHaveLength(2);
    expect(quotes[0].carrier).toBe(Carrier.UPS);
    expect(quotes[0].totalCost).toBe(14.50);
  });
});
