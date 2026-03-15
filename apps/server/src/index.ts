import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scenariosRouter from './routes/scenarios';
import actionsRouter from './routes/actions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/scenarios', scenariosRouter);
app.use('/api', scenariosRouter); // Mount cases via scenarios router 
app.use('/api/actions', actionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
