//=================================
// include guard
#ifndef __JSON_DATA_PROVIDER_H_INCLUDED__
#define __JSON_DATA_PROVIDER_H_INCLUDED__
//=================================

#include <vector>
#include <string>
#include "Decimal.h"
#include "Trade.h"


class JsonDataProvider
{

private:
  string serialize(const TradeList& tradeList);
  string serialize(Trade trade);

public:
  string serialize(uint32_t stockId, Decimal price, uint32_t amount, 
	string bid, string ask, string strikeTime, const TradeList& tradeList); 

};

#endif // __JSON_DATA_PROVIDER_H_INCLUDED__ 
