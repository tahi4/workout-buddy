import express from 'express';
import cors from 'cors';
import user from './routes/userRoutes.js'
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from backend API!');
});

app.use('/user', user);

export default app;
