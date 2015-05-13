//#include <iostream>
#include <sstream>
#include "JsonDataProvider.h"

using namespace std;


string JsonDataProvider::serialize(uint32_t stockId, Decimal price, uint32_t amount, 
	string bid, string ask, string strikeTime, const TradeList& tradeList)
{
  ostringstream result;
  result << "{" << "\"info\": {" <<
      "\"stockId\":" << stockId << ", " << 
      "\"price\":" << price.toString() << ", " << 
      "\"totalAmount\":" << amount << ", " << 
      "\"bid\":" << bid << ", " << 
      "\"ask\":" << ask << ", " << 
      "\"strikeTime\":" << "\"" << strikeTime << "\"" << "}, " << 
      "\"trades\":" << serialize(tradeList) << "}";

  return result.str();
}

string JsonDataProvider::serialize(const TradeList& tradeList)
{
  ostringstream result;
  result << "[";

  if (tradeList.size() != 0)
  {
    ConstTradeIterator iterator = tradeList.begin();
    ConstTradeIterator endIterator = tradeList.end();

    result << serialize(*iterator);
    iterator++;
    
    while (iterator != endIterator)
    {
      result << ", " << serialize(*iterator);
      iterator++;
    }
  }

  result << "]";

  return result.str();
}

string JsonDataProvider::serialize(Trade trade)
{
  ostringstream result;
  result << "{" << 
      "\"buyOrderId\":" << trade.getBuyOrderId() << ", " << 
      "\"sellOrderId\":" << trade.getSellOrderId() << ", " << 
      "\"buyerId\":" << trade.getBuyerId() << ", " << 
      "\"sellerId\":" << trade.getSellerId() << ", " << 
      "\"amount\":" << trade.getAmount() << "}";
  return result.str();
}

