//=================================
// include guard
#ifndef __ORDER_H_INCLUDED__
#define __ORDER_H_INCLUDED__
//=================================

#include <deque>
#include "Decimal.h"
#include "OrderType.h"


class Order
{

private:
  uint64_t id;
  OrderType orderType;
  uint32_t brokerId;
  uint32_t stockId;
  int amount;
  Decimal price;

public:
  Order(uint64_t id, OrderType orderType, uint32_t brokerId, 
        uint32_t stockId, uint32_t amount, Decimal price);
  Order();

  uint64_t getId() const;  
  void setId(uint64_t id);

  OrderType getType() const;  
  void setType(OrderType orderType);

  uint32_t getBrokerId() const;  
  void setBrokerId(uint32_t brokerId);

  uint32_t getStockId() const;  
  void setStockId(uint32_t stockId);

  uint32_t getAmount() const;  
  void setAmount(uint32_t amount);
  void increaseAmount(uint32_t value);
  void decreaseAmount(uint32_t value);

  Decimal getPrice() const;  
  void setPrice(Decimal price);
};

typedef std::deque<Order> OrderList; // musi byt deque, potrebuju odebirat ze zacatku
typedef OrderList::iterator OrderIterator;
typedef OrderList::const_iterator ConstOrderIterator;

#endif // __ORDER_H_INCLUDED__ 
