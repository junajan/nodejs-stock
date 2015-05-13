#include "Order.h"

Order::Order(uint64_t id, OrderType orderType, uint32_t brokerId, 
            uint32_t stockId, uint32_t amount, Decimal price)
{
  Order::id = id;
  Order::orderType = orderType;
  Order::brokerId = brokerId;
  Order::stockId = stockId;
  Order::amount = amount;
  Order::price = price;
}

Order::Order() { }

uint64_t Order::getId() const
{ 
  return id; 
}
  
void Order::setId(uint64_t id) 
{ 
  Order::id = id; 
}

OrderType Order::getType() const
{ 
  return orderType; 
}
  
void Order::setType(OrderType orderType) 
{ 
  Order::orderType = orderType; 
}

uint32_t Order::getBrokerId() const
{ 
  return brokerId; 
}
  
void Order::setBrokerId(uint32_t brokerId) 
{ 
  Order::brokerId = brokerId; 
}

uint32_t Order::getStockId() const
{ 
  return stockId; 
}
  
void Order::setStockId(uint32_t stockId) 
{ 
  Order::stockId = stockId; 
}

uint32_t Order::getAmount() const
{ 
  return amount; 
}
  
void Order::setAmount(uint32_t amount) 
{ 
  Order::amount = amount; 
}

void Order::increaseAmount(uint32_t value) 
{ 
  Order::amount += value; 
}

void Order::decreaseAmount(uint32_t value) 
{ 
  Order::amount -= value; 
}

Decimal Order::getPrice() const
{ 
  return price; 
}
  
void Order::setPrice(Decimal price) 
{ 
  Order::price = price; 
}
