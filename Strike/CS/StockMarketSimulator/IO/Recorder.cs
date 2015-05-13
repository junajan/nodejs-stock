using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public class Recorder
  {
    private static Recorder instance = null;

    public static Recorder Instance
    {
      get
      {
        if (instance == null)
          instance = new Recorder();
        return instance;
      }
    }

    private Recorder() { }

    public void WriteLine(String text)
    {
      Console.WriteLine(text);
    }

    public string ReadLine()
    {
      return Console.ReadLine();
    }

    public void Print(IList<PriceCalculationRow> table)
    {
      Console.WriteLine();
      Console.WriteLine("Price\tSumBuy\tSumSell\tTrad.Q\tTrad.V\tImbalance");
      foreach (PriceCalculationRow row in table)
        Console.WriteLine(row.Price + "\t" +
          row.AggregateBuyQuantity + "\t" +
          row.AggregateSellQuantity + "\t" +
          row.TradeableQuantity + "\t" +
          row.TradeableVolume + "\t" +
          row.NormalOrderImbalance);
    }
  }
}
