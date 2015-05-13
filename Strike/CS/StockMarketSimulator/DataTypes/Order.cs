using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  /// <summary>
  /// Třída představující aktivní objednávku - nabídku, či poptávku.
  /// </summary>
  public class Order
  {
    int id;

    OrderType orderType;

    int brokerId;

    int stockId;

    int amount;

    decimal proposedPrice;

    DateTime received;

    public int Id
    {
      get { return id; }
      set { id = value; }
    }

    public OrderType Type
    {
      get { return orderType; }
      set { orderType = value; }
    }

    public int BrokerId
    {
      get { return brokerId; }
      set { brokerId = value; }
    }

    public int StockId
    {
      get { return stockId; }
      set { stockId = value; }
    }

    public int Amount
    {
      get { return amount; }
      set { amount = value; }
    }

    public decimal ProposedPrice
    {
      get { return proposedPrice; }
      set { proposedPrice = value; }
    }

    public DateTime Received
    {
      get { return received; }
      set { received = value; }
    }

    public Order()
    {
    }

    public Order(int itemId, int broker, int quantity, decimal price)
    {
      this.stockId = itemId;
      this.brokerId = broker;
      this.amount = quantity;
      this.proposedPrice = price;
      this.received = DateTime.Now;
    }

    public Order(int itemId, int broker, int quantity, decimal price, int id)
    {
      this.stockId = itemId;
      this.brokerId = broker;
      this.amount = quantity;
      this.proposedPrice = price;
      this.id = id;
      this.received = DateTime.Now;
    }

    public Order(int itemId, int broker, int quantity, decimal price, int id, DateTime received)
    {
      this.stockId = itemId;
      this.brokerId = broker;
      this.amount = quantity;
      this.proposedPrice = price;
      this.id = id;
      this.received = received;
    }
  }
}
