import mongoose from 'mongoose';

const redactURI = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/, '$1******$3');
};

const connectDB = async () => {
  console.log('Attempting connection with MONGO_URI:', redactURI(process.env.MONGO_URI));
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not defined in your environment variables.');
    console.error('Please verify that a file named ".env" exists inside the backend directory, and that it defines MONGO_URI.');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
