import openai from './config.js';
import { fetchStockData, getLocation, getTickerNews, tools } from "./tools.js"

const availableFunctions = {
    fetchStockData,
    getLocation,
    getTickerNews,
}

async function agent(query) {
    const messages = [
        { role: "system", content: `
            You are a helpful investment bank research analyst AI agent. 
            Your job is to conduct fundamental research on companies using various data sources, including financial statements, news, earnings call of itself and of related companies, and forums.
            Based on a provided stock, provide a short summary of the stock's financial performance, based on recent price changes and relevant financial news as of late. 
            Provide the response as if it were the conclusion of a research report. 
            Prioritise gathering information with the tools provided rather than giving basic, generic answers.
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
            console.log('Response received from DeepSeek API')
            console.log('Response choice:', response.choices[0])

            const { finish_reason: finishReason, message } = response.choices[0] // Destructuring of object; finish_reason transferred out as finishReason in process
            const { tool_calls: toolCalls } = message // Get toolCalls out of message above
            
            messages.push(message)
            
            if (finishReason === "stop") {
                console.log(message) // Print message
                console.log("AGENT ENDING")
                return // Stop the loop
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
                        console.log(`Tool response: ${functionResponse?.substring(0, 200)}...`) // First 200 chars
                        
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
}

// Test the configuration first
console.log('Testing configuration...')
console.log('DeepSeek API Key present:', !!process.env.DEEPSEEK_API_KEY)
console.log('DeepSeek Base URL:', process.env.DEEPSEEK_BASE_URL)
console.log('Polygon API Key present:', !!process.env.POLYGON_API_KEY)

await agent("Provide information on Tesla stocks.")
