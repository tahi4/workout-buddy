import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_RETRIES = 10;

const listenWithPortFallback = (port, retriesLeft) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
      listenWithPortFallback(nextPort, retriesLeft - 1);
      return;
    }

    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
};

const startServer = async () => {
  await connectDB();
  listenWithPortFallback(PORT, MAX_PORT_RETRIES);
};

startServer();
