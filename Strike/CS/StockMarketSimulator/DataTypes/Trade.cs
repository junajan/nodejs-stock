using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public class Trade
  {
    private int id;

    private int amount;

    private decimal price; 

    private int stockId; 

    private int buyerId;

    private int sellerId;

    private int buyOrderId;

    private int sellOrderId;

    private DateTime executed;

    public Trade() { }

    public Trade(int amount, decimal price, Order buyOrder, Order sellOrder)
    {
      this.amount = amount;
      this.price = price;
      this.stockId = buyOrder.StockId;
      this.buyerId = buyOrder.BrokerId;
      this.buyOrderId = buyOrder.Id;
      this.sellerId = sellOrder.BrokerId;
      this.sellOrderId = sellOrder.Id;
      this.executed = DateTime.Now;
    }

    public int Id
    {
      get { return id; }
      set { id = value; }
    }

    public int Amount
    {
      get { return amount; }
      set { amount = value; }
    }

    public decimal Price
    {
      get { return price; }
      set { price = value; }
    }

    public int StockId
    {
      get { return stockId; }
      set { stockId = value; }
    }

    public int BuyerId
    {
      get { return buyerId; }
      set { buyerId = value; }
    }

    public int SellerId
    {
      get { return sellerId; }
      set { sellerId = value; }
    }

    public int BuyOrderId
    {
      get { return buyOrderId; }
      set { buyOrderId = value; }
    }

    public int SellOrderId
    {
      get { return sellOrderId; }
      set { sellOrderId = value; }
    }

    public DateTime Executed
    {
      get { return executed; }
      set { executed = value; }
    }
  }
}
