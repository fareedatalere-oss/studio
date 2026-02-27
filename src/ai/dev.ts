
import { config } from 'dotenv';
config();

// Force the Google AI key provided by the user in all possible places
process.env.GOOGLE_GENAI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';
process.env.GEMINI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';
