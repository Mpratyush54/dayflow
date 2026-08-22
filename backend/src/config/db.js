import mongoose from 'mongoose';

export async function connectDB() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env and fill it in');
  }
  await mongoose.connect(url);
  console.log('Connected to database');
}
