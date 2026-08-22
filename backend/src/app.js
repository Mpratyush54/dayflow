import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

app.use('/api', routes);

app.use(errorHandler);

export default app;
