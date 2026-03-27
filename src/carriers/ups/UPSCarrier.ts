import {
  Carrier,
  RateRequest,
  RateQuote,
  ServiceLevel,
  Address,
  Package,
  RateRequestSchema,
  CarrierApiError,
  NetworkError,
  RateLimitError,
  ValidationError
} from '../../interfaces/types';
import { UPSCredentials, UPSRateRequest, UPSRateResponse, UPSServiceCode, UPSPackagingCode, UPSHeaders, UPSRequestOptions, UPSPackage } from '../../interfaces/carriers/ups';
import { ICarrier } from '../../interfaces';
import { OAuthManager } from '../../auth/OAuthManager';
import { OAuthConfig } from '../../interfaces';
import { IHTTPClient } from '../../interfaces/http';
import { HTTPClient } from '../../http/HTTPClient';

export class UPSCarrier implements ICarrier {
  private readonly name = 'UPS';
  private readonly httpClient: IHTTPClient;
  private readonly oauthManager: OAuthManager;
  private readonly apiVersion: string;
  private readonly requestOption: string;

  constructor(
    private readonly config: UPSCredentials,
    private readonly isSandbox: boolean = true,
    private readonly options: UPSRequestOptions,
    httpClient?: IHTTPClient
  ) {
    this.apiVersion = this.options.version;
    this.requestOption = this.options.requestoption;

    this.httpClient = httpClient || new HTTPClient({
      baseURL: this.isSandbox
        ? 'https://wwwcie.ups.com'
        : 'https://onlinetools.ups.com',
      timeout: 30000,
    });

    const oauthConfig: OAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenUrl: this.isSandbox
        ? 'https://wwwcie.ups.com/security/v1/oauth/token'
        : 'https://onlinetools.ups.com/security/v1/oauth/token',
    };

    this.oauthManager = new OAuthManager(oauthConfig, this.httpClient, 'ups_oauth_token');
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    try {
      const validation = RateRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new ValidationError(`Invalid rate request: ${validation.error.message}`, validation.error);
      }

      const headers = await this.oauthManager.getAuthHeaders();

      const upsRequest = this.buildUPSRateRequest(request);

      const upsHeaders: UPSHeaders = {
        transId: `UPS_${Date.now()}`,
        transactionSrc: 'cybership-rating-api',
      };

      const response = await this.httpClient.post<UPSRateResponse>(
        `/rating/${this.apiVersion}/${this.requestOption}`,
        upsRequest,
        {
          ...headers,
          ...upsHeaders,
        }
      );

