import { dates } from './dates.js'
import dotenv from 'dotenv';
dotenv.config();
// require('dotenv').config(); 

export async function fetchStockData({ticker, }) {
    // document.querySelector('.action-panel').style.display = 'none'
    // try {
        // const stockData = await Promise.all(tickersArr.map(async (ticker) => {
        //     const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${process.env.POLYGON_API_KEY}`
        //     const response = await fetch(url)
        //     const data = await response.text()
        //     const status = await response.status
        //     if (status === 200) {
        //         // apiMessage.innerText = 'Creating report...'
        //         console.log('Creating report...')
        //         return data
        //     } else {
        //         // loadingArea.innerText = 'There was an error fetching stock data.'
        //         console.log('There was an error fetching stock data.')
        //     }
        // }))
    try {
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${process.env.POLYGON_API_KEY}`
        const response = await fetch(url)
        const data = await response.text()
        const status = response.status // Removed await - response.status is not a promise
        if (status === 200) {
            // apiMessage.innerText = 'Creating report...'
            console.log('Creating report...')
            return data
        } else {
            // loadingArea.innerText = 'There was an error fetching stock data.'
            console.log('There was an error fetching stock data.')
            return JSON.stringify({error: `HTTP ${status}`})
        }
    } catch(err) {
        // loadingArea.innerText = 'There was an error fetching stock data.'
        console.log('There was an error fetching stock data.')
        console.error('error: ', err)
        return JSON.stringify({error: 'Failed to fetch stock data'})
    }
}

// Version of getLocation that uses fetch of current IP address to get the location
export async function getLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/')
    const text = await response.json()
    return JSON.stringify(text)
  } catch (err) {
    console.log(err)
    return JSON.stringify({error: 'Failed to get location'})  // Added return for error case
  }
}

export async function getTickerNews({ticker, }) {
    try {
        const url = ` https://api.marketaux.com/v1/news/all?symbols=${ticker}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
        const response = await fetch(url)
        const data = await response.text()
        const status = response.status // Removed await - response.status is not a promise
        if (status === 200) {
            // apiMessage.innerText = 'Creating report...'
            console.log('Creating report...')
            return data
        } else {
            console.log('There was an error fetching stock news data.')
            return JSON.stringify({error: `HTTP ${status}`})
        }
    } catch {
        console.log('There was an error fetching stock news data.')
        console.error('error: ', err)
        return JSON.stringify({error: 'Failed to fetch stock news data'})
    }
}

export const tools = [
    {
        type: "function",
        function: {
            name: "fetchStockData",
            description: "Get stock data for ticker",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Ticker symbol",
                    },
                },
                required: ["ticker"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getLocation",
            description: "Get the user's current location",
            // function: getLocation,
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getTickerNews",
            description: "Get news for the ticker",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Ticker symbol",
                    },
                },
                required: ["ticker"]
            }
        }
    },
]