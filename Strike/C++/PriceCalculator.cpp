#include "PriceCalculator.h"
#include <iostream>
#include <algorithm>
#include <stdexcept>


using namespace std;

PriceCalculator::PriceCalculator(StrikerConfig config)
{
  verbose = config.VERBOSE;
  tickSize = config.TICK_SIZE;
}

PriceCalculationRow PriceCalculator::getPrice(const OrderList& buyList, const OrderList& sellList, Decimal lastPrice)
{
  PriceCalculator::lastPrice = lastPrice;

  if (verbose)
    cout << "last price = " << lastPrice << endl;

  if (buyList.size() == 0 || sellList.size() == 0)
  {
    if (verbose)
      cout << "No buy or sell orders. Current price is equal to the last price." << endl;
    return PriceCalculationRow(lastPrice);
  }

  PriceCalculationTable table;
  fillTable(table, buyList, sellList);

  PriceCalculationRow result = getPriceByMaximumTradeableQuantity(table);
  return result;
}

void PriceCalculator::fillTable(PriceCalculationTable& table, const OrderList& sortedBuyList, const OrderList& sortedSellList)
{
  if (verbose)
    cout << endl << "Inserting " << sortedBuyList.size() << " buy orders..." << endl;
  insertBuyOrders(sortedBuyList, table);

  if (verbose)
    cout << endl << "Inserting " << sortedSellList.size() << " sell orders..." << endl;
  insertSellOrders(sortedSellList, table);
}

/// <summary>
/// Vlozi do (prazdne) tabulky <code>table</code> objednavky na nakup serazene SESTUPNE. 
/// Tato metoda musi byt volana pred vlozenim objednavek na prodej!
/// </summary>
/// <param name="buyList">Seznam objednavek na nakup.</param>
/// <param name="table">Tabulka, do ktere maji byt objednavky vlozeny.</param>
void PriceCalculator::insertBuyOrders(const OrderList& buyList, PriceCalculationTable& table)
{
  Decimal firstBuyOrderPrice = buyList.front().getPrice();
  PriceCalculationRow currentRow(firstBuyOrderPrice); // diky tomu se vyhneme tesovani v cyklu na prvni vkladani
  uint64_t aggregatePreviousRowsQuantity = 0;

  ConstOrderIterator endOrderIterator = buyList.end(); 
  for (ConstOrderIterator orderIterator = buyList.begin(); orderIterator != endOrderIterator; ++orderIterator) 
  {
    Order buyOrder = *orderIterator;
    Decimal orderPrice = buyOrder.getPrice();
    uint32_t orderAmount = buyOrder.getAmount();

    if (currentRow.getPrice() == orderPrice) // na takovou cenu jsme uz narazili (ale nezapsali do tabulky)
    {
      currentRow.increaseAggregateBuyQuantity(orderAmount);       
    }
    else // narazili jsme na novou cenu, tu si zapamatujem a do tabulky vlozime tu dosavadni
    {
      table.push_back(currentRow); 

      PriceCalculationRow row(orderPrice);
      row.setAggregateBuyQuantity(orderAmount + aggregatePreviousRowsQuantity);
      currentRow = row;
    }
    aggregatePreviousRowsQuantity = currentRow.getAggregateBuyQuantity();
  }

  // nakonec vlozime aktualni stradanou cenu do tabulky
  table.push_back(currentRow); 
}

