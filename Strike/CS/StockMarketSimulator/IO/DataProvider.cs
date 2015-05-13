using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public abstract class DataProvider
  {
    protected string ProviderName;

    public DataProvider() 
    { 
      Initialize(); 
    }

    /// <summary>
    /// Inicializace providera.
    /// </summary>
    protected abstract void Initialize();

    /// <summary>
    /// Vrátí instanci třídy Stock odpovídající zadanému <code>stockId</code>. Pokud neexistuje, vrátí null.
    /// </summary>
    /// <param name="stockId">Identifikátor hledané akcie.</param>
    /// <returns>Hledaná akcie.</returns>
    public abstract Stock GetStock(int stockId);

    public abstract Stock[] SelectStocks();

    /// <summary>
    /// Vloží požadavek na nákup či prodej akcií.
    /// </summary>
    public abstract void AddOrder(Order order);

    /// <summary>
    /// Vrátí všechny objednávky na nákup akcií se zadaným <code>stockId</code>.
    /// </summary>
    /// <param name="stockId">Identifikátor hledané akcie.</param>
    /// <returns>Pole objednávek na nákup.</returns>
    public abstract Order[] SelectBuyOrders(int stockId);

    /// <summary>
    /// Vrátí všechny objednávky na prodej akcií se zadaným <code>stockId</code>.
    /// </summary>
    /// <param name="stockId">Identifikátor hledané akcie.</param>
    /// <returns>Pole objednávek na nákup.</returns>
    public abstract Order[] SelectSellOrders(int stockId);

    /// <summary>
    /// Vrátí objednávky na nákup akcií se zadaným <code>stockId</code> a dostatečně vysokou nabízenou cenou
    /// (tj. jejichž nabízená cena je rovna nebo vyšší než nejnižší požadovaná prodejní cena).
    /// </summary>
    /// <param name="stockId">Identifikátor hledané akcie.</param>
    /// <returns>Pole objednávek na nákup.</returns>
    public virtual Order[] SelectCrossedBuyOrders(int stockId)
    {
      Order[] sellList = SelectSellOrders(stockId).ToArray();

      if (sellList.Length == 0)
        return null;

      decimal minPrice = sellList.Min(o => o.ProposedPrice);
      return SelectBuyOrders(stockId).Where(o => o.ProposedPrice >= minPrice).ToArray();
    }

    /// <summary>
    /// Vrátí objednávky na prodej akcií se zadaným <code>stockId</code> a dostatečně nízkou požadovanou cenou
    /// (tj. jejichž požadovaná cena je rovna nebo nižší než nejvyšší nabízaná nákupní cena).
    /// </summary>
    /// <param name="stockId">Identifikátor hledané akcie.</param>
    /// <returns>Pole objednávek na prodej.</returns>
    public virtual Order[] SelectCrossedSellOrders(int stockId)
    {
      Order[] buyList = SelectBuyOrders(stockId).ToArray();

      if (buyList.Length == 0)
        return null;

      decimal maxPrice = buyList.Max(o => o.ProposedPrice);
      return SelectSellOrders(stockId).Where(o => o.ProposedPrice <= maxPrice).ToArray();
    }

    public abstract Trade[] SelectTrades(int stockId);

    /// <summary>
    /// Zapíše uzavřený obchod.
    /// </summary>
    /// <param name="trade">Uzavřený obchod.</param>
    public abstract void ProcessTrade(Trade trade);

    /// <summary>
    /// Zapíše uzavřené obchody.
    /// </summary>
    /// <param name="trades">Uzavřené obchody.</param>
    public virtual void ProcessTrades(Trade[] trades)
    {
      foreach (Trade trade in trades)
        ProcessTrade(trade);
    }

    /// <summary>
    /// Vypíše zjednodušený obsah evidovaných akcií, objednávek a uzavřených obchodů.
    /// </summary>
    public virtual void PrintData()
    {
      Stock[] stockList = SelectStocks();

      List<Order> buyOrders = new List<Order>();
      List<Order> sellOrders = new List<Order>();
      List<Trade> trades = new List<Trade>();

      foreach (Stock stock in stockList)
      {
        buyOrders.AddRange(SelectBuyOrders(stock.Id));
        sellOrders.AddRange(SelectSellOrders(stock.Id));
        trades.AddRange(SelectTrades(stock.Id));
      }

      Order[] buyOrderList = buyOrders.ToArray();
      Order[] sellOrderList = sellOrders.ToArray();
      Trade[] tradeList = trades.ToArray();

      Console.WriteLine();
      Console.WriteLine("============================");
      Console.WriteLine(ProviderName + " - PrintData:");

      Console.WriteLine();
      Console.WriteLine("StockList");
      Console.WriteLine("ID\tPrice");
      foreach (Stock stock in stockList)
        Console.WriteLine(String.Format("{0}\t{1}", stock.Id, stock.LastPrice));

      Console.WriteLine();
      Console.WriteLine("BuyList");
      Console.WriteLine("OrderID\tPrice\tQuantity");
      foreach (Order order in buyOrderList)
        Console.WriteLine(String.Format("{0}\t{1}\t{2}", order.Id, order.ProposedPrice, order.Amount));

      Console.WriteLine();
      Console.WriteLine("SellList");
      Console.WriteLine("OrderID\tPrice\tQuantity");
      foreach (Order order in sellOrderList)
        Console.WriteLine(String.Format("{0}\t{1}\t{2}", order.Id, order.ProposedPrice, order.Amount));

      Console.WriteLine();
      Console.WriteLine("TradeList");
      Console.WriteLine("BOID\tSOID\tQuantity");
      foreach (Trade trade in tradeList)
        Console.WriteLine(String.Format("{0}\t{1}\t{2}", trade.BuyOrderId, trade.SellOrderId, trade.Amount));
    }
  }
}
