import express from 'express';
import cors from 'cors';
import { config } from './config';

const app = express();

app.use(cors());
app.use(express.json());

// health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
