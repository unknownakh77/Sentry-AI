import path from 'path';
import dotenv from 'dotenv';
const rootDir = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { AutonomousService } from './services/autonomous';
import scenariosRouter from './routes/scenarios';
import casesRouter from './routes/cases';

const app = express();
const PORT = env.port;

console.log(`[INIT] Environment loaded. OpenAI Key: ${process.env.OPENAI_API_KEY ? 'Present' : 'MISSING'}`);

app.use(cors());
app.use(express.json());

app.use('/api/scenarios', scenariosRouter);
app.use('/api/cases', casesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

AutonomousService.start();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
