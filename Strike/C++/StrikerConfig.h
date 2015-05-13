//=================================
// include guard
#ifndef __CONFIGURATION_H_INCLUDED__
#define __CONFIGURATION_H_INCLUDED__
//=================================

#include "Decimal.h"

class StrikerConfig
{

private:
//  std::streambuf* originalCout;
//  std::streambuf* originalCerr;

//  void backupOutput();
  void store(string key, string value);
  bool toBool(string value);

public:
  string DATABASE_ADDRESS;
  string DATABASE_PORT;
  string DATABASE_NAME;
  string DATABASE_USER;
  string DATABASE_PASSWORD;

  string MARKET_ADDRESS;
  bool MARKET_CHECK;

  Decimal TICK_SIZE;     
  bool VERBOSE;

  StrikerConfig();
  StrikerConfig(const char* fileName);

  void setDefaults();
  void loadConfig(const char* fileName);
//  void restoreOutput();

};

#endif // __CONFIGURATION_H_INCLUDED__ 
