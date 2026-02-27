
import { config } from 'dotenv';
config();

// Ensure the Google AI key provided by the user is prioritised
if (!process.env.GOOGLE_GENAI_API_KEY) {
    process.env.GOOGLE_GENAI_API_KEY = 'AIzaSyDg5Pvcz7y7Quy3zezGrJLIkCfunTsZZj8';
}
