import express from 'express';
import { RateController } from './controllers';
import { RateRoutes } from './routes';
import {
  configureMiddleware,
  initializeRateService,
  createErrorHandler,
  createNotFoundHandler,
} from './utils';

// Initialize Express app
const app = express();
const port = process.env.PORT;

// Configure middleware
configureMiddleware(app);

const rateService = initializeRateService();
const rateController = new RateController(rateService);
const rateRoutes = new RateRoutes(rateController);

// Register routes
app.use('/api', rateRoutes.getRouter());

// Error handling
app.use(createErrorHandler());
app.use(createNotFoundHandler());

app.listen(port, () => {
  console.log(`📡 Server running on port ${port}`);
});
