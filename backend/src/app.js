import express from 'express';
import routes from './routes/index.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

export default app;
