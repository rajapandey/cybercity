import { RateService } from '../services/RateService';
import { Carrier } from '../interfaces/types';

export function initializeRateService(): RateService {
  const rateService = new RateService({
    [Carrier.UPS]: {
      clientId: process.env.UPS_CLIENT_ID,
      clientSecret: process.env.UPS_CLIENT_SECRET,
      accountNumber: process.env.UPS_ACCOUNT_NUMBER,
    },
    [Carrier.FedEx]: {},
    [Carrier.USPS]: {},
    [Carrier.DHL]: {}
  });

  const upsOptions = {
    version: process.env.UPS_API_VERSION,
    requestOption: process.env.UPS_REQUEST_OPTION,
  };

  rateService.initializeCarrier(Carrier.UPS, {
    sandbox: true,
    ...upsOptions
  });

  return rateService;
}
