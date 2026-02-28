import mongoose from 'mongoose';

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_URI_FALLBACK;

  try {
    if (!primaryUri && !fallbackUri) {
      throw new Error('MONGODB_URI is not set in environment variables.');
    }

    await mongoose.connect(primaryUri || fallbackUri);
    console.log('MongoDB connected successfully');
    console.log('Connection state:', mongoose.connection.readyState);
  } catch (error) {
    const isSrvResolutionError =
      String(error.message || '').includes('querySrv') ||
      String(error.message || '').includes('ENOTFOUND');

    if (isSrvResolutionError && fallbackUri && primaryUri) {
      try {
        console.warn('Primary SRV URI failed. Retrying with MONGODB_URI_FALLBACK...');
        await mongoose.connect(fallbackUri);
        console.log('MongoDB connected successfully (fallback URI)');
        console.log('Connection state:', mongoose.connection.readyState);
        return;
      } catch (fallbackError) {
        console.error('MongoDB fallback connection failed:', fallbackError.message);
        process.exit(1);
      }
    }

    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
