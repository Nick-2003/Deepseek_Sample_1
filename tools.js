import { dates } from './utils/dates.js'
import dotenv from 'dotenv';
dotenv.config();
// require('dotenv').config(); 

export async function fetchStockData({tickersArr, }) {
    document.querySelector('.action-panel').style.display = 'none'
    try {
        const stockData = await Promise.all(tickersArr.map(async (ticker) => {
            const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${process.env.POLYGON_API_KEY}`
            const response = await fetch(url)
            const data = await response.text()
            const status = await response.status
            if (status === 200) {
                // apiMessage.innerText = 'Creating report...'
                console.log('Creating report...')
                return data
            } else {
                // loadingArea.innerText = 'There was an error fetching stock data.'
                console.log('There was an error fetching stock data.')
            }
        }))
        return stockData
    } catch(err) {
        // loadingArea.innerText = 'There was an error fetching stock data.'
        console.log('There was an error fetching stock data.')
        console.error('error: ', err)
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
  }
}

export const tools = [
    {
        type: "function",
        function: {
            name: "fetchStockData",
            description: "Get stock data for given list of tickers",
            parameters: {
                type: "object",
                properties: {
                    tickersArr: {
                        type: "array",
                        description: "Array of tickers",
                    },
                },
                required: ["location"]
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
]