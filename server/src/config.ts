import dotenv from 'dotenv';
import path from 'path';

// in dev, __dirname is server/src. in production (compiled), its server/dist
// either way, go up one level to find server/
const serverRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(serverRoot, '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  dbPath: process.env.DB_PATH || path.resolve(serverRoot, 'data/feedback.db'),
};
