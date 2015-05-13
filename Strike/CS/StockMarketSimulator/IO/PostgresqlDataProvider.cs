using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Data.Odbc;
using System.Data;
using System.Globalization;

namespace StockMarketSimulator
{
  public class PostgresqlDataProvider : DataProvider
  {
    private OdbcConnection connection;

    protected override void Initialize()
    {
      connection = new OdbcConnection("DSN=PostgreSQL;UID=postgres;PWD=heslo123");
      connection.Open();
      Recorder.Instance.WriteLine("State: " + connection.State.ToString());
      ProviderName = "PostgresqlDataProvider";
    }

    //~PostgresqlDataProvider() 
    //{
    //  if (connection.State != ConnectionState.Closed)
    //    connection.Close();
    //}

    public override Stock GetStock(int stockId)
    {
      string query = "SELECT id, ticker, price FROM stocks WHERE id = " + stockId;
      OdbcCommand command = new OdbcCommand(query, connection);
      OdbcDataReader reader = command.ExecuteReader(CommandBehavior.SingleResult);

      if (!reader.HasRows)
      {
        reader.Close();
        return null;
      }

      Stock stock = new Stock();
      stock.Id = reader.GetInt32(0);
      stock.Ticker = reader.GetString(1);
      stock.LastPrice = reader.GetDecimal(2);

      reader.Close();
      return stock;
    }

    public override Stock[] SelectStocks()
    {
      IList<Stock> stocks = new List<Stock>();

      string query = "SELECT id, ticker, price FROM stocks";
      OdbcCommand command = new OdbcCommand(query, connection);
      OdbcDataReader reader = command.ExecuteReader();

      while (reader.Read())
      {
        Stock stock = new Stock();
        stock.Id = reader.GetInt32(0);
        stock.Ticker = reader.GetString(1);
        stock.LastPrice = reader.GetDecimal(2);
        stocks.Add(stock);
      }

      reader.Close();
      return stocks.ToArray();
    }

    public override void AddOrder(Order order)
    {
      int orderTypeId = (order.Type == OrderType.BuyOrder) ? 1 : 2;

      string queryTemplate = "INSERT INTO {0} " + string.Format("(oid, bid, sid, amount, price, received) VALUES " +
          "({0}, {1}, {2}, {3}, {4}, TIMESTAMP '{5}');", orderTypeId, order.BrokerId, order.StockId, order.Amount, 
          order.ProposedPrice.ToString(CultureInfo.CreateSpecificCulture("en-US")), order.Received);

      OdbcCommand command = new OdbcCommand();
      OdbcTransaction transaction = null;
      DateTime now = DateTime.Now;

      try
      {
        transaction = connection.BeginTransaction();
        command.Connection = connection;
        command.Transaction = transaction;

        command.CommandText = string.Format(queryTemplate, "live_orders");
        command.ExecuteNonQuery();

        command.CommandText = string.Format(queryTemplate, "archived_orders");
        command.ExecuteNonQuery();

        transaction.Commit();
      }
      catch (Exception ex)
      {
        Console.WriteLine(ex.Message);
        try
        {
          transaction.Rollback();
        }
        catch { }
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
      IList<Order> orderList = new List<Order>();
      int orderTypeId = (type == OrderType.BuyOrder) ? 1 : 2;

      string query = "SELECT id, bid, amount, price, received FROM live_orders WHERE oid = " + orderTypeId + 
        " AND sid = " + stockId;
      OdbcCommand command = new OdbcCommand(query, connection);
      OdbcDataReader reader = command.ExecuteReader();

      while (reader.Read())
      {
        Order order = new Order();
        order.Id = reader.GetInt32(0);
        order.Type = type;
        order.StockId = stockId;
        order.BrokerId = reader.GetInt32(1);
        order.Amount = reader.GetInt32(2);
        order.ProposedPrice = reader.GetDecimal(3);
        order.Received = reader.GetDateTime(4);
        orderList.Add(order);
      }

      reader.Close();
      return orderList.ToArray();
    }

    public override Trade[] SelectTrades(int stockId)
    {
      IList<Trade> trades = new List<Trade>();

      string query = "SELECT id, boid, soid, sid, buyer, seller, amount, price FROM trades WHERE sid = " + stockId;
      OdbcCommand command = new OdbcCommand(query, connection);
      OdbcDataReader reader = command.ExecuteReader();

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
        trades.Add(trade);
      }

      reader.Close();
      return trades.ToArray();
    }

