#include "OrderMatcher.h"
#include <iostream>

OrderMatcher::OrderMatcher(StrikerConfig config)
{
  verbose = config.VERBOSE;
}

void OrderMatcher::matchOrders(TradeList& tradeList, OrderList& buyList, OrderList& sellList, Decimal price)
{
  if (verbose)
    cout << endl << "Matching orders..." << endl;

  if (buyList.size() == 0 || sellList.size() == 0) 
    return;

  Order buyOrder = buyList.front();
  Order sellOrder = sellList.front();

  bool finished = false;

  while (!finished && buyOrder.getPrice() >= price && sellOrder.getPrice() <= price)
  {
    uint32_t amount = std::min(buyOrder.getAmount(), sellOrder.getAmount());

    Trade trade(amount, price, buyOrder, sellOrder);
    tradeList.push_back(trade);
    buyOrder.decreaseAmount(amount);
    sellOrder.decreaseAmount(amount);

    if (buyOrder.getAmount() == 0)
    {
      buyList.pop_front();
      if (buyList.size() > 0) 
	buyOrder = buyList.front();
      else
	finished = true;
    }

    if (sellOrder.getAmount() == 0)
    {
      sellList.pop_front();
      if (sellList.size() > 0) 
	sellOrder = sellList.front();
      else
	finished = true;
    }
  }
}
