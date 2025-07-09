import openai from './config.js';
import { fetchStockData, getLocation, getTickerNews, tools } from "./utils/tools.js"
import { StockSummaryDB } from './utils/database.js';

const availableFunctions = {
    fetchStockData,
    getLocation,
    getTickerNews,
}

async function extractTickerFromQuery(query) {
    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { 
                    role: "system", 
                    content: "Extract the stock ticker symbol from the user's query. Return only the ticker symbol in uppercase (e.g., TSLA, AAPL, MSFT). If no ticker is found, return 'UNKNOWN'." 
                },
                { role: "user", content: query }
            ],
            max_tokens: 10,
            timeout: 30000, // 30 second timeout
        });
        
        const extractedTicker = response.choices[0].message.content.trim().toUpperCase();
        return extractedTicker !== 'UNKNOWN' ? extractedTicker : null;
    } catch (err) {
        console.error('Error extracting ticker:', err.message);
        // Fallback to simple extraction
        return stockDB.extractTicker(query);
    }
}

async function agent(query) {
    // Create a new database instance for this agent run
    const stockDB = new StockSummaryDB();

    try {
        // Test database connection first
        const dbConnected = await stockDB.testConnection();
        if (!dbConnected) {
            console.log('Database connection failed, proceeding without cache');
        }

        // Extract ticker
        const ticker = await extractTickerFromQuery(query);
        console.log('Extracted ticker:', ticker);

        // Check if we have a cached summary
        let useCache = false;
        let cachedSummary = null;

        // If the ticker is obtained from extraction
        if (ticker) {
            // Get corresponding summary
            cachedSummary = await stockDB.getSummary(ticker); 
            // Check if summary is stale, if it exists
            if (cachedSummary && !(await stockDB.isSummaryStale(cachedSummary, 1))) {
                useCache = true;
                console.log(`Using cached summary for ${ticker} (generated at ${cachedSummary.generatedAt})`);
            } else if (cachedSummary) {
                console.log(`Cached summary for ${ticker} is stale (generated at ${cachedSummary.generatedAt}), generating new one`);
            } else {
                console.log(`No cached summary found for ${ticker}, generating new one`);
            }
        }

        // If we have a fresh cached summary, return it and end loop preemptively
        if (useCache && cachedSummary) {
            console.log("=== CACHED SUMMARY ===");
            console.log(cachedSummary.summary);
            console.log("AGENT ENDING (from cache)");
            return {
                success: true,
                source: 'cache',
                ticker: ticker,
                summary: cachedSummary.summary,
                generatedAt: cachedSummary.generatedAt
            };
        } else {
            // Otherwise, generate a new summary
            const messages = [
                { role: "system", content: `
                    You are a helpful investment bank research analyst AI agent. Your job is to conduct fundamental research on companies using various data sources, including financial statements, news, earnings call of itself and of related companies, and forums.
                    Based on a provided stock, provide a short summary of the stock's financial performance, based on recent price changes and relevant financial news as of late. 
                    * If there is a stock news summary available from the database and the specified period of time has not passed yet, provide that summary instead of generating a response; otherwise, generate a new summary and save it and its corresponding generation time into the database.
                    * Provide the response as if it were the conclusion of a research report. 
                    * Prioritise gathering information with the tools provided rather than giving basic, generic answers.
                    ` },
                { role: "user", content: query }
            ]

            // Loop before using automatic function calling:
            const MAX_ITERATIONS = 5
            for (let i = 0; i < MAX_ITERATIONS; i++) {

                console.log(`Iteration #${i + 1}`)
                try {
                    const response = await openai.chat.completions.create({
                        model: "deepseek-chat",
                        messages: messages,
                        tools: tools,
                        timeout: 30000, // 30 second timeout
                        // temperature: 1.1,
                        // presence_penalty: 0,
                        // frequency_penalty: 0,
                        // max_tokens: 7,
                    });
                    // console.log('Response received from DeepSeek API')
                    // console.log('Response choice:', response.choices[0])

                    const { finish_reason: finishReason, message } = response.choices[0] // Destructuring of object; finish_reason transferred out as finishReason in process
                    const { tool_calls: toolCalls } = message // Get toolCalls out of message above
                    
                    console.log('Finish reason:', finishReason);
                    // console.log('Message:', message);

                    messages.push(message)
                    
                    if (finishReason === "stop") {
                        console.log(message.content); // Print message
                        console.log("AGENT ENDING (from generation)");
                        // Save message to database if we have a ticker
                        if (ticker && message.content) {
                            await stockDB.saveSummary(ticker, message.content);
                            console.log(`Summary saved to database for ${ticker}`);
                        }
                        // console.log('Full response:', JSON.stringify(response.choices[0], null, 2));
                        return {
                            success: true,
                            source: 'generated',
                            ticker: ticker,
                            summary: message.content,
                            generatedAt: new Date()
                        }; // Stop the loop
                    } else if (finishReason === "tool_calls") {
                        console.log('Tool calls requested:', toolCalls?.length || 0) // Debugging
                        for (const toolCall of toolCalls) {
                            console.log(`Executing tool: ${toolCall.function.name}`)
                            console.log(`Arguments: ${toolCall.function.arguments}`)
                            
                            const functionName = toolCall.function.name
                            const functionToCall = availableFunctions[functionName]
                            const functionArguments = JSON.parse(toolCall.function.arguments)
                            try {
                                const functionResponse = await functionToCall(functionArguments)
                                // console.log(`Tool response: ${functionResponse?.substring(0, 200)}...`) // First 200 chars
                                
                                messages.push({
                                    tool_call_id: toolCall.id,
                                    role: "tool",
                                    name: functionName,
                                    content: functionResponse
                                })
                            } catch (toolError) {
                                console.error(`Tool execution error for ${functionName}:`, toolError.message)
                                messages.push({
                                    tool_call_id: toolCall.id,
                                    role: "tool",
                                    name: functionName,
                                    content: JSON.stringify({error: `Tool execution failed: ${toolError.message}`})
                                })
                            }
                        }
                    }
                } catch (err) {
                    console.error('API Error:', err.message)
                    console.error('Error type:', err.constructor.name)
                    if (err.code) console.error('Error code:', err.code)
                    
                    // Break the loop if it's a persistent error
                    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
                        console.log('Breaking loop due to connection/timeout error')
                        break
                    }
                }
            }
            // If we get here, the agent didn't complete successfully
            console.log("AGENT ENDING (max iterations reached)");
            return {
                success: false,
                source: 'error',
                ticker: ticker,
                summary: null,
                error: 'Agent did not complete successfully (max iterations reached)'
            };
        }
    } catch {
        console.log("AGENT ENDING (error)");
        return {
            success: false,
            source: 'error',
            ticker: ticker,
            summary: null,
            error: 'Agent did not complete successfully (error)'
        };
    } finally {
        // Always close the database connection for this agent instance
        await stockDB.close();
        console.log('Database connection closed');
    }
}

