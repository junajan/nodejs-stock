//=================================
// include guard
#ifndef __MOCK_MARKET_H_INCLUDED__
#define __MOCK_MARKET_H_INCLUDED__
//=================================

#include <netdb.h>


class MockMarket
{

private:
  struct addrinfo *hostInfoList; 
  int socketfd; 

  int connectToStriker(const char* address, const char* port);
  void doWork();
  int sendTask(const char* task);
  int receiveAnswer();

public:
  MockMarket(const char* address, const char* port);
  ~MockMarket();

};

#endif // __MOCK_MARKET_H_INCLUDED__ 
 
