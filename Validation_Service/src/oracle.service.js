require('dotenv').config();
const axios = require("axios");


async function getPrice(pair) {
  var res = null;
    try {
        const result = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
        res = result.data;

    } catch (err) {
      try {
        const result2 = await axios.get(`https://api.binance.us/api/v3/ticker/price?symbol=${pair}`);
        res = result2.data;
        
      } catch (fallbackErr) {
        console.error('Failed to get price: ', fallbackErr)
      }
    }
    return res;
  }
  
  module.exports = {
    getPrice,
  }
