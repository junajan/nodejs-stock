#include <iostream>
#include <sstream>
#include <fstream>
#include <algorithm>
#include <stdexcept>
#include "StrikerConfig.h"

using namespace std;


StrikerConfig::StrikerConfig()
{
//  cout << "StrikerConfig()" << endl;
//  backupOutput();
  setDefaults();
}

StrikerConfig::StrikerConfig(const char* fileName)
{
//  cout << "StrikerConfig(const char* fileName)" << endl;
//  backupOutput();
  setDefaults();
  loadConfig(fileName);
}

void StrikerConfig::setDefaults()
{
  DATABASE_ADDRESS = "127.0.0.1";
  DATABASE_PORT = "5432";
  DATABASE_NAME = "postgres";
  DATABASE_USER = "postgres";
  DATABASE_PASSWORD = "postgres";

  MARKET_ADDRESS = "127.0.0.1";
  MARKET_CHECK = true;

  TICK_SIZE = Decimal("0.001");     
  VERBOSE = true;

//  restoreOutput();
}

void StrikerConfig::loadConfig(const char* fileName)
{
  string line;
  ifstream file(fileName);

  if (!file.is_open())
    throw runtime_error("Failed to open the config file."); 

  while (getline(file, line))
  {
    //istringstream lineStream(line);
    stringstream lineStream(line);
    string key;

    if (getline(lineStream, key, '='))
    {
      string value;

      if (getline(lineStream, value)) 
	store(key, value);
    }
  }

  file.close();  
}

void StrikerConfig::store(string key, string value)
{
  if (key == "dbhost")
    DATABASE_ADDRESS = value;
  else if (key == "dbport")
    DATABASE_PORT = value;
  else if (key == "dbname")
    DATABASE_NAME = value;
  else if (key == "dbuser")
    DATABASE_USER = value;
  else if (key == "dbpass")
    DATABASE_PASSWORD = value;

  else if (key == "dbpass")
    DATABASE_PASSWORD = value;
  else if (key == "dbpass")
    DATABASE_PASSWORD = value;

  else if (key == "markethost")
    MARKET_ADDRESS = value;
  else if (key == "marketcheck")
    MARKET_CHECK = toBool(value);

  else if (key == "ticksize")
    TICK_SIZE = Decimal(value);
  else if (key == "verbose")
    VERBOSE = toBool(value);

/*
  else if (key == "cout")
  {
    ofstream out(value.c_str());
    cout.rdbuf(out.rdbuf()); 
  }
  else if (key == "cerr")
  {
    ofstream err(value.c_str());
    cerr.rdbuf(err.rdbuf()); 
  }
*/
  else
    cerr << "Unknown key: " << key << ", value: " << value << endl;
}

bool StrikerConfig::toBool(string value) 
{
  transform(value.begin(), value.end(), value.begin(), ::tolower);
  bool result = (value != "0" && value != "false" && value != "f");
  // TEMP
  cout << "toBool: " << value << " -> " << result << endl;
  return result;
}

/*
void StrikerConfig::backupOutput()
{
  cout << "backup output" << endl;
  originalCout = cout.rdbuf();
  originalCerr = cerr.rdbuf();
  cout << "done" << endl;
}

void StrikerConfig::restoreOutput()
{
  cout << "restore output" << endl;
  cout.rdbuf(originalCout);
  cerr.rdbuf(originalCerr);
  cout << "done" << endl;
}
*/
