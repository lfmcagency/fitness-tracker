/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["lucide-react"],
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      issuer: { and: [/\.(js|ts|md)x?$/] },
      type: 'asset/resource',
    });
    return config;
  },
}

// Handle MongoDB error logging
const handleMongoDBErrors = () => {
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      if (
        reason.message.includes('ECONNREFUSED') ||
        reason.message.includes('MongoNetworkError') ||
        reason.message.includes('MongoServerSelectionError')
      ) {
        console.error('MongoDB Connection Error:', reason.message);
        
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

// Call the error handler
handleMongoDBErrors();

module.exports = nextConfig;