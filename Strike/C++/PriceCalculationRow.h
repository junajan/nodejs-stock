//=================================
// include guard
#ifndef __PRICE_CALCULATION_ROW_H_INCLUDED__
#define __PRICE_CALCULATION_ROW_H_INCLUDED__
//=================================

#include <deque>
#include "Decimal.h"


class PriceCalculationRow
{

private:
  Decimal price;
  uint64_t aggregateBuyQuantity;
  uint64_t aggregateSellQuantity;

  void initialize(Decimal price);

public:
  PriceCalculationRow(Decimal price);
  PriceCalculationRow();

  Decimal getPrice() const;
  void setPrice(Decimal price);

  uint64_t getAggregateBuyQuantity() const;
  void setAggregateBuyQuantity(const uint64_t aggregateBuyQuantity);
  void increaseAggregateBuyQuantity(const uint64_t aggregateBuyQuantity);

  uint64_t getAggregateSellQuantity() const;  
  void setAggregateSellQuantity(const uint64_t aggregateSellQuantity);
  void increaseAggregateSellQuantity(const uint64_t aggregateSellQuantity);

  uint64_t getTradeableQuantity() const;
  uint64_t getQuantityImbalance() const;

  Decimal getTradeableVolume() const;
  Decimal getVolumeImbalance() const;
};

typedef std::deque<PriceCalculationRow> PriceCalculationTable; 
typedef PriceCalculationTable::iterator TableIterator;
typedef PriceCalculationTable::const_iterator ConstTableIterator;

#endif // __PRICE_CALCULATION_ROW_H_INCLUDED__ 
