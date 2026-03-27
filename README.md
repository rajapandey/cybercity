# Cybership UPS Rating API Integration

A production-grade TypeScript implementation of the UPS Rating API with extensible architecture for multi-carrier support.

## 🎯 Design Decisions

### Key Architectural Choices

**Interface-Driven Design**: All carriers implement `ICarrier` interface for consistency and extensibility.

**Separation of Concerns**: Authentication (`OAuthManager`), HTTP (`HTTPClient`), and business logic (`RateService`) are isolated for testability.

**Type Safety + Runtime Validation**: TypeScript for compile-time safety + Zod for runtime validation of external API responses.

**OAuth Token Caching**: In-memory caching with 5-minute expiry buffer balances performance and reliability.

**Structured Error Handling**: Custom error classes extending `CarrierIntegrationError` provide meaningful error context.

**Mock-First Testing**: Stubbed HTTP responses ensure reliable tests without API dependencies.

**Environment Configuration**: All secrets from environment variables for security and deployment flexibility.

**In-Memory vs Redis Caching**: Chose in-memory for simplicity; can upgrade to Redis without breaking interface


## ��️ Architecture

```
src/
├── auth/                 # Authentication logic
│   └── OAuthManager.ts    
├── carriers/             # Carrier implementations
│   └── ups/
│       └── UPSCarrier.ts
├── controllers/          # Request controllers
│   └── index.ts          
├── http/                 # HTTP client implementation
│   └── HTTPClient.ts     
├── interfaces/           # All interface contracts
│   ├── index.ts        
│   ├── auth.ts          
│   ├── carrier.ts       
│   ├── http.ts          
│   ├── types.ts         
│   └── carriers/        
│       ├── index.ts    
│       └── ups.ts    
├── routes/              # Route definitions
│   └── index.ts    
├── schemas/             # Zod validation schemas
│   ├── index.ts      
│   └── validation.ts
├── services/            # Main rate shopping service
│   └── RateService.ts 
├── utils/               
│   ├── index.ts         
│   ├── handlers.ts    
│   ├── middleware.ts   
│   └── serviceInit.ts   
└── index.ts            # Main entry point
```

## 🚀 Features Implemented



1. **Rate Shopping**

2. **OAuth 2.0 Authentication**

3. **Extensible Architecture**

4. **Configuration Management**

5. **Type Safety & Validation**

6. **Error Handling**

7. **Integration Tests**

### Basic Rate Request

```typescript
import { RateService, Carrier, ServiceLevel } from './src/services/RateService';

const rateService = new RateService({
  [Carrier.UPS]: {
    clientId: process.env.UPS_CLIENT_ID,
    clientSecret: process.env.UPS_CLIENT_SECRET,
    accountNumber: process.env.UPS_ACCOUNT_NUMBER,
  },
});

// Initialize carrier with configuration
await rateService.initializeCarrier(Carrier.UPS, { 
  sandbox: true,
  version: 'v2409',
  requestOption: 'Shop'
});

// Get rates
const quotes = await rateService.getRates({
  carrier: Carrier.UPS,
  serviceLevel: ServiceLevel.GROUND,
  origin: {
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
  destination: {
    street1: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90210',
    country: 'US',
  },
  packages: [{
    length: 10,
    width: 8,
    height: 6,
    weight: 5,
    weightUnit: 'lb',
    dimensionUnit: 'in',
  }],
});
```

### Multi-Carrier Rate Shopping

```typescript
// Get rates from all carriers
const allQuotes = await rateService.getRatesFromAllCarriers({
  origin: { /* ... */ },
  destination: { /* ... */ },
  packages: [/* ... */],
});

// Find cheapest option
const cheapest = await rateService.getCheapestRate(request);

// Find fastest option
const fastest = await rateService.getFastestRate(request);
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```


### Carrier Configuration

```typescript
const carrierConfig = {
  carrier: Carrier.UPS,
  sandbox: true,  // Set to false for production
  credentials: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountNumber: 'your-account-number',
  },
};
```

## 🔌 Extensibility

### Adding a New Carrier

1. Create carrier interfaces in `src/interfaces/carriers/newcarrier.ts`
2. Implement carrier class in `src/carriers/newcarrier/NewCarrier.ts`
3. Add carrier enum to `src/interfaces/types.ts`
4. Add carrier initialization case in `src/services/RateService.ts`
5. Add integration tests

```typescript
// Example: NewCarrier implementation
export class NewCarrier implements ICarrier {
  constructor(config: NewCarrierConfig, isSandbox: boolean, options: NewCarrierOptions) {}
  
  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // Implementation
  }
}
```

## 🚀 Getting Started

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd cybership-ups-rating
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your UPS credentials
   ```

3. **Run Demo**
   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## 📝 Future Enhancements

Given more time, I would implement:

1. **Additional Carriers**: FedEx, USPS, DHL implementations
2. **Advanced Features**: Label generation, tracking, address validation
3. **Caching Layer**: Redis-based caching for rates and tokens
4. **API Gateway**: REST API wrapper for microservice architecture
5. **Rate Limiting**: Advanced rate limiting with Redis
6. **Batch Processing**: Bulk rate requests for efficiency
