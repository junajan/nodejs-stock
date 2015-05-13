#include "Stock.h"

uint32_t Stock::getId() const
{ 
  return id; 
}
  
void Stock::setId(const uint32_t id) 
{ 
  Stock::id = id; 
}

Decimal Stock::getPrice() const
{
  return price;
}

void Stock::setPrice(Decimal price)
{
  Stock::price = price;
}
