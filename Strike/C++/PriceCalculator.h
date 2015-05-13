//=================================
// include guard
#ifndef __PRICE_CALCULATOR_DECIMAL_H_INCLUDED__
#define __PRICE_CALCULATOR_DECIMAL_H_INCLUDED__
//=================================


#include "Decimal.h"    
#include "Order.h"
#include "PriceCalculationRow.h"
#include "StrikerConfig.h"


class PriceCalculator
{

private:
  bool verbose;
  Decimal tickSize;
  Decimal lastPrice;

  void fillTable(PriceCalculationTable& table, const OrderList& sortedBuyList, const OrderList& sortedSellList);
  void insertBuyOrders(const OrderList& sortedBuyList, PriceCalculationTable& table);
  void insertSellOrders(const OrderList& sortedSellList, PriceCalculationTable& table);

  PriceCalculationRow getPriceByMaximumTradeableQuantity(const PriceCalculationTable& table);
  PriceCalculationRow getPriceByMinimumQuantityImbalance(const PriceCalculationTable& table);
  PriceCalculationRow getPriceByQuantityImbalanceDirection(const PriceCalculationTable& table);
  PriceCalculationRow getPriceByAverage(const PriceCalculationTable& table);
  // Unused:
  PriceCalculationRow getPriceByLatestPrice(const PriceCalculationTable& table);

  PriceCalculationTable getMaximumTradeableQuantityRows(const PriceCalculationTable& table);
  Decimal getMaximumTradeableQuantity(const PriceCalculationTable& table);
  PriceCalculationTable getMinimumQuantityImbalanceRows(const PriceCalculationTable& table);
  Decimal getMinimumQuantityImbalance(const PriceCalculationTable& table);
  // Unused:
  PriceCalculationTable getMinimumVolumeImbalanceRows(const PriceCalculationTable& table);
  Decimal getMinimumVolumeImbalance(const PriceCalculationTable& table);
  PriceCalculationTable getMaximumTradeableVolumeRows(const PriceCalculationTable& table);
  Decimal getMaximumTradeableVolume(const PriceCalculationTable& table);

  void printTable(const PriceCalculationTable& table);

public:
  PriceCalculator(StrikerConfig config);
  PriceCalculationRow getPrice(const OrderList& buyList, const OrderList& sellList, Decimal lastPrice);

};

#endif // __PRICE_CALCULATOR_DECIMAL_H_INCLUDED__ 
