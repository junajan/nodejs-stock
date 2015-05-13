//=================================
// include guard
#ifndef __STRIKER_H_INCLUDED__
#define __STRIKER_H_INCLUDED__
//=================================

#include "PgsqlDataProvider.h"
#include "TcpServer.h"
#include "StrikerConfig.h"


class Striker
{

private:
  StrikerConfig config;
  TcpServer tcpServer;
  PgsqlDataProvider dataProvider;

  void printConfig();
  void doWork();
  void processError(std::string received);
  void processStock(uint32_t stockId);
  string calculateStock(uint32_t stockId);

public:
  Striker(const char* address, const char* port, StrikerConfig& config);

};

#endif // __STRIKER_H_INCLUDED__ 
 
