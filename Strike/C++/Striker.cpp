#include <iostream>
#include <sstream>
#include <pqxx/pqxx> 
#include <exception>
//#include <stdlib>
#include <cstdlib>
#include <cstring>

#include "Decimal.h" 
#include "Stock.h"
#include "Order.h"
#include "Trade.h"
#include "PriceCalculationRow.h"
#include "PriceCalculator.h"
#include "OrderMatcher.h"
#include "JsonDataProvider.h"
//#include "StrikerConfig.h"
#include "Striker.h"


using namespace std;


// The main access point to the application.
int main(int argc, char* argv[])
{
  if (argc < 3)
  {
    cout << "Usage is: <address> <port> [<config>], or" << endl;
    cout << "-a <address> -p <port> [-c <config>]." << endl;
    return -1;
  }

  char* address = 0;
  char* port = 0;
  char* configFile = 0;
  char* defaultConfigFile = strcat(getenv("HOME"), "/etc/striker.conf");

  if (argv[1][0] != '-')
  {
    address = argv[1];
    port = argv[2];
    configFile = (argc < 4) ? defaultConfigFile : argv[3];
  }
  else
  {
    for (int index = 1; index < argc; index += 2)
    {
      if (index + 1 == argc)
      {
	cerr << "Wrong number of arguments. " << argv[index] << " ignored." << endl;
	break;
      }

      if (strcmp(argv[index], "-a") == 0)
	address = argv[index + 1];
      else if (strcmp(argv[index], "-p") == 0)
	port = argv[index + 1];
      else if (strcmp(argv[index], "-c") == 0)
	configFile = argv[index + 1];
      else
	cerr << "Unknown argument: " << argv[index] << " (" << argv[index + 1] << " ignored). " << endl;
    }

    if (address == 0 || port == 0)
    {
      cerr << "IP address and port must be specified." << endl;
      return -1;
    }
    if (configFile == 0)
      configFile = defaultConfigFile;
  }

  StrikerConfig config(configFile);
  Striker(address, port, config);
  return 0;
}

// Constructor of Striker. Initializes connections and lets the Striker work.
Striker::Striker(const char* address, const char* port, StrikerConfig& config)
{
  Striker::config = config;
  printConfig();

  if (!dataProvider.initialize(config))
  {
    cerr << "Failed to connect to the database. Terminating." << endl;
    return;
  }
  dataProvider.registerStriker(address, port);
  tcpServer.initialize(address, port, config);
  if (!tcpServer.isPrepared())	
  {
    cerr << "TCP server is not prepared. Terminating." << endl;
    return;
  }

  cout << "Striker listens for Market on IP address = " << address << ", port = " << port << endl;
  tcpServer.makeConnection();

  doWork();
}

void Striker::printConfig()
{
  cout << "DATABASE_ADDRESS = " << config.DATABASE_ADDRESS << endl;
  cout << "DATABASE_PORT = " << config.DATABASE_PORT << endl;
  cout << "DATABASE_NAME = " << config.DATABASE_NAME << endl;
  cout << "DATABASE_USER = " << config.DATABASE_USER << endl;
  cout << "DATABASE_PASSWORD = " << config.DATABASE_PASSWORD << endl;
  cout << "MARKET_ADDRESS = " << config.MARKET_ADDRESS << endl;
  cout << "MARKET_CHECK = " << config.MARKET_CHECK << endl;
  cout << "TICK_SIZE = " << config.TICK_SIZE << endl;
  cout << "VERBOSE = " << config.VERBOSE << endl;
}

// Main loop in which the application receives incoming messages
// and processes them.
void Striker::doWork()
{
  uint32_t stockId;  
  while (true)
  {
    string received = tcpServer.receiveMessage();
    cout << "received: " << received << endl;
    stringstream ss(received);

    if (ss >> stockId)
      processStock(stockId);
    else
      processError(received);
  }
}

// Sends an error message to the Market.
void Striker::processError(string received)
{
  try
  {
    cerr << "Wrong argument: " << received << " not recognized as a number (should be ID of stock to be solved)." << endl;
    tcpServer.sendMessage("wrong input");
  }
  catch (exception& e) 
  {
    cerr << "Connection with Market lost. Failed to send the error message: " << endl << e.what() << endl;
  }
}

// Calculates the trade price and matches the orders 
// for the given stock ID and sends the result to the Market. 
void Striker::processStock(uint32_t stockId)
{
  try
  {
    if (config.VERBOSE)
      cout << endl << ">>> Calculating price, matching orders and processing trades for stockId = " << stockId << " <<<" << endl;
    string resultMessage = calculateStock(stockId); 
    tcpServer.sendMessage(resultMessage);
  }
  catch (exception& e) 
  {
    cerr << "Connection with Market lost. Failed to send the result: " << endl << e.what() << endl;
  }
}

// Calculates the trade price and matches the orders 
// for the specified stock ID. 
string Striker::calculateStock(uint32_t stockId)
{
  string resultMessage;

  try
  {
    if (config.VERBOSE)
      cout << "getStock(" << stockId << ")..." << endl;
    Stock stock = dataProvider.getStock(stockId);
    if (config.VERBOSE)
      cout << "getCrossedBuyOrders(" << stockId << ")..." << endl;
    OrderList buyList = dataProvider.getCrossedBuyOrders(stockId);  
    if (config.VERBOSE)
      cout << "getCrossedSellOrders(" << stockId << ")..." << endl;
    OrderList sellList = dataProvider.getCrossedSellOrders(stockId); // FIXME: toto je efektivni pouze v C++11

    if (config.VERBOSE)
      cout << "getPrice..." << endl;
    PriceCalculator calculator(config);
    PriceCalculationRow tradeInfo = calculator.getPrice(buyList, sellList, stock.getPrice());
    Decimal price = tradeInfo.getPrice();
    uint32_t amount = tradeInfo.getTradeableQuantity();
    if (config.VERBOSE)
      cout << endl << "price = " << price << endl << endl;

    if (config.VERBOSE)
      cout << "matchOrders..." << endl;
    OrderMatcher matcher(config);
    TradeList tradeList;
    matcher.matchOrders(tradeList, buyList, sellList, price); // FIXME: toto je efektivni zpusob pred C++11
//    tradeList = matcher.matchOrders(buyList, sellList, price); // FIXME: takhle to vypada spravne podle C++11

    if (config.VERBOSE)
      cout << "processTrades..." << endl;
    string strikeTime = dataProvider.processTrades(tradeList);

    if (config.VERBOSE)
      cout << "calculating bid & ask prices..." << endl;
    string bid = buyList.size() > 0 ? buyList.front().getPrice().toString() : dataProvider.getBidPrice(stockId);
    string ask = sellList.size() > 0 ? sellList.front().getPrice().toString() : dataProvider.getAskPrice(stockId);

    JsonDataProvider jsonProvider;
    resultMessage = jsonProvider.serialize(stock.getId(), price, amount, bid, ask, strikeTime, tradeList);
    if (config.VERBOSE)
      cout << endl << "Message: " << resultMessage << endl;
    else
      cout << "Done." << endl;
  }
  catch (exception& e)
  {
    cerr << "Error occured during solving stockId = " << stockId << ": " << endl << e.what() << endl;
    resultMessage = "null";
  }  

  return resultMessage;
}