/// <summary>
/// Vlozi do tabulky <code>table</code> objednavky na prodej serazene VZESTUPNE. 
/// Tato metoda muze byt volana po vlozeni objednavek na nakup.
/// Vysledkem je sestupne serazena tabulka podle ceny.
/// </summary>
/// <param name="sellList">Seznam objednavek na prodej.</param>
/// <param name="table">Tabulka, do ktere maji byt objednavky vlozeny.</param>
void PriceCalculator::insertSellOrders(const OrderList& sellList, PriceCalculationTable& table) 
{
  TableIterator rowIterator = table.end() - 1;
  ConstTableIterator beginRowIterator = table.begin();

  uint64_t aggregatePreviousRowsQuantity = 0;

  ConstOrderIterator orderIterator = sellList.begin();
  ConstOrderIterator endOrderIterator = sellList.end();
  while (orderIterator != endOrderIterator) 
  {
    Order sellOrder = *orderIterator;
    Decimal orderPrice = sellOrder.getPrice();
    uint32_t orderAmount = sellOrder.getAmount();

    /// Zapsani prodejniho mnozstvi, posun v tabulce nahoru (tj. k vyssi cene)
    while ((*rowIterator).getPrice() < orderPrice && rowIterator != table.begin()) 
    {
      (*rowIterator).setAggregateSellQuantity(aggregatePreviousRowsQuantity);           
      rowIterator--;
    }

    /// Narazili jsme na cenu, ktera nebyla obsazena v "buy" tabulce, musi se vlozit
    if ((*rowIterator).getPrice() > orderPrice) 
    {
      PriceCalculationRow newRow(orderPrice);
      newRow.setAggregateBuyQuantity((*rowIterator).getAggregateBuyQuantity()); // nakup jako za vyssi cenu
      rowIterator++;  // posunem se o krok zpatky, niz v tabulce
      const size_t diff = rowIterator - table.begin();
      table.insert(rowIterator, newRow); 
      rowIterator = table.begin() + diff;
    }

    /// Cenu jsme v tabulce nasli, nebo ji vlozili. V kazdem pripade pro ni zvysime mnozstvi. 
    /// Zapis mnozstvi probehne v cyklu posunu po tabulce
    aggregatePreviousRowsQuantity += orderAmount;
    orderIterator++;
  }

  /// Na zaver vyplnime mnozstvi pro vsechny zbyvajiji nejvyssi ceny z "buy" tabulky
  ConstTableIterator stopIterator = rowIterator + 1;
  for (TableIterator restIterator = table.begin(); restIterator != stopIterator; restIterator++)
  {
    PriceCalculationRow& row = *restIterator;
    row.setAggregateSellQuantity(aggregatePreviousRowsQuantity);
  }
}


/// <summary>
/// Prvni kriterium pro vypocet ceny. Pro vsechny ceny v tabulce spocita objem, ktery by za 
/// danou cenu mohl byt zobchodovan, a vybere cenu, pro niz je zobchodovatelny objem nejvetsi.
/// Pokud je takova cena jedinecna, vrati ji jako vysledek, v opacnem pripade preda vhodne 
/// kandidaty metode <code>getPriceByMinimumQuantityImbalance</code> hodnotici druhe kriterium.
/// </summary>
/// <param name="table"></param>
/// <returns></returns>
PriceCalculationRow PriceCalculator::getPriceByMaximumTradeableQuantity(const PriceCalculationTable& table)
{
  PriceCalculationTable maxQuantityRows = getMaximumTradeableQuantityRows(table); 

  if (verbose)
  {
    cout << endl << "Checking Maximum Tradeable Quantity Criterion..." << endl;
    printTable(table);
  }

  switch (maxQuantityRows.size())
  {
    case 0: throw invalid_argument("maxQuantityRows.Length == 0");
    case 1: return maxQuantityRows.front(); 
    default: return getPriceByMinimumQuantityImbalance(maxQuantityRows);
  }
}

