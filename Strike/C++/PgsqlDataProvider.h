//=================================
// include guard
#ifndef __PGSQL_DATA_PROVIDER_H_INCLUDED__
#define __PGSQL_DATA_PROVIDER_H_INCLUDED__
//=================================

#include <pqxx/pqxx> 
#include <vector>
#include <string>
#include "Stock.h"
#include "Trade.h"
#include "Order.h"
#include "OrderType.h"
#include "StrikerConfig.h"


class PgsqlDataProvider
{

private:
  bool verbose;
  pqxx::connection* conn;
  OrderList getOrders(OrderType type, string methodName, uint32_t stockId);
  string prepareProcessTradesQuery(const TradeList& tradeList); 
  string format(Trade trade);
  string getPrice(string methodName, uint32_t stockId);
#ifndef __STD_C_PLUS_PLUS_11__
  template <typename T> string to_string(T number);    // metoda pro pripad, ze nelze pouzit std=c++11
#endif

public:
//  PgsqlDataProvider();
  ~PgsqlDataProvider();

  bool initialize(StrikerConfig config);
  void registerStriker(const char* address, const char* port);

  Stock getStock(uint32_t id);
  OrderList getCrossedBuyOrders(uint32_t stockId);
  OrderList getCrossedSellOrders(uint32_t stockId);
  string processTrades(const TradeList& tradeList); 
  string getBidPrice(uint32_t stockId);
  string getAskPrice(uint32_t stockId);

};

typedef pqxx::result::const_iterator ResultIterator;

#endif // __PGSQL_DATA_PROVIDER_H_INCLUDED__ 
