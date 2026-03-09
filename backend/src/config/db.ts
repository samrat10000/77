import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || '';

if (!MONGO_URI) {
  console.warn('⚠️  No MONGODB_URI set — users will not persist across restarts');
}

export const connectDB = async () => {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
    }
  }
};