/// <summary>
/// Druhe kriterium pro vypocet ceny. Pro vsechny ceny v (sub)tabulce spocita nezobchodovatelny
/// objem odpovidajici dane cene, a vybere cenu, pro niz je tato hodnota nejmensi.
/// Pokud je takova cena jedinecna, vrati ji jako vysledek, v opacnem pripade preda vhodne 
/// kandidaty metode <code>getPriceByQuantityImbalanceDirection</code> hodnotici treti kriterium.
/// </summary>
/// <param name="table"></param>
/// <returns></returns>
PriceCalculationRow PriceCalculator::getPriceByMinimumQuantityImbalance(const PriceCalculationTable& table) 
{ 
  PriceCalculationTable minImbalanceRows = getMinimumQuantityImbalanceRows(table);

  if (verbose)
  {
    cout << endl << "Checking Normal Order (Quantity) Imbalance Criterion..." << endl;
    printTable(table);
  }

  switch (minImbalanceRows.size())
  {
    case 0: throw invalid_argument("minImbalanceRows.Length == 0");
    case 1: return minImbalanceRows.front();
    default: return getPriceByQuantityImbalanceDirection(minImbalanceRows);
  }
}

/// <summary>
/// Treti kriterium pro vypocet ceny. Pro vsechny ceny v (sub)tabulce zkontroluje, zda prevazuje
/// nabidka nad poptavkou, nebo naopak. Pokud ve vsech pripadech prevazuje poptavka, vybere 
/// z moznych cen nejvetsi. Pokud ve vsech pripadech prevazuje nabidka, vybere nejnizsi cenu.
/// Ve zbyvajicich pripadech preda vhodne kandidaty metode <code>getPriceByAverage</code> 
/// hodnotici ctvrte respektive pate kriterium.
/// </summary>
/// <param name="table"></param>
/// <returns></returns>
PriceCalculationRow PriceCalculator::getPriceByQuantityImbalanceDirection(const PriceCalculationTable& table)
{
  if (verbose)
  {
    cout << endl << "Checking Order Imbalance Direction Criterion..." << endl;
    printTable(table);
  }

  bool buyExceedsSell = true;
  bool sellExceedsBuy = true;

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getAggregateBuyQuantity() < row.getAggregateSellQuantity())
      buyExceedsSell = false;

    if (row.getAggregateBuyQuantity() > row.getAggregateSellQuantity())
      sellExceedsBuy = false;
  }
  
  if (buyExceedsSell)
    return table.front();

  if (sellExceedsBuy)
    return table.back();

  return getPriceByAverage(table); 
}


/// <summary>
/// Ctvrte a pate kriterium pro vypocet ceny. Spocita prumernou cenu z nejvyssi a nejnizsi ceny 
/// (sub)tabulky; pokud je nasobkem zakladni jednotky TICK_SIZE, vrati ji jako vysledek.
/// V opacnem pripade se rozhoduje podle predchozi ceny: pokud byla vyssi nez nyni spocitana
/// prumerna cena, zaokrouhli se prumerna cena na nejblizsi zakladni jednotku smerem nahoru, 
/// v opacnem pripade smerem dolu.
/// </summary>
/// <param name="table"></param>
/// <returns></returns>
PriceCalculationRow PriceCalculator::getPriceByAverage(const PriceCalculationTable& table)
{
  if (verbose)
  {
    cout << endl << "Checking Average Criterion..." << endl;
    printTable(table);
  }

  Decimal sum = table.front().getPrice() + table.back().getPrice();
  Decimal averageValue = sum / 2;

  Decimal strikePrice;

  if (averageValue / tickSize % 1 == 0)
    strikePrice = averageValue;
  else if (lastPrice > averageValue)
    strikePrice = Decimal::ceiling(averageValue / tickSize) * tickSize; 
  else
    strikePrice = Decimal::floor(averageValue / tickSize) * tickSize;

  PriceCalculationRow result(strikePrice);
  result.setAggregateBuyQuantity(table.front().getAggregateBuyQuantity());
  result.setAggregateSellQuantity(table.back().getAggregateSellQuantity());
  return result;
}

