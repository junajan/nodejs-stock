using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public class OrderMatcher
  {
    public Trade[] MatchOrders(Order[] buyList, Order[] sellList, decimal price)
    {
      // TODO: razeni by se dalo delat jen jednou, vyuziva to i IosPriceCalculator... - nejaky preprocesor
      // Tady se akorat navic rovna podle druhyho kriteria: casu
      // TODO: a vubec, stacilo by seznam zkratit podle spocitane price (je serazeny, tak useknout)
      Order[] sortedBuyList = buyList.Where(o => o.ProposedPrice >= price)
        .OrderByDescending(o => o.ProposedPrice).ThenBy(o => o.Received).ToArray();
      Order[] sortedSellList = sellList.Where(o => o.ProposedPrice <= price)
        .OrderBy(o => o.ProposedPrice).ThenBy(o => o.Received).ToArray();

      if (sortedBuyList.Length == 0) // pak je i sortedSellList.Length == 0
        return new Trade[0];

      IList<Trade> result = new List<Trade>();
      int buyListIndex = 0;
      int sellListIndex = 0;

      do
      {
        Order buyOrder = sortedBuyList[buyListIndex];
        Order sellOrder = sortedSellList[sellListIndex];

        if (buyOrder.Amount > sellOrder.Amount)
        {
          int amount = sellOrder.Amount;
          Trade trade = new Trade(amount, price, buyOrder, sellOrder);
          result.Add(trade);

          buyOrder.Amount -= amount;
          sellOrder.Amount = 0;
          sellListIndex++;
        }
        else if (buyOrder.Amount < sellOrder.Amount)
        {
          int amount = buyOrder.Amount;
          Trade trade = new Trade(amount, price, buyOrder, sellOrder);
          result.Add(trade);

          sellOrder.Amount -= buyOrder.Amount;
          buyOrder.Amount = 0;
          buyListIndex++;
        }
        else // ==
        {
          int amount = buyOrder.Amount;
          Trade trade = new Trade(amount, price, buyOrder, sellOrder);
          result.Add(trade);

          buyOrder.Amount = 0;
          buyListIndex++;
          sellOrder.Amount = 0;
          sellListIndex++;
        }
      }
      while (buyListIndex < sortedBuyList.Length && sellListIndex < sortedSellList.Length);

      // NAPAD: zapis do DB, co se prodalo komu. Tam, kde zbylo Q = 0, to je jasny, 
      // k tomu zapsat zvlast posledni pouzity indexy, pokud Q != 0. ... To ale nepouzivam.

      return result.ToArray(); 
    }
  }
}
