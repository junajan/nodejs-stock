using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using System.Xml;
using System.Globalization;

namespace StockMarketSimulator
{
  public class XmlDataProvider : DataProvider
  {
    private const string FileName = @"..\..\data\StockMarket.xml";

    // "tabulky":
    private const string OrdersElementName = "orders";
    private const string StocksElementName = "stocks";
    private const string TradesElementName = "trades";

    protected override void Initialize()
    {
      ProviderName = "XmlDataProvider";
    }

    public override Stock GetStock(int stockId)
    {
      return SelectStocks().FirstOrDefault(s => s.Id == stockId);
    }

    private void UpdateStockPrice(int stockId, decimal price, XElement stocksElement)
    {
      XElement element = stocksElement.Elements().First(e => int.Parse(e.Element("id").Value) == stockId);
      element.Element("price").Value = price.ToString(new CultureInfo("en-US"));
    }

    public override Stock[] SelectStocks()
    {
      XDocument document = XDocument.Load(FileName);
      XElement stocksElement = document.Root.Element(StocksElementName);
      IList<Stock> stockList = new List<Stock>();

      foreach (XElement stockElement in stocksElement.Elements())
      {
        Stock stock = new Stock();
        stock.Id = int.Parse(stockElement.Element("id").Value);
        //stock.TickSize = decimal.Parse(stockElement.Element("tickSize").Value, new CultureInfo("en-US"));
        stock.LastPrice = decimal.Parse(stockElement.Element("price").Value, new CultureInfo("en-US"));
        stockList.Add(stock);
      }

      return stockList.ToArray();
    }

    public override void AddOrder(Order order)
    {
      XDocument document = XDocument.Load(FileName);
      XElement ordersElement = document.Root.Element(OrdersElementName);

      XElement newOrderElement = new XElement("order");
      newOrderElement.Add(new XElement("id", order.Id));
      newOrderElement.Add(new XElement("type", order.Type));
      newOrderElement.Add(new XElement("stockId", order.StockId));
      newOrderElement.Add(new XElement("brokerId", order.BrokerId));  
      newOrderElement.Add(new XElement("amount", order.Amount));    
      newOrderElement.Add(new XElement("price", order.ProposedPrice));
      newOrderElement.Add(new XElement("received", order.Received));
      ordersElement.Add(newOrderElement);

      using (XmlWriter writer = new XmlTextWriter(FileName, Encoding.UTF8))
      {
        document.WriteTo(writer);
      }
    }

    public override Order[] SelectBuyOrders(int stockId)
    {
      return SelectOrders(stockId, OrderType.BuyOrder);
    }

    public override Order[] SelectSellOrders(int stockId)
    {
      return SelectOrders(stockId, OrderType.SellOrder);
    }

    private Order[] SelectOrders(int stockId, OrderType type)
    {
      return SelectOrders(type).Where(o => o.StockId == stockId).ToArray();
    }

    private Order[] SelectOrders(OrderType orderType)
    {
      XDocument document = XDocument.Load(FileName);
      XElement ordersElement = document.Root.Element(OrdersElementName);
      IList<Order> orderList = new List<Order>();

      foreach (XElement orderElement in ordersElement.Elements())
      {
        OrderType type = (OrderType)Enum.Parse(typeof(OrderType), orderElement.Element("type").Value);
        if (type == orderType)
        {
          Order order = new Order();
          order.Id = int.Parse(orderElement.Element("id").Value);
          order.Type = type;
          order.StockId = int.Parse(orderElement.Element("stockId").Value);
          order.BrokerId = int.Parse(orderElement.Element("brokerId").Value);
          order.Amount = int.Parse(orderElement.Element("amount").Value);
          order.ProposedPrice = decimal.Parse(orderElement.Element("price").Value, new CultureInfo("en-US"));
          order.Received = DateTime.Parse(orderElement.Element("received").Value);
          orderList.Add(order);
        }
      }

      return orderList.ToArray();
    }

    //public override Order[] SelectCrossedBuyOrders(int stockId)
    //{
    //  Order[] sellList = SelectSellOrders(stockId)./*Where(o => o.StockId == stockId).*/ToArray();

    //  if (sellList.Length == 0)
    //    return null;

    //  decimal minPrice = sellList.Min(o => o.ProposedPrice);
    //  return SelectBuyOrders(stockId).Where(o => /*o.StockId == stockId &&*/ o.ProposedPrice >= minPrice).ToArray();
    //}

    //public override Order[] SelectCrossedSellOrders(int stockId)
    //{
    //  Order[] buyList = SelectBuyOrders(stockId)./*Where(o => o.StockId == stockId).*/ToArray();

    //  if (buyList.Length == 0)
    //    return null;

    //  decimal maxPrice = buyList.Max(o => o.ProposedPrice);
    //  return SelectSellOrders(stockId).Where(o => /*o.StockId == stockId &&*/ o.ProposedPrice <= maxPrice).ToArray();
    //}

    private XElement PrepareTradeElement(Trade trade)
    {
      XElement tradeElement = new XElement("trade");
      tradeElement.Add(new XElement("amount", trade.Amount));
      tradeElement.Add(new XElement("price", trade.Price));
      tradeElement.Add(new XElement("stockId", trade.StockId));
      tradeElement.Add(new XElement("buyerId", trade.BuyerId));
      tradeElement.Add(new XElement("sellerId", trade.SellerId));
      tradeElement.Add(new XElement("buyOrderId", trade.BuyOrderId));
      tradeElement.Add(new XElement("sellOrderId", trade.SellOrderId));
      tradeElement.Add(new XElement("executed", trade.Executed));
      return tradeElement;
    }

