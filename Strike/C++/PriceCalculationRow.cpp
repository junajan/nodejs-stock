#include "PriceCalculationRow.h"
#include <algorithm>

void PriceCalculationRow::initialize(Decimal price)
{
  PriceCalculationRow::price = price;
  PriceCalculationRow::aggregateBuyQuantity = 0;
  PriceCalculationRow::aggregateSellQuantity = 0;
}

PriceCalculationRow::PriceCalculationRow(Decimal price)
{
  initialize(price);
}

PriceCalculationRow::PriceCalculationRow()
{
  initialize(0);
}

Decimal PriceCalculationRow::getPrice() const 
{ 
  return Decimal(price);
}
  
void PriceCalculationRow::setPrice(Decimal price) 
{ 
  PriceCalculationRow::price = price; 
}

uint64_t PriceCalculationRow::getAggregateBuyQuantity() const
{ 
  return aggregateBuyQuantity; 
}
  
void PriceCalculationRow::setAggregateBuyQuantity(const uint64_t aggregateBuyQuantity) 
{ 
  PriceCalculationRow::aggregateBuyQuantity = aggregateBuyQuantity; 
}

void PriceCalculationRow::increaseAggregateBuyQuantity(const uint64_t aggregateBuyQuantity) 
{ 
  PriceCalculationRow::aggregateBuyQuantity += aggregateBuyQuantity; 
}

uint64_t PriceCalculationRow::getAggregateSellQuantity() const
{ 
  return aggregateSellQuantity; 
}
  
void PriceCalculationRow::setAggregateSellQuantity(const uint64_t aggregateSellQuantity) 
{ 
  PriceCalculationRow::aggregateSellQuantity = aggregateSellQuantity; 
}

void PriceCalculationRow::increaseAggregateSellQuantity(const uint64_t aggregateSellQuantity) 
{ 
  PriceCalculationRow::aggregateSellQuantity += aggregateSellQuantity; 
}

uint64_t PriceCalculationRow::getTradeableQuantity() const
{
  return std::min(aggregateBuyQuantity, aggregateSellQuantity);
}

uint64_t PriceCalculationRow::getQuantityImbalance() const
{
  return std::abs((int64_t) (aggregateBuyQuantity - aggregateSellQuantity));
}

Decimal PriceCalculationRow::getTradeableVolume() const
{
  return getTradeableQuantity() * price;
}

Decimal PriceCalculationRow::getVolumeImbalance() const
{
  return getQuantityImbalance() * price;
}

