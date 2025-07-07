import openai from './config.js';
import { fetchStockData, getLocation, tools } from "./tools.js"

const availableFunctions = {
    fetchStockData,
    getLocation
}

async function agent(query) {
    const messages = [
        { role: "system", content: "You are a helpful investment bank research analyst AI agent. Based on a provided stock, provide a short summary of the stock's financial performance, based on recent price changes and relevant financial news as of late. Give highly specific answers based on the information you're provided. Prioritise gathering information with the tools provided to you rather than giving basic, generic answers." },
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
                // temperature: 1.1,
                // presence_penalty: 0,
                // frequency_penalty: 0,
                // max_tokens: 7,
            });
            console.log(response.choices[0])
            const { finish_reason: finishReason, message } = response.choices[0] // Destructuring of object; finish_reason transferred out as finishReason in process
            const { tool_calls: toolCalls } = message // Get toolCalls out of message above
            
            messages.push(message)
            
            if (finishReason === "stop") {
                console.log(message) // Print message
                console.log("AGENT ENDING")
                return // Stop the loop
            } else if (finishReason === "tool_calls") {
                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name
                    const functionToCall = availableFunctions[functionName]
                    const functionArguments = JSON.parse(toolCall.function.arguments)
                    const functionResponse = await functionToCall(functionArguments)
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResponse
                    })
                }
            }
        } catch (err) {
            console.error(err.message)
            // loadingArea.innerText = 'Unable to access AI. Please refresh and try again'
        }
    }
}

await agent("Provide information on Tesla stocks.")
