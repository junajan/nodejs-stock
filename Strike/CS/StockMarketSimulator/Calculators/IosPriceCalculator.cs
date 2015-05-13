using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  /// <summary>
  /// Insert-Order-Strategy Price Calculator
  /// </summary>
  public class IosPriceCalculator : PriceCalculator
  {
    protected override PriceCalculationRow[] CreateTable(Order[] buyList, Order[] sellList)
    {
      IList<PriceCalculationRow> table = new List<PriceCalculationRow>();

      Order[] sortedBuyList = buyList.OrderByDescending(o => o.ProposedPrice).ToArray();  // FIXME: u SpPgsql netreba
      Order[] sortedSellList = sellList.OrderBy(o => o.ProposedPrice).ToArray();          // FIXME: u SpPgsql netreba

      InsertBuyOrders(sortedBuyList, table);
      InsertSellOrders(sortedSellList, table);

      return table.ToArray();
    }

    /// <summary>
    /// Vloží do (prázdné) tabulky <code>table</code> objednávky na nákup seřazené SESTUPNĚ. 
    /// Tato metoda musí být volána před vložením objednávek na prodej!
    /// </summary>
    /// <param name="buyList">Seznam objednávek na nákup.</param>
    /// <param name="table">Tabulka, do které mají být objednávky vloženy.</param>
    private void InsertBuyOrders(Order[] buyList, IList<PriceCalculationRow> table)
    {
      PriceCalculationRow previousRow = null;
      int aggregatePreviousRowsQuantity = 0;

      foreach (Order buyOrder in buyList)
      {
        decimal price = buyOrder.ProposedPrice;
        int amount = buyOrder.Amount;

        if (previousRow == null || previousRow.Price != price) // vkladame novou cenu
        {
          PriceCalculationRow row = new PriceCalculationRow(price);
          row.AggregateBuyQuantity = amount + aggregatePreviousRowsQuantity;
          table.Add(row);
          previousRow = row;
        }
        else // takova cena uz existuje
        {
          previousRow.AggregateBuyQuantity += amount;
        }
        aggregatePreviousRowsQuantity = previousRow.AggregateBuyQuantity;
      }
    }

    /// <summary>
    /// Vloží do tabulky <code>table</code> objednávky na prodej seřazené VZESTUPNĚ. 
    /// Tato metoda může být volána po vložení objednávek na nákup.
    /// Výsledkem je sestupně seřazená tabulka podle ceny.
    /// </summary>
    /// <param name="sellList">Seznam objednávek na prodej.</param>
    /// <param name="table">Tabulka, do které mají být objednávky vloženy.</param>
    private void InsertSellOrders(Order[] sellList, IList<PriceCalculationRow> table) 
    {
      int rowIndex = table.Count - 1;
      PriceCalculationRow lastRow = table[rowIndex];
      int aggregatePreviousRowsQuantity = 0;

      foreach (Order sellOrder in sellList)
      {
        decimal price = sellOrder.ProposedPrice;
        int amount = sellOrder.Amount;

        /// Zapsani prodejniho mnozstvi, posun v tabulce nahoru (tj. k vyssi cene)
        while (lastRow.Price < price && rowIndex > 0) 
        {
          lastRow.AggregateSellQuantity = aggregatePreviousRowsQuantity;
          
          rowIndex--;
          lastRow = table[rowIndex];
        }

        /// Narazili jsme na cenu, ktera nebyla obsazena v "buy" tabulce, musi se vlozit
        if (lastRow.Price > price) 
        {
          PriceCalculationRow newRow = new PriceCalculationRow(price);
          newRow.AggregateBuyQuantity = lastRow.AggregateBuyQuantity; // nakup jako za vyssi cenu
          rowIndex++; // posunem se o krok zpatky, niz v tabulce
          lastRow = newRow;
          table.Insert(rowIndex, newRow);
        }

        /// Cenu jsme v tabulce nasli, nebo ji vlozili. V kazdem pripade pro ni zvysime mnozstvi. 
        /// Zapis mnozstvi probehne v cyklu posunu po tabulce
        aggregatePreviousRowsQuantity += amount;
      }

      /// Na zaver vyplnime mnozstvi pro vsechny zbyvajiji nejvyssi ceny z "buy" tabulky
      for (int index = 0; index <= rowIndex; index++)
      {
        table[index].AggregateSellQuantity = aggregatePreviousRowsQuantity;
      }
    }

    protected override PriceCalculationRow[] GetMaximumQuantityRows(PriceCalculationRow[] table)
    {
      int maxQuantity = 0;

      foreach (PriceCalculationRow row in table)
      {
        row.TradeableQuantity = Math.Min(row.AggregateBuyQuantity, row.AggregateSellQuantity);
        if (row.TradeableQuantity > maxQuantity)
          maxQuantity = row.TradeableQuantity;
      }

      return table.Where(r => r.TradeableQuantity == maxQuantity).ToArray();
    }

    protected override PriceCalculationRow[] GetMaximumVolumeRows(PriceCalculationRow[] table)
    {
      decimal maxVolume = 0;

      foreach (PriceCalculationRow row in table)
      {
        row.TradeableQuantity = Math.Min(row.AggregateBuyQuantity, row.AggregateSellQuantity);
        if (row.TradeableVolume > maxVolume)
          maxVolume = row.TradeableVolume;
      }

      return table.Where(r => r.TradeableVolume == maxVolume).ToArray();
    }

    protected override PriceCalculationRow[] GetMinimumOrderImbalanceRows(PriceCalculationRow[] table)
    {
      decimal minImbalance = decimal.MaxValue;

      foreach (PriceCalculationRow row in table)
      {
        row.NormalOrderImbalance = Math.Abs(row.AggregateBuyQuantity - row.AggregateSellQuantity) * row.Price;
        if (row.NormalOrderImbalance < minImbalance)
          minImbalance = row.NormalOrderImbalance;
      }

      return table.Where(r => r.NormalOrderImbalance == minImbalance).ToArray();
    }
  }
}
