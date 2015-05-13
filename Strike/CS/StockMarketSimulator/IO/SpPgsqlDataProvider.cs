using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Data.Odbc;
using System.Data;
using System.Globalization;

namespace StockMarketSimulator
{
  public class SpPgsqlDataProvider : DataProvider
  {
    private OdbcConnection connection;

    protected override void Initialize()
    {
      connection = new OdbcConnection("DSN=PostgreSQL;UID=postgres;PWD=heslo123");
      connection.Open();
      Recorder.Instance.WriteLine("State: " + connection.State.ToString());
      ProviderName = "SpPgsqlDataProvider";
    }

    public override Stock GetStock(int stockId)
    {
      Stock stock = null;

      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;
        command.CommandText = string.Format("SELECT ticker, price FROM get_stock({0});", stockId);

        using (OdbcDataReader reader = command.ExecuteReader(CommandBehavior.SingleResult))
        {
          if (reader.HasRows)
          {
            stock = new Stock();
            stock.Id = stockId; 
            stock.Ticker = reader.GetString(0); 
            stock.LastPrice = reader.GetDecimal(1); 
          }

          reader.Close();
        }
      }

      return stock;
    }

    public override Stock[] SelectStocks()
    {
      IList<Stock> stocks = new List<Stock>();

      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;
        command.CommandText = "SELECT id, ticker, price FROM stocks;"; // nebo: FROM get_stocks();

        using (OdbcDataReader reader = command.ExecuteReader())
        {
          while (reader.Read())
          {
            Stock stock = new Stock();
            stock.Id = reader.GetInt32(0);
            stock.Ticker = reader.GetString(1);
            stock.LastPrice = reader.GetDecimal(2);
            stocks.Add(stock);
          }

          reader.Close();
        }
      }

      return stocks.ToArray();
    }

    public override void AddOrder(Order order)
    {
      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;

        int orderTypeId = (order.Type == OrderType.BuyOrder) ? Constants.BuyOrderId : Constants.SellOrderId;
        string query = string.Format("SELECT insert_order({0}, {1}, {2}, {3}, {4})",
            orderTypeId, order.BrokerId, order.StockId, order.Amount, 
            order.ProposedPrice.ToString(CultureInfo.CreateSpecificCulture("en-US")));
        command.CommandText = query;

        using (OdbcDataReader reader = command.ExecuteReader(CommandBehavior.SingleResult))
        {
          if (reader.HasRows)
          {
            order.Id = reader.GetInt32(0);
          }

          reader.Close();
        }
      }
    }

    public override Order[] SelectBuyOrders(int stockId)
    {
      return SelectOrders(OrderType.BuyOrder, "get_active_buy_orders", stockId);
    }

    public override Order[] SelectSellOrders(int stockId)
    {
      return SelectOrders(OrderType.SellOrder, "get_active_sell_orders", stockId);
    }

    private Order[] SelectOrders(OrderType type, string methodName, int stockId) 
    {
      IList<Order> orders = new List<Order>();

      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;
        command.CommandText = string.Format("SELECT id, broker_id, stock_id, amount, price, received FROM {0}({1});", 
            methodName, stockId);

        using (OdbcDataReader reader = command.ExecuteReader())
        {
          while (reader.Read())
          {
            //id, bid, sid, amount, price, received
            Order order = new Order();
            order.Type = type;
            order.Id = reader.GetInt32(0);
            order.BrokerId = reader.GetInt32(1);
            order.StockId = reader.GetInt32(2);
            order.Amount = reader.GetInt32(3);
            order.ProposedPrice = reader.GetDecimal(4);
            order.Received = reader.GetDateTime(5);
            orders.Add(order);
          }

          reader.Close();
        }
      }

      return orders.ToArray();
    }

    public override Order[] SelectCrossedBuyOrders(int stockId)
    {
      return SelectOrders(OrderType.BuyOrder, "get_crossed_buy_orders", stockId);
    }

    public override Order[] SelectCrossedSellOrders(int stockId)
    {
      return SelectOrders(OrderType.SellOrder, "get_crossed_sell_orders", stockId);
    }

    public override Trade[] SelectTrades(int stockId)
    {
      IList<Trade> trades = new List<Trade>();

      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;
        command.CommandText = string.Format(
            "SELECT id, buy_order_id, sell_order_id, stock_id, buyer_id, seller_id, amount, price, executed " +
            "FROM get_trades({0});", stockId);

        using (OdbcDataReader reader = command.ExecuteReader())
        {
          while (reader.Read())
          {
            Trade trade = new Trade();
            trade.Id = reader.GetInt32(0);
            trade.BuyOrderId = reader.GetInt32(1);
            trade.SellOrderId = reader.GetInt32(2);
            trade.StockId = reader.GetInt32(3);
            trade.BuyerId = reader.GetInt32(4);
            trade.SellerId = reader.GetInt32(5);
            trade.Amount = reader.GetInt32(6);
            trade.Price = reader.GetDecimal(7);
            trade.Executed = reader.GetDateTime(8);
            trades.Add(trade);
          }

          reader.Close();
        }
      }

      return trades.ToArray();
    }

    public override void ProcessTrade(Trade trade)
    {
      string serializedTrade = Format(trade);
      string query = string.Format("SELECT process_trades((ARRAY[{0}])::t_trade[]);", serializedTrade);

      using (OdbcCommand command = new OdbcCommand())
      {
        command.Connection = connection;
        command.CommandText = query;
        command.ExecuteNonQuery();
      }
    }

    public override void ProcessTrades(Trade[] trades)
    {
      string[] serializedTrades = new string[trades.Length]; 
      for (int index = 0; index < trades.Length; index++)
        serializedTrades[index] = Format(trades[index]);

      string query = string.Format("SELECT process_trades((ARRAY[{0}])::t_trade[]);",
          string.Join(", ", serializedTrades));

      using (OdbcCommand command = new OdbcCommand())
      {
        try
        {
          command.Connection = connection;
          command.CommandText = query;
          command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
          Recorder.Instance.WriteLine("Exception occured during processing trades: " + ex.Message + 
              ". No ownership changes were made.");
        }
      }
    }

    private string Format(Trade trade)
    {
      // example: $$(1, 3, 1, 1, 1, 20, 11.5)$$
      return string.Format("$$({0}, {1}, {2}, {3}, {4}, {5}, {6})$$",
          trade.BuyOrderId, trade.SellOrderId, trade.StockId, trade.BuyerId, trade.SellerId,
          trade.Amount, trade.Price.ToString(CultureInfo.CreateSpecificCulture("en-US")));
    }
  }
}
