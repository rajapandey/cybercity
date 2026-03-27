import { Request, Response } from 'express';
import { RateService } from '../services/RateService';
import { Carrier, RateRequest } from '../interfaces/types';

export class RateController {
  constructor(private rateService: RateService) { }

  async getRatesByCarrier(req: Request, res: Response): Promise<void> {
    try {
      const { carrier } = req.params;
      const rateRequest: RateRequest = req.body;

      if (!Object.values(Carrier).includes(carrier as Carrier)) {
        res.status(400).json({
          success: false,
          error: `Invalid carrier: ${carrier}`,
          validCarriers: Object.values(Carrier),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      rateRequest.carrier = carrier as Carrier;

      const quotes = await this.rateService.getRates(rateRequest);

      res.json({
        success: true,
        carrier,
        quotes,
        count: quotes.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Rate request error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getAllRates(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, packages, serviceLevel } = req.body;

      const quotes = await this.rateService.getRatesFromAllCarriers({
        origin,
        destination,
        packages,
        serviceLevel,
      } as Omit<RateRequest, 'carrier'>);

      res.json({
        success: true,
        quotes,
        count: quotes.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Multi-carrier rate request error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getCheapestRate(req: Request, res: Response): Promise<void> {
    try {
      const rateRequest: RateRequest = req.body;
      const cheapest = await this.rateService.getCheapestRate(rateRequest);

      if (!cheapest) {
        res.status(404).json({
          success: false,
          error: 'No rates available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        quote: cheapest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cheapest rate request error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getFastestRate(req: Request, res: Response): Promise<void> {
    try {
      const rateRequest: RateRequest = req.body;
      const fastest = await this.rateService.getFastestRate(rateRequest);

      if (!fastest) {
        res.status(404).json({
          success: false,
          error: 'No rates available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        quote: fastest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Fastest rate request error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
