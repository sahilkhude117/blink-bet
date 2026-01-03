import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
  
  // Kalshi API Configuration (shared account for MVP)
  kalshi: {
    apiUrl: process.env.KALSHI_API_URL || 'https://demo-api.kalshi.co/trade-api/v2',
    apiKey: process.env.KALSHI_API_KEY || '',
    privateKey: process.env.KALSHI_PRIVATE_KEY ? 
      process.env.KALSHI_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  },
  
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    rpcFallback: process.env.SOLANA_RPC_FALLBACK || '',
    commitment: 'confirmed' as const,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },
  
  // Known SPL token addresses on Solana
  tokens: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Native USDC on Solana
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  },
};