      return this.parseRateResponse(response);
    } catch (error) {
      if (error instanceof CarrierApiError || error instanceof NetworkError || error instanceof RateLimitError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new CarrierApiError(
          `UPS API error: ${error.message}`,
          this.name,
          'API_ERROR',
          error
        );
      }

      throw error;
    }
  }

  private buildUPSRateRequest(request: RateRequest): UPSRateRequest {
    return {
      RateRequest: {
        Request: {
          RequestOption: this.requestOption,
          TransactionReference: {
            CustomerContext: `Cybership Rate Request ${Date.now()}`,
          },
        },
        Shipment: {
          Shipper: {
            Name: 'Cybership User',
            Address: this.mapAddress(request.origin),
          },
          ShipTo: {
            Name: 'Recipient',
            Address: this.mapAddress(request.destination),
          },
          PaymentDetails: {
            ShipmentCharge: [
              {
                Type: '01',
                BillShipper: {
                  AccountNumber: this.config.accountNumber,
                },
              },
            ],
          },
          Service: request.serviceLevel ? {
            Code: this.mapServiceLevel(request.serviceLevel),
            Description: this.getServiceDescription(request.serviceLevel),
          } : undefined,
          NumOfPieces: request.packages.length.toString(),
          Package: this.mapPackage(request.packages[0]), // Map first package for simple rate
        },
      },
    };
  }

  private mapAddress(address: Address) {
    return {
      AddressLine: [address.street1, address.street2].filter(Boolean) as string[],
      City: address.city,
      StateProvinceCode: address.state,
      PostalCode: address.postalCode,
      CountryCode: address.country,
      ResidentialAddressIndicator: address.residential ? 'Y' : undefined,
    };
  }

  private mapPackage(pkg: Package): UPSPackage {
    return {
      Packaging: {
        Code: UPSPackagingCode.CUSTOMER_SUPPLIED_PACKAGE,
        Description: pkg.description,
      },
      Dimensions: {
        UnitOfMeasurement: {
          Code: pkg.dimensionUnit === 'in' ? 'IN' : 'CM',
          Description: pkg.dimensionUnit === 'in' ? 'Inches' : 'Centimeters',
        },
        Length: pkg.length.toString(),
        Width: pkg.width.toString(),
        Height: pkg.height.toString(),
      },
      PackageWeight: {
        UnitOfMeasurement: {
          Code: pkg.weightUnit === 'lb' ? 'LBS' : 'KGS',
          Description: pkg.weightUnit === 'lb' ? 'Pounds' : 'Kilograms',
        },
        Weight: pkg.weight.toString(),
      },
    };
  }

  private mapServiceLevel(serviceLevel: ServiceLevel): string {
    switch (serviceLevel) {
      case ServiceLevel.NEXT_DAY:
        return UPSServiceCode.UPS_NEXT_DAY_AIR;
      case ServiceLevel.SECOND_DAY:
        return UPSServiceCode.UPS_SECOND_DAY_AIR;
      case ServiceLevel.GROUND:
        return UPSServiceCode.UPS_GROUND;
      case ServiceLevel.EXPRESS:
        return UPSServiceCode.UPS_WORLDWIDE_EXPRESS;
      case ServiceLevel.STANDARD:
        return UPSServiceCode.UPS_STANDARD;
      default:
        return UPSServiceCode.UPS_GROUND;
    }
  }

  private getServiceDescription(serviceLevel: ServiceLevel): string {
    switch (serviceLevel) {
      case ServiceLevel.NEXT_DAY:
        return 'Next Day Air';
      case ServiceLevel.SECOND_DAY:
        return 'Second Day Air';
      case ServiceLevel.GROUND:
        return 'Ground';
      case ServiceLevel.EXPRESS:
        return 'Worldwide Express';
      case ServiceLevel.STANDARD:
        return 'Standard';
      default:
        return 'Ground';
    }
  }

  private parseRateResponse(response: UPSRateResponse): RateQuote[] {
    const rateResponse = response.RateResponse;

    if (rateResponse.Response.ResponseStatus.Code !== '1') {
      throw new CarrierApiError(
        `UPS API error: ${rateResponse.Response.ResponseStatus.Description}`,
        this.name,
        rateResponse.Response.ResponseStatus.Code
      );
    }

    if (rateResponse.Response.Alert) {
      for (const alert of rateResponse.Response.Alert) {
        console.warn(`UPS API Alert: ${alert.Code} - ${alert.Description}`);
      }
    }

    return rateResponse.RatedShipment.map(shipment => ({
      carrier: Carrier.UPS,
      serviceLevel: this.mapUPSServiceCode(shipment.Service.Code),
      totalCost: parseFloat(shipment.TotalCharges.MonetaryValue),
      currency: shipment.TotalCharges.CurrencyCode,
      estimatedDelivery: shipment.GuaranteedDelivery?.DeliveryByTime,
      transitDays: shipment.GuaranteedDelivery?.BusinessDaysInTransit
        ? parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit)
        : undefined,
      quoteId: `UPS_${shipment.Service.Code}_${Date.now()}`,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      breakdown: [
        {
          name: 'Transportation',
          amount: parseFloat(shipment.TransportationCharges.MonetaryValue),
        },
        {
          name: 'Service Options',
          amount: parseFloat(shipment.ServiceOptionsCharges.MonetaryValue),
        },
      ].filter(breakdown => breakdown.amount > 0),
    }));
  }

  private mapUPSServiceCode(upsCode: string): ServiceLevel {
    switch (upsCode) {
      case UPSServiceCode.UPS_NEXT_DAY_AIR:
      case UPSServiceCode.UPS_NEXT_DAY_AIR_SAVER:
      case UPSServiceCode.UPS_NEXT_DAY_AIR_EARLY_AM:
      case UPSServiceCode.UPS_STANDARD_OVERNIGHT:
        return ServiceLevel.NEXT_DAY;
      case UPSServiceCode.UPS_SECOND_DAY_AIR:
      case UPSServiceCode.UPS_SECOND_DAY_AIR_AM:
        return ServiceLevel.SECOND_DAY;
      case UPSServiceCode.UPS_GROUND:
        return ServiceLevel.GROUND;
      case UPSServiceCode.UPS_WORLDWIDE_EXPRESS:
      case UPSServiceCode.UPS_WORLDWIDE_EXPRESS_PLUS:
        return ServiceLevel.EXPRESS;
      case UPSServiceCode.UPS_STANDARD:
      case UPSServiceCode.UPS_WORLDWIDE_EXPEDITED:
      case UPSServiceCode.UPS_WORLDWIDE_ECONOMY_DDU:
      case UPSServiceCode.UPS_WORLDWIDE_ECONOMY_DDP:
        return ServiceLevel.STANDARD;
      default:
        return ServiceLevel.GROUND;
    }
  }
}
