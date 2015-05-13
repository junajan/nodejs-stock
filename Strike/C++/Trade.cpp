#include "Trade.h"
#include "Order.h"

Trade::Trade(const uint32_t amount, Decimal price, Order buyOrder, Order sellOrder) 
{
  Trade::amount = amount;
  Trade::price = price;
  Trade::stockId = buyOrder.getStockId();
  Trade::buyerId = buyOrder.getBrokerId();
  Trade::sellerId = sellOrder.getBrokerId();
  Trade::buyOrderId = buyOrder.getId();
  Trade::sellOrderId = sellOrder.getId();
}

Trade::Trade() { }

uint32_t Trade::getAmount() const
{ 
  return amount; 
}
  
void Trade::setAmount(const uint32_t amount) 
{ 
  Trade::amount = amount; 
}

Decimal Trade::getPrice() const
{ 
  return price; 
}
  
void Trade::setPrice(Decimal price) 
{ 
  Trade::price = price; 
}

uint32_t Trade::getStockId() const
{ 
  return stockId; 
}
  
void Trade::setStockId(const uint32_t stockId) 
{ 
  Trade::stockId = stockId; 
}

uint32_t Trade::getBuyerId() const
{ 
  return buyerId; 
}
  
void Trade::setBuyerId(const uint32_t buyerId) 
{ 
  Trade::buyerId = buyerId; 
}

uint32_t Trade::getSellerId() const
{ 
  return sellerId; 
}
  
void Trade::setSellerId(const uint32_t sellerId) 
{ 
  Trade::sellerId = sellerId; 
}

uint64_t Trade::getBuyOrderId() const
{ 
  return buyOrderId; 
}
  
void Trade::setBuyOrderId(const uint64_t buyOrderId) 
{ 
  Trade::buyOrderId = buyOrderId; 
}

uint64_t Trade::getSellOrderId() const
{ 
  return sellOrderId; 
}
  
void Trade::setSellOrderId(const uint64_t sellOrderId) 
{ 
  Trade::sellOrderId = sellOrderId; 
}