// Unused criterion, may be useful for another market using a different set of criterions. 
PriceCalculationRow PriceCalculator::getPriceByLatestPrice(const PriceCalculationTable& table)
{
  if (verbose)
  {
    cout << endl << "Checking Last Price Criterion..." << endl;
    printTable(table);
  }

  ConstTableIterator rowIterator = table.begin();
  PriceCalculationRow bestRow = *rowIterator;
  Decimal smallestDifference = Decimal::abs(bestRow.getPrice() - lastPrice);

  ConstTableIterator endIterator = table.end(); 
  for (rowIterator++; rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;
    Decimal difference = Decimal::abs(row.getPrice() - lastPrice);

    if (difference < smallestDifference)
    {
      smallestDifference = difference;
      bestRow = row;
    }
  }

  return bestRow;
}

// Pomocne metody:

PriceCalculationTable PriceCalculator::getMaximumTradeableQuantityRows(const PriceCalculationTable& table) 
{
  PriceCalculationTable result;
  Decimal maxQuantity = getMaximumTradeableQuantity(table);

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getTradeableQuantity() == maxQuantity)
      result.push_back(row);
  }

  return result;
}

Decimal PriceCalculator::getMaximumTradeableQuantity(const PriceCalculationTable& table) 
{
  Decimal maxQuantity = 0;

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getTradeableQuantity() > maxQuantity)
      maxQuantity = row.getTradeableQuantity();
  }

  return maxQuantity;
}

PriceCalculationTable PriceCalculator::getMaximumTradeableVolumeRows(const PriceCalculationTable& table) 
{
  PriceCalculationTable result;
  Decimal maxVolume = getMaximumTradeableVolume(table);

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getTradeableVolume() == maxVolume)
      result.push_back(row);
  }

  return result;
}

Decimal PriceCalculator::getMaximumTradeableVolume(const PriceCalculationTable& table) 
{
  Decimal maxVolume = 0;

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getTradeableVolume() > maxVolume)
      maxVolume = row.getTradeableVolume();
  }

  return maxVolume;
}

PriceCalculationTable PriceCalculator::getMinimumQuantityImbalanceRows(const PriceCalculationTable& table)
{
  PriceCalculationTable result;
  Decimal minImbalance = getMinimumQuantityImbalance(table);

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getQuantityImbalance() == minImbalance)
      result.push_back(row);
  }

  return result;
}

Decimal PriceCalculator::getMinimumQuantityImbalance(const PriceCalculationTable& table) 
{
  Decimal minImbalance = table.front().getQuantityImbalance();

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin() + 1; rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getQuantityImbalance() < minImbalance)
      minImbalance = row.getQuantityImbalance();
  }

  return minImbalance;
}

PriceCalculationTable PriceCalculator::getMinimumVolumeImbalanceRows(const PriceCalculationTable& table)
{
  PriceCalculationTable result;
  Decimal minImbalance = getMinimumVolumeImbalance(table);

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getVolumeImbalance() == minImbalance)
      result.push_back(row);
  }

  return result;
}

Decimal PriceCalculator::getMinimumVolumeImbalance(const PriceCalculationTable& table) 
{
  Decimal minImbalance = table.front().getVolumeImbalance();

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin() + 1; rowIterator != endIterator; rowIterator++) 
  {
    PriceCalculationRow row = *rowIterator;

    if (row.getVolumeImbalance() < minImbalance)
      minImbalance = row.getVolumeImbalance();
  }

  return minImbalance;
}

void PriceCalculator::printTable(const PriceCalculationTable& table)
{
  cout << endl << "price\tsum(b)\tsum(s)\ttrad.\timbalance" << endl;

  ConstTableIterator endIterator = table.end(); 
  for (ConstTableIterator rowIterator = table.begin(); rowIterator != endIterator; ++rowIterator) 
  {
    PriceCalculationRow row = *rowIterator;
    cout << row.getPrice() << "\t" << row.getAggregateBuyQuantity() << "\t" << row.getAggregateSellQuantity() 
      << "\t" << row.getTradeableQuantity() << "\t" << row.getQuantityImbalance() << endl;
//      << "\t" << row.getTradeableVolume() << "\t" << row.getVolumeImbalance() << endl;
  }

  cout << endl;
}
