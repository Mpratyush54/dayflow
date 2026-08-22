import dns from 'node:dns';
import mongoose from 'mongoose';

// Corporate DNS (10.219.39.38) intermittently ECONNREFUSED on SRV (_mongodb._tcp)
// queries for Atlas. Force public resolvers so mongodb+srv works everywhere.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

export async function connectDB() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env and fill it in');
  }
  await mongoose.connect(url);
  console.log('Connected to database');
}