    public override void ProcessTrade(Trade trade)
    {
      XDocument document = XDocument.Load(FileName);
      XElement tradesElement = document.Root.Element(TradesElementName);
      XElement ordersElement = document.Root.Element(OrdersElementName);
      XElement stocksElement = document.Root.Element(StocksElementName);

      UpdateStockPrice(trade.StockId, trade.Price, stocksElement);

      XElement tradeElement = PrepareTradeElement(trade);
      tradesElement.Add(tradeElement);

      XElement buyOrderElement = GetOrderElement(trade.BuyOrderId, ordersElement);
      ProcessOrderElement(buyOrderElement, trade);

      XElement sellOrderElement = GetOrderElement(trade.SellOrderId, ordersElement);
      ProcessOrderElement(sellOrderElement, trade);

      using (XmlWriter writer = new XmlTextWriter(FileName, Encoding.UTF8))
      {
        document.WriteTo(writer);
      }
    }

    public override void ProcessTrades(Trade[] trades)
    {
      if (trades.Length == 0)
        return;

      XDocument document = XDocument.Load(FileName);
      XElement tradesElement = document.Root.Element(TradesElementName);
      XElement ordersElement = document.Root.Element(OrdersElementName);
      XElement stocksElement = document.Root.Element(StocksElementName);

      UpdateStockPrice(trades.First().StockId, trades.First().Price, stocksElement); 

      foreach (Trade trade in trades)
      {
        XElement tradeElement = PrepareTradeElement(trade);
        tradesElement.Add(tradeElement);

        XElement buyOrderElement = GetOrderElement(trade.BuyOrderId, ordersElement);
        ProcessOrderElement(buyOrderElement, trade);

        XElement sellOrderElement = GetOrderElement(trade.SellOrderId, ordersElement);
        ProcessOrderElement(sellOrderElement, trade);
      }

      using (XmlWriter writer = new XmlTextWriter(FileName, Encoding.UTF8))
      {
        document.WriteTo(writer);
      }
    }

    private XElement GetOrderElement(int orderId, XElement ordersElement)
    {
      foreach (XElement orderElement in ordersElement.Elements())
        if (int.Parse(orderElement.Element("id").Value) == orderId)
          return orderElement;

      return null;
    }

    private void ProcessOrderElement(XElement orderElement, Trade trade)
    {
      int orderAmount = int.Parse(orderElement.Element("amount").Value);
      if (orderAmount == trade.Amount)
        orderElement.Remove();
      else
        orderElement.Element("amount").Value = (orderAmount - trade.Amount).ToString();
    }

    public override Trade[] SelectTrades(int stockId)
    {
      XDocument document = XDocument.Load(FileName);
      XElement tradesElement = document.Root.Element(TradesElementName);
      IList<Trade> tradeList = new List<Trade>();

      foreach (XElement tradeElement in tradesElement.Elements())
      {
        Trade trade = new Trade();
        trade.Amount = int.Parse(tradeElement.Element("amount").Value);
        trade.Price = decimal.Parse(tradeElement.Element("price").Value, new CultureInfo("en-US"));
        trade.StockId = int.Parse(tradeElement.Element("stockId").Value);
        trade.BuyerId = int.Parse(tradeElement.Element("buyerId").Value);
        trade.SellerId = int.Parse(tradeElement.Element("sellerId").Value);
        trade.BuyOrderId = int.Parse(tradeElement.Element("buyOrderId").Value);
        trade.SellOrderId = int.Parse(tradeElement.Element("sellOrderId").Value);
        trade.Executed = DateTime.Parse(tradeElement.Element("executed").Value);
        if (trade.StockId == stockId)
          tradeList.Add(trade);
      }

      return tradeList.ToArray();
    }

    //public override void PrintData()
    //{
    //  Stock[] stockList = SelectStocks();
    //  Order[] buyOrderList = SelectOrders(OrderType.BuyOrder);
    //  Order[] sellOrderList = SelectOrders(OrderType.SellOrder);
    //  Trade[] tradeList = SelectTrades();

    //  Console.WriteLine();
    //  Console.WriteLine("============================");
    //  Console.WriteLine("XmlDataProvider - PrintData:");

    //  Console.WriteLine();
    //  Console.WriteLine("StockList");
    //  Console.WriteLine("ID\tPrice");
    //  foreach (Stock stock in stockList)
    //    Console.WriteLine(String.Format("{0}\t{1}", stock.Id, stock.LastPrice));

    //  Console.WriteLine();
    //  Console.WriteLine("BuyList");
    //  Console.WriteLine("OrderID \tPrice\tQuantity");
    //  foreach (Order order in buyOrderList)
    //    Console.WriteLine(String.Format("{0}\t{1}\t{2}", order.Id, order.ProposedPrice, order.Amount));

    //  Console.WriteLine();
    //  Console.WriteLine("SellList");
    //  Console.WriteLine("OrderID \tPrice\tQuantity");
    //  foreach (Order order in sellOrderList)
    //    Console.WriteLine(String.Format("{0}\t{1}\t{2}", order.Id, order.ProposedPrice, order.Amount));

    //  Console.WriteLine();
    //  Console.WriteLine("TradeList");
    //  Console.WriteLine("BuyOrderID\tSellOrderID\tQuantity");
    //  foreach (Trade trade in tradeList)
    //    Console.WriteLine(String.Format("{0}\t{1}\t{2}", trade.BuyOrderId, trade.SellOrderId, trade.Amount));
    //}
  }
}
