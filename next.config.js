/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["lucide-react"]
}
const handleMongoDBErrors = () => {
  // Listen for unhandled promise rejections related to MongoDB
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      if (
        reason.message.includes('ECONNREFUSED') ||
        reason.message.includes('MongoNetworkError') ||
        reason.message.includes('MongoServerSelectionError')
      ) {
        console.error('MongoDB Connection Error:', reason.message);
        
        // In development, provide more detailed guidance
        if (process.env.NODE_ENV === 'development') {
          console.log('\nPossible solutions:');
          console.log('1. Check if your MongoDB URI is correct in .env.local');
          console.log('2. Make sure MongoDB Atlas IP whitelist includes your current IP');
          console.log('3. Verify MongoDB Atlas username and password');
          console.log('4. Check your network connection');
        }
      }
    }
  });
};

module.exports = nextConfig