    public override void ProcessTrade(Trade trade)
    {
      OdbcCommand command = new OdbcCommand();
      OdbcTransaction transaction = null;
      DateTime now = DateTime.Now;

      try
      {
        transaction = connection.BeginTransaction();
        command.Connection = connection;
        command.Transaction = transaction;

        // stock
        command.CommandText =
            "UPDATE stocks SET price = " + trade.StockId + " WHERE id = " + trade.StockId;
        command.ExecuteNonQuery();

        // trade
        command.CommandText =
            "INSERT INTO trades (boid, soid, sid, buyer, seller, amount, price, executed) VALUES " +
            string.Format("({0}, {1}, {2}, {3}, {4}, {5}, {6}, TIMESTAMP '{7}');", 
            trade.BuyOrderId, trade.SellOrderId, trade.StockId, trade.BuyerId, trade.SellerId, 
            trade.Amount, trade.Price.ToString(CultureInfo.CreateSpecificCulture("en-US")), now);
        command.ExecuteNonQuery();

        // buy order
        ProcessTradeOrder(trade.Amount, command, now, trade.BuyOrderId);

        // sell order
        ProcessTradeOrder(trade.Amount, command, now, trade.SellOrderId);

        transaction.Commit();
      }
      catch (Exception ex)
      {
        Console.WriteLine(ex.Message);
        try
        {
          transaction.Rollback();
        }
        catch { }
      }
    }

    public override void ProcessTrades(Trade[] trades)
    {
      if (trades.Length == 0)
        return;

      OdbcCommand command = new OdbcCommand();
      OdbcTransaction transaction = null;
      DateTime now = DateTime.Now;

      try
      {
        transaction = connection.BeginTransaction();
        command.Connection = connection;
        command.Transaction = transaction;

        // stock
        command.CommandText =
            "UPDATE stocks SET price = " + trades.First().StockId + " WHERE id = " + trades.First().StockId;
        command.ExecuteNonQuery();

        foreach (Trade trade in trades)
        {
          // trade
          command.CommandText =
              "INSERT INTO trades (boid, soid, sid, buyer, seller, amount, price, executed) VALUES " +
              string.Format("({0}, {1}, {2}, {3}, {4}, {5}, {6}, TIMESTAMP '{7}');", 
              trade.BuyOrderId, trade.SellOrderId, trade.StockId, trade.BuyerId, trade.SellerId,
              trade.Amount, trade.Price.ToString(CultureInfo.CreateSpecificCulture("en-US")), now);
          command.ExecuteNonQuery();

          // buy order
          ProcessTradeOrder(trade.Amount, command, now, trade.BuyOrderId);

          // sell order
          ProcessTradeOrder(trade.Amount, command, now, trade.SellOrderId);
        }

        transaction.Commit();
      }
      catch (Exception ex)
      {
        Console.WriteLine(ex.Message);
        try
        {
          transaction.Rollback();
        }
        catch { }
      }
    }

    private void ProcessTradeOrder(int tradeAmount, OdbcCommand command, DateTime executed, int orderId)
    {
      command.CommandText = "SELECT amount FROM live_orders WHERE id = " + orderId;
      OdbcDataReader reader = command.ExecuteReader(CommandBehavior.SingleResult);

      if (!reader.Read())
        throw new ArgumentNullException("Order id = " + orderId + " does not exist!");

      int orderAmount = reader.GetInt32(0);
      reader.Close();

      if (orderAmount == tradeAmount)
      {
        command.CommandText = "DELETE FROM live_orders WHERE id = " + orderId;
        command.ExecuteNonQuery();
        command.CommandText = "UPDATE archived_orders SET executed = " +
          string.Format("TIMESTAMP '{0}'", executed) + " WHERE id = " + orderId;
        command.ExecuteNonQuery();
      }
      else
      {
        command.CommandText = "UPDATE live_orders SET amount = " + (orderAmount - tradeAmount) +
            " WHERE id = " + orderId;
        command.ExecuteNonQuery();
      }
    }
  }
}
