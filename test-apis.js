// test-apis.js
import openai from './config.js';
import { StockSummaryDB } from './utils/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function testDeepSeekAPI() {
    console.log('Testing DeepSeek API...')
    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "user", content: "Hello, can you respond with just 'API working'?" }
            ],
            max_tokens: 10,
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ DeepSeek API working!')
        console.log('Response:', response.choices[0].message.content)
        return true
    } catch (err) {
        console.log('❌ DeepSeek API failed:', err.message)
        return false
    }
}

async function testPolygonAPI() {
    console.log('Testing Polygon API...')
    try {
        const testTicker = 'AAPL'
        const testUrl = `https://api.polygon.io/v2/aggs/ticker/${testTicker}/range/1/day/2024-01-01/2024-01-02?apiKey=${process.env.POLYGON_API_KEY}`
        
        const response = await fetch(testUrl)
        const status = response.status
        const data = await response.text()
        
        console.log('Polygon API status:', status)
        console.log('Polygon API response preview:', data.substring(0, 200))
        
        if (status === 200) {
            console.log('✅ Polygon API working!')
            return true
        } else {
            console.log('❌ Polygon API failed with status:', status)
            return false
        }
    } catch (err) {
        console.log('❌ Polygon API failed:', err.message)
        return false
    }
}

async function testMarketauxAPI() {
    console.log('Testing Marketaux API...')
    try {
        const testTicker = 'AAPL'
        const testUrl = `https://api.marketaux.com/v1/news/all?symbols=${testTicker}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}` // Implement MARKETAUX_API_KEY
        
        const response = await fetch(testUrl)
        const status = response.status
        const data = await response.text()
        
        console.log('Marketaux API status:', status)
        console.log('Marketaux API response preview:', data.substring(0, 200))
        
        if (status === 200) {
            console.log('✅ Marketaux API working!')
            return true
        } else {
            console.log('❌ Marketaux API failed with status:', status)
            return false
        }
    } catch (err) {
        console.log('❌ Marketaux API failed:', err.message)
        return false
    }
}

async function runTests() {
    console.log('=== API Configuration Test ===')
    console.log('DeepSeek API Key:', process.env.DEEPSEEK_API_KEY ? 'Present' : 'Missing')
    console.log('DeepSeek Base URL:', process.env.DEEPSEEK_BASE_URL || 'Missing')
    console.log('Polygon API Key:', process.env.POLYGON_API_KEY ? 'Present' : 'Missing')
    console.log('Marketaux API Key:', process.env.MARKETAUX_API_KEY ? 'Present' : 'Missing')
    
    console.log()
    
    const deepSeekWorking = await testDeepSeekAPI()
    console.log()
    const polygonWorking = await testPolygonAPI()
    console.log()
    const marketauxWorking = await testMarketauxAPI()
    console.log()

    const stockDB = new StockSummaryDB();
    const databaseWorking = await stockDB.testConnection(); // Test the connection for database
    stockDB.close()
    
    console.log()
    console.log('=== Test Results ===')
    console.log('DeepSeek API:', deepSeekWorking ? '✅ Working' : '❌ Failed')
    console.log('Polygon API:', polygonWorking ? '✅ Working' : '❌ Failed')
    console.log('Marketaux API:', marketauxWorking ? '✅ Working' : '❌ Failed')
    console.log('Database connected:', databaseWorking ? '✅ Working' : '❌ Failed');
    
    if (deepSeekWorking && polygonWorking && marketauxWorking && databaseWorking) {
        console.log('🎉 All APIs working! You can run your main script.')
    } else {
        console.log('⚠️  Some APIs are not working. Check your credentials and network connection.')
    }
}

runTests()