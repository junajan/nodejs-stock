//=================================
// include guard
#ifndef __TCP_SERVER_H_INCLUDED__
#define __TCP_SERVER_H_INCLUDED__
//=================================

#include <sys/socket.h>
#include <netdb.h>
#include "StrikerConfig.h"

class TcpServer
{

private:
  int status;
  struct addrinfo hostInfo;      
  struct addrinfo *hostInfoList; 
  int defaultSocketDescriptor; 
  int usedSocketDescriptor; 
  bool prepared;

  std::string allowedAddress;
  bool checksAddress;
  bool verbose;

  int prepareConnection(const char* address, const char* port);
  int listenForConnection();
  bool isAllowedAddress(sockaddr_storage address);
  void closeConnection();

public:
  TcpServer();
  ~TcpServer();
  bool isPrepared() const;
  void initialize(const char* address, const char* port, StrikerConfig);
  void makeConnection();

  std::string receiveMessage();
  void sendMessage(const std::string message);

};

#endif // __TCP_SERVER_H_INCLUDED__ 