// // Wrapper function to handle database cleanup
// async function runAgent(query) {
//     try {
//         const result = await agent(query);
//         return result;
//     } finally {
//         // Always close the database connection after agent execution
//         await stockDB.close();
//         console.log('Database connection closed');
//     }
// }

// Test the configuration first
console.log('Testing configuration...')
console.log('DeepSeek API Key present:', !!process.env.DEEPSEEK_API_KEY)
console.log('DeepSeek Base URL:', process.env.DEEPSEEK_BASE_URL)
console.log('Polygon API Key present:', !!process.env.POLYGON_API_KEY)

console.log('\n=== Caching #1 ===')
const result1 = await agent("Provide information on Tesla stocks.");
console.log('\n=== AGENT RESULT ===');
console.log('Success:', result1.success);
console.log('Source:', result1.source);
console.log('Ticker:', result1.ticker);
if (result1.error) {
    console.log('Error:', result1.error);
}

console.log('\n=== Retrieval #1 ===')
const result2 = await agent("Explain how Tesla stocks are performing as of late.");
console.log('\n=== AGENT RESULT ===');
console.log('Success:', result2.success);
console.log('Source:', result2.source);
console.log('Ticker:', result2.ticker);
if (result2.error) {
    console.log('Error:', result2.error);
}

console.log('\n=== Caching #2 ===')
const result3 = await agent("Describe the performance of Futu Holdings recently");
console.log('\n=== AGENT RESULT ===');
console.log('Success:', result3.success);
console.log('Source:', result3.source);
console.log('Ticker:', result3.ticker);
if (result3.error) {
    console.log('Error:', result3.error);
}