import OpenAI from 'openai';

require('dotenv').config(); 

/** Ensure the OpenAI API key is available and correctly configured */
if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Deepseek API key is missing or invalid.");
}

/** OpenAI config */
export default new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL,
    apiKey: process.env.DEEPSEEK_API_KEY,
    dangerouslyAllowBrowser: false
});
