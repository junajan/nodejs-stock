using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  class Program
  {
    static void Main(string[] args)
    {
      DataProvider dataProvider = new SpPgsqlDataProvider();
      //DataProvider dataProvider = new PostgresqlDataProvider();
      //DataProvider dataProvider = new XmlDataProvider();

      //TEST: dataProvider.AddOrder(new Order(1, 1, 1, 1.5m));

      // nechť počítáme akcie č. 1, správně by tu měl být foreach
      int stockId = 1;   

      // řekneme si o "použitelné" objednávky: 
      Stock stock = dataProvider.GetStock(stockId);  
      Order[] buyOrders = dataProvider.SelectCrossedBuyOrders(stock.Id);   
      Order[] sellOrders = dataProvider.SelectCrossedSellOrders(stock.Id); 

      dataProvider.PrintData();

      // Nyní si můžeme nechat spočítat cenu:
      Console.WriteLine();
      Console.WriteLine("IOS calculator: ");
      PriceCalculator calculator = new IosPriceCalculator();
      decimal price = calculator.GetPrice(buyOrders, sellOrders, Constants.TickSize, stock.LastPrice);

      Console.WriteLine("Price: " + price);

      OrderMatcher matcher = new OrderMatcher();
      Trade[] trades = matcher.MatchOrders(buyOrders, sellOrders, price);
      dataProvider.ProcessTrades(trades);

      // TODO: pošle Marketu zprávu: stockId, price, executed, [amount, buyerId, buyOrderId, sellerId, sellOrderId]

      Console.WriteLine("Trades processed.");

      dataProvider.PrintData();

      Console.ReadLine();
    }
  }
}
