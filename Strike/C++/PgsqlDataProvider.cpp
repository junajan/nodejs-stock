#include <iostream>
#include <sstream>
#include "PgsqlDataProvider.h"

using namespace std;
using namespace pqxx;

#ifndef __STD_C_PLUS_PLUS_11__
  template <typename T> string PgsqlDataProvider::to_string(T number)   // metoda pro pripad, ze nelze pouzit std=c++11
  {
    ostringstream ss;
    ss << number;
    return ss.str();
  }
#endif

/*PgsqlDataProvider::PgsqlDataProvider()
{
  if (!initialize())
  {
    throw runtime_error("Failed to connect to the database.");
  }
}*/

PgsqlDataProvider::~PgsqlDataProvider()
{
  if (conn != NULL)
  {
    conn->disconnect();
    delete conn;
  }
  cout << "PgsqlDataProvider: Disconnected." << endl;
}

bool PgsqlDataProvider::initialize(StrikerConfig config)
{ 
  verbose = config.VERBOSE;

  ostringstream connectionStream;
  connectionStream << "dbname=" << config.DATABASE_NAME << 
      " user=" << config.DATABASE_USER << 
      " password=" << config.DATABASE_PASSWORD <<
      " hostaddr=" << config.DATABASE_ADDRESS << 
      " port=" << config.DATABASE_PORT;
  string connectionString = connectionStream.str();

  conn = new connection(connectionString); 
  if (conn->is_open()) 
  {
    if (verbose)
      cout << "Opened database successfully: " << conn->dbname() << endl;
    return true;
  } 

  cerr << "Can't open database" << endl;
  return false;
}

void PgsqlDataProvider::registerStriker(const char* address, const char* port)
{
  ostringstream prepareQuery;
  prepareQuery << "SELECT register_striker('" << address << "', " << port << ");";
  string query = prepareQuery.str();

  work w(*conn);
  w.exec(query);
  w.commit();
  if (verbose)
    cout << "Striker registered." << endl;
}

Stock PgsqlDataProvider::getStock(uint32_t id)
{
  nontransaction command(*conn);  
  string query = "SELECT id, price FROM get_stock(" + to_string(id) + ");";
  result queryResult(command.exec(query));
  
  if (verbose)
    cout << "Result of " << query << ": " << endl;

  if (queryResult.size() != 1)
  {
    cerr << "getStock: Incorrect number of results: " << queryResult.size() << endl;
    throw invalid_argument("getStock: Incorrect number of results.");
  }

  if (queryResult[0][0].is_null())
  {
    cerr << "getStock: Stock id = " << id << " does not exist." << endl;
    throw invalid_argument("getStock: Stock does not exist.");
  }

  Stock stock;
  stock.setId(queryResult[0][0].as<int>());
  stock.setPrice(Decimal(queryResult[0][1].as<string>()));
  if (verbose)
    cout << "Stock: id = " << stock.getId() << ", price = " << stock.getPrice() << endl;

  return stock;
}

OrderList PgsqlDataProvider::getOrders(OrderType type, string methodName, uint32_t stockId)
{
  OrderList orderList;

  nontransaction command(*conn);  
  string query = "SELECT id, broker_id, stock_id, amount, price FROM " + methodName + "(" + to_string(stockId) + ");";
  result queryResult(command.exec(query));
  
  if (verbose)
    cout << "Result of " << query << ": " << endl;

  ResultIterator endIterator = queryResult.end();
  for (ResultIterator iterator = queryResult.begin(); iterator != endIterator; ++iterator) 
  {
    Order order;
    order.setId(iterator[0].as<uint64_t>());
    order.setType(type); 
    order.setBrokerId(iterator[1].as<uint32_t>());
    order.setStockId(iterator[2].as<uint32_t>());
    order.setAmount(iterator[3].as<uint32_t>());
    order.setPrice(Decimal(iterator[4].as<string>()));
    orderList.push_back(order);
  }

  if (verbose)
    cout << orderList.size() << " orders. " << endl;

  return orderList;
}

OrderList PgsqlDataProvider::getCrossedBuyOrders(uint32_t stockId)
{
#ifdef __STD_C_PLUS_PLUS_11__
  return getOrders(OrderType::BuyOrder, "get_crossed_buy_orders", stockId); 
#else
  return getOrders(BuyOrder, "get_crossed_buy_orders", stockId); 
#endif
}

OrderList PgsqlDataProvider::getCrossedSellOrders(uint32_t stockId)
{
#ifdef __STD_C_PLUS_PLUS_11__
  return getOrders(OrderType::SellOrder, "get_crossed_sell_orders", stockId); 
#else
  return getOrders(SellOrder, "get_crossed_sell_orders", stockId); 
#endif
}

string PgsqlDataProvider::processTrades(const TradeList& tradeList)
{
  nontransaction command(*conn);  
  string query = prepareProcessTradesQuery(tradeList);
  result queryResult(command.exec(query));

  if (queryResult.size() == 1)
  {
    if (verbose)
      cout << "Trades processed successfully." << endl;
    return queryResult[0][0].as<string>();
  }

  cerr << "processTrades: Incorrect number of results: " << queryResult.size() << endl;
  throw invalid_argument("Failed to process trades.");
}

string PgsqlDataProvider::prepareProcessTradesQuery(const TradeList& tradeList)
{
  ostringstream query;
  query << "SELECT process_trades((ARRAY[";

  if (tradeList.size() != 0)  
  {
    ConstTradeIterator iterator = tradeList.begin();
    ConstTradeIterator endIterator = tradeList.end();

    query << format(*iterator);
    iterator++;

    while (iterator != endIterator)
    {
      query << ", " << format(*iterator);
      iterator++;
    }
  }

  query << "])::t_trade[]);";

  if (verbose)
    cout << "Query: " << query.str() << endl;
  return query.str();
}

string PgsqlDataProvider::format(Trade trade)
{
  ostringstream result;
  result << "$$(" << 
      trade.getBuyOrderId() << ", " << 
      trade.getSellOrderId() << ", " << 
      trade.getStockId() << ", " << 
      trade.getBuyerId() << ", " << 
      trade.getSellerId() << ", " << 
      trade.getAmount() << ", " << 
      trade.getPrice().toString() << ")$$";
  return result.str();
}

string PgsqlDataProvider::getPrice(string methodName, uint32_t stockId)
{
  nontransaction command(*conn);  
  string query = "SELECT " + methodName + "(" + to_string(stockId) + ");";
  result queryResult(command.exec(query));
  
  if (verbose)
    cout << "Result of " << query << ": ";

  if (queryResult.size() == 1 && !queryResult[0][0].is_null())
  {
    Decimal price = Decimal(queryResult[0][0].as<string>());
    if (verbose)
      cout << price << endl;
    return price.toString();
  }

  if (verbose)
    cout << "null" << endl;
  return "null";
}

string PgsqlDataProvider::getBidPrice(uint32_t stockId)
{
  return "null";
}

string PgsqlDataProvider::getAskPrice(uint32_t stockId)
{
  return "null";
}

