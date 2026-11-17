// src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '@shared/utils/logger';

dotenv.config();

const dbUri =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGODB_URI
    : process.env.MONGODB_URI_DEV;

const poolSize = process.env.NODE_ENV === 'production' ? 20 : 5;

export const connectDB = async () => {
  try {
    await mongoose.connect(dbUri as string, {
      maxPoolSize: poolSize,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    });
    logger.info(`✅ MongoDB connected success! (pool: ${poolSize})`);
  } catch (error) {
    // console.error síncrono: com process.exit logo em seguida, o Winston
    // não descarrega o transporte e a mensagem some.
    console.error(`Error connecting to MongoDB: ${JSON.stringify(error)}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) return;

  await mongoose.disconnect();
  logger.info('MongoDB disconnected successfully.');
};
