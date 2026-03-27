export interface UPSCredentials {
    clientId: string;
    clientSecret: string;
    accountNumber: string;
}

export interface UPSHeaders {
    transId?: string;
    transactionSrc?: string;
}

export interface UPSQueryParams {
    additionalinfo?: string;
}

export interface UPSRequestOptions {
    version: string;
    requestoption: 'Rate' | 'Shop' | 'Ratetimeintransit' | 'Shoptimeintransit';
}

export interface UPSAddress {
    AddressLine: string[];
    City: string;
    StateProvinceCode: string;
    PostalCode: string;
    CountryCode: string;
    ResidentialAddressIndicator?: string;
}

export interface UPSPackage {
    Packaging?: {
        Code: string;
        Description?: string;
    };
    Dimensions?: {
        UnitOfMeasurement: {
            Code: string;
            Description?: string;
        };
        Length: string;
        Width: string;
        Height: string;
    };
    PackageWeight?: {
        UnitOfMeasurement: {
            Code: string;
            Description?: string;
        };
        Weight: string;
    };
}

export interface UPSRateRequest {
    RateRequest: {
        Request: {
            RequestOption: string;
            TransactionReference?: {
                CustomerContext: string;
            };
        };
        Shipment: {
            Shipper?: {
                Name?: string;
                ShipperNumber?: string;
                Address: UPSAddress;
            };
            ShipTo: {
                Name?: string;
                Address: UPSAddress;
            };
            ShipFrom?: {
                Name?: string;
                Address: UPSAddress;
            };
            PaymentDetails?: {
                ShipmentCharge?: Array<{
                    Type: string;
                    BillShipper?: {
                        AccountNumber: string;
                    };
                }>;
            };
            Service?: {
                Code: string;
                Description?: string;
            };
            NumOfPieces?: string;
            Package?: UPSPackage;
        };
    };
}

export interface UPSRateResponse {
    RateResponse: {
        Response: {
            ResponseStatus: {
                Code: string;
                Description: string;
            };
            Alert?: Array<{
                Code: string;
                Description: string;
            }>;
        };
        RatedShipment: Array<{
            Service: {
                Code: string;
                Description: string;
            };
            RatedShipmentAlert?: Array<{
                Code: string;
                Description: string;
            }>;
            BillingWeight: {
                UnitOfMeasurement: {
                    Code: string;
                    Description: string;
                };
                Weight: string;
            };
            TransportationCharges: {
                CurrencyCode: string;
                MonetaryValue: string;
            };
            ServiceOptionsCharges: {
                CurrencyCode: string;
                MonetaryValue: string;
            };
            TotalCharges: {
                CurrencyCode: string;
                MonetaryValue: string;
            };
            GuaranteedDelivery?: {
                BusinessDaysInTransit: string;
                DeliveryByTime: string;
            };
            RatedPackage?: Array<{
                Weight: string;
                BillingWeight: {
                    UnitOfMeasurement: {
                        Code: string;
                    };
                    Weight: string;
                };
            }>;
        }>;
    };
}

export enum UPSServiceCode {
    UPS_NEXT_DAY_AIR = '01',
    UPS_SECOND_DAY_AIR = '02',
    UPS_GROUND = '03',
    UPS_WORLDWIDE_EXPRESS = '07',
    UPS_WORLDWIDE_EXPEDITED = '08',
    UPS_STANDARD = '11',
    UPS_3_DAY_SELECT = '12',
    UPS_NEXT_DAY_AIR_SAVER = '13',
    UPS_NEXT_DAY_AIR_EARLY_AM = '14',
    UPS_WORLDWIDE_EXPRESS_PLUS = '54',
    UPS_SECOND_DAY_AIR_AM = '59',
    UPS_SAVER = '65',
    UPS_ACCESS_POINT_ECONOMY = '70',
    UPS_STANDARD_OVERNIGHT = '82',
    UPS_FIRST_CLASS_MAIL = '84',
    UPS_PRIORITY_MAIL = '85',
    UPS_EXPEDITED_MAIL_INNOVATIONS = '86',
    UPS_PRIORITY_MAIL_INNOVATIONS = '87',
    UPS_ECONOMY_MAIL_INNOVATIONS = '88',
    UPS_GROUND_FREIGHT_PRICING = '93',
    UPS_GROUND_FREIGHT = '94',
    UPS_STANDARD_FREIGHT = '95',
    UPS_WORLDWIDE_ECONOMY_DDU = '96',
    UPS_WORLDWIDE_ECONOMY_DDP = '97',
    UPS_SIMPLE_RATE = 'M0',
    UPS_LARGEST_PACKAGE = 'M1',
    UPS_MEDIUM_PACKAGE = 'M2',
    UPS_SMALL_PACKAGE = 'M3',
    UPS_EXTRA_SMALL_PACKAGE = 'M4',
}

export enum UPSPackagingCode {
    UPS_LETTER = '01',
    CUSTOMER_SUPPLIED_PACKAGE = '02',
    TUBE = '03',
    PAK = '04',
    UPS_EXPRESS_BOX = '21',
    UPS_25_KG_BOX = '24',
    UPS_10_KG_BOX = '25',
    PALLET = '30',
    CUSTOMER_SUPPLIED_BAG = '34',
    UPS_EXPRESS_ENVELOPE = '96',
    UPS_WORLDWIDE_DOCUMENT_BOX = '2a',
}