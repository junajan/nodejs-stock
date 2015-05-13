//=================================
// include guard
#ifndef __ORDER_MATCHER_H_INCLUDED__
#define __ORDER_MATCHER_H_INCLUDED__
//=================================

#include "Trade.h"
#include "Order.h"
#include "Decimal.h"
#include "StrikerConfig.h"


class OrderMatcher
{

private:
  bool verbose;

public:
  OrderMatcher(StrikerConfig config);
  void matchOrders(TradeList& tradeList, OrderList& buyList, OrderList& sellList, Decimal price);

};

#endif // __ORDER_MATCHER_H_INCLUDED__ 
