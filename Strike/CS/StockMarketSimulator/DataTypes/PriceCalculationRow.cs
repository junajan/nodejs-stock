using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  /// <summary>
  /// Třída představující řádek tabulky pro určení ceny.
  /// </summary>
  public class PriceCalculationRow
  {
    private decimal price;

    private int aggregateBuyQuantity;

    private int aggregateSellQuantity;

    private int tradeableQuantity;

    private decimal normalOrderImbalance;

    public decimal Price
    {
      get { return price; }
      set { price = value; }
    }

    public int AggregateBuyQuantity
    {
      get { return aggregateBuyQuantity; }
      set { aggregateBuyQuantity = value; }
    }

    public int AggregateSellQuantity
    {
      get { return aggregateSellQuantity; }
      set { aggregateSellQuantity = value; }
    }

    public int TradeableQuantity
    {
      get { return tradeableQuantity; }
      set { tradeableQuantity = value; }
    }

    /// <summary>
    /// quantity * price
    /// </summary>
    public decimal TradeableVolume
    {
      get { return tradeableQuantity * price; }
    }

    /// <summary>
    /// Math.Abs(row.AggregateBuyQuantity - row.AggregateSellQuantity) * row.Price
    /// </summary>
    public decimal NormalOrderImbalance
    {
      get { return normalOrderImbalance; }
      set { normalOrderImbalance = value; }
    }

    public PriceCalculationRow()
    {
    }

    public PriceCalculationRow(decimal price)
    {
      this.price = price;
      this.aggregateBuyQuantity = 0;
      this.aggregateSellQuantity = 0;
      this.normalOrderImbalance = 0;
    }
  }
}
