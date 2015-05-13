//=================================
// include guard
#ifndef __STOCK_H_INCLUDED__
#define __STOCK_H_INCLUDED__
//=================================

#include <string>
#include "Decimal.h"

using namespace std;

class Stock
{

private:
  uint32_t id;   
  Decimal price;  

public:
  uint32_t getId() const;
  void setId(const uint32_t id);

  Decimal getPrice() const;
  void setPrice(Decimal price);
};

#endif // __STOCK_H_INCLUDED__ 
