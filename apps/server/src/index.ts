import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
console.log(`[INIT] Environment loaded. Backboard Key: ${process.env.BACKBOARD_API_KEY ? 'Present' : 'MISSING'}`);

import express from 'express';
import cors from 'cors';
import { AutonomousService } from './services/autonomous';
import scenariosRouter from './routes/scenarios';
import casesRouter from './routes/cases';
import authRouter from './routes/auth';
import actionsRouter from './routes/actions';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/scenarios', scenariosRouter);
app.use('/api/cases', casesRouter);
app.use('/api/auth', authRouter);
app.use('/api/actions', actionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

AutonomousService.start();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
