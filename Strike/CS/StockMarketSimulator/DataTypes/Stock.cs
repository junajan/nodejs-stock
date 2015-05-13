using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public class Stock
  {
    private int id;

    private string ticker;

    private decimal lastPrice;

    public int Id
    {
      get { return id; }
      set { id = value; }
    }

    public string Ticker
    {
      get { return ticker; }
      set { ticker = value; }
    }

    public decimal LastPrice
    {
      get { return lastPrice; }
      set { lastPrice = value; }
    }

    public Stock()
    {
    }

    public Stock(int id, decimal lastPrice)
    {
      this.id = id;
      //this.tickSize = tickSize;
      this.lastPrice = lastPrice;
    }
  }
}
