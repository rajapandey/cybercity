import { Router, Request, Response } from 'express';
import { RateController } from '../controllers';

export class RateRoutes {
  private router: Router;

  constructor(private rateController: RateController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/rates/:carrier', (req: Request, res: Response) => {
      this.rateController.getRatesByCarrier(req, res);
    });

    this.router.post('/rates', (req: Request, res: Response) => {
      this.rateController.getAllRates(req, res);
    });

    this.router.post('/rates/cheapest', (req: Request, res: Response) => {
      this.rateController.getCheapestRate(req, res);
    });

    this.router.post('/rates/fastest', (req: Request, res: Response) => {
      this.rateController.getFastestRate(req, res);
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
