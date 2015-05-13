//=================================
// include guard
#ifndef __TRADE_H_INCLUDED__
#define __TRADE_H_INCLUDED__
//=================================

#include <vector>
#include "Decimal.h"

class Order;

class Trade
{

private:
  int amount;
  Decimal price; 
  int stockId; 
  int buyerId;
  int sellerId;
  int buyOrderId;
  int sellOrderId;

public:
  Trade(const uint32_t amount, Decimal price, Order buyOrder, Order sellOrder);
  Trade();

  uint32_t getAmount() const;
  void setAmount(const uint32_t amount);

  Decimal getPrice() const;
  void setPrice(Decimal price);

  uint32_t getStockId() const;
  void setStockId(const uint32_t stockId);

  uint32_t getBuyerId() const;
  void setBuyerId(const uint32_t buyerId);

  uint32_t getSellerId() const;
  void setSellerId(const uint32_t sellerId);

  uint64_t getBuyOrderId() const;
  void setBuyOrderId(const uint64_t buyOrderId);

  uint64_t getSellOrderId() const;
  void setSellOrderId(const uint64_t sellOrderId);
};

typedef std::vector<Trade> TradeList; // -> asi jedno, jestli vector nebo deque - muzu vyzkouset, co bude rychlejsi
typedef TradeList::const_iterator ConstTradeIterator;

#endif // __TRADE_H_INCLUDED__ 
