# Deepseek agent

## Example run

```{bash}
(base) S21617-T080120:Deepseek_Sample_1 student$ node main.js
[dotenv@17.0.1] injecting env (3) from .env – [tip] encrypt with dotenvx: https://dotenvx.com
[dotenv@17.0.1] injecting env (0) from .env – [tip] encrypt with dotenvx: https://dotenvx.com
Iteration #1
{
  index: 0,
  message: { role: 'assistant', content: '', tool_calls: [ [Object] ] },
  logprobs: null,
  finish_reason: 'tool_calls'
}
There was an error fetching stock data.
error:  ReferenceError: ticker is not defined
    at fetchStockData (file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/tools.js:23:62)
    at agent (file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/main.js:45:52)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/main.js:61:1
Iteration #2
{
  index: 0,
  message: {
    role: 'assistant',
    content: 'I encountered an issue while trying to fetch the latest stock data for Tesla (TSLA). Let me try again to retrieve the information for you.',
    tool_calls: [ [Object] ]
  },
  logprobs: null,
  finish_reason: 'tool_calls'
}
There was an error fetching stock data.
error:  ReferenceError: ticker is not defined
    at fetchStockData (file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/tools.js:23:62)
    at agent (file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/main.js:45:52)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async file:///Users/student/Documents%20%E2%80%93%20SNG058/Work/Sharppoint/Deepseek_Sample_1/main.js:61:1
Iteration #3
{
  index: 0,
  message: {
    role: 'assistant',
    content: "Unfortunately, I'm unable to retrieve the latest stock data for Tesla (TSLA) at the moment. This could be due to a temporary issue with the data source. If you'd like, I can try again later or provide general insights based on recent trends if you specify a time frame or aspect of Tesla's financial performance you're interested in. Let me know how you'd like to proceed!"
  },
  logprobs: null,
  finish_reason: 'stop'
}
{
  role: 'assistant',
  content: "Unfortunately, I'm unable to retrieve the latest stock data for Tesla (TSLA) at the moment. This could be due to a temporary issue with the data source. If you'd like, I can try again later or provide general insights based on recent trends if you specify a time frame or aspect of Tesla's financial performance you're interested in. Let me know how you'd like to proceed!"
}
AGENT ENDING
```