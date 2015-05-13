#include <iostream>
#include <cstring>
#include <netdb.h>      
#include <unistd.h>
#include <arpa/inet.h>

#include "TcpServer.h"

using namespace std;


// Constructor of TcpServer. 
TcpServer::TcpServer()
{
  prepared = false;
}

// Destructor of TcpServer. Closes the connection if opened.
TcpServer::~TcpServer()
{
  if (prepared)
    closeConnection();
}

// Returns whether the socket is initialized.
bool TcpServer::isPrepared() const
{
  return prepared;
}

// Initializes the socket.
void TcpServer::initialize(const char* address, const char* port, StrikerConfig config)
{
  allowedAddress = config.MARKET_ADDRESS;
  checksAddress = config.MARKET_CHECK;
  verbose = config.VERBOSE;

  if (prepared)
    closeConnection();

  prepareConnection(address, port);
}

// Creates and sets up the socket.
int TcpServer::prepareConnection(const char* address, const char* port)
{
  memset(&hostInfo, 0, sizeof hostInfo);
  hostInfo.ai_family = AF_UNSPEC; 
  hostInfo.ai_socktype = SOCK_STREAM;

  status = getaddrinfo(address, port, &hostInfo, &hostInfoList);
  if (status != 0)  
  {
    cerr << "Getaddrinfo error: " << gai_strerror(status) << "!" << endl;
    return -1;
  }

  defaultSocketDescriptor = socket(hostInfoList->ai_family, hostInfoList->ai_socktype, hostInfoList->ai_protocol);
  if (defaultSocketDescriptor == -1)
  {
    cerr << "Socket error!" << endl;
    return -1;
  }

  int flag = 1;
  status = setsockopt(defaultSocketDescriptor, SOL_SOCKET, SO_REUSEADDR, &flag, sizeof(int));
  if (defaultSocketDescriptor == -1)
  {
    cerr << "Socket already in use!" << endl;
    return -1;
  }

  status = bind(defaultSocketDescriptor, hostInfoList->ai_addr, hostInfoList->ai_addrlen);
  if (status == -1)
  {
    cerr << "Bind error!" << endl;
    return -1;
  }

  prepared = true;
  return 0;
}

// Listens for a connection until a successful one is made.
void TcpServer::makeConnection()
{
  while (listenForConnection() != 0) 
    close(usedSocketDescriptor);
}

// Listens for a connection and checks the client's IP address. If not allowed, 
// the connection is refused.
int TcpServer::listenForConnection()
{
  if (verbose)
    cout << "Listening for connections..." << endl;
  status = listen(defaultSocketDescriptor, 0); // max. number of connection in queue
  while (status == -1)  
  {
    cerr << "Error: connection failed! Trying again..." << endl;
    status = listen(defaultSocketDescriptor, 0);
  }

  struct sockaddr_storage clientAddress;
  socklen_t addressSize = sizeof(clientAddress);
  usedSocketDescriptor = accept(defaultSocketDescriptor, (sockaddr *) &clientAddress, &addressSize);

  if (usedSocketDescriptor != -1)
  {
    if (isAllowedAddress(clientAddress))
    {
      if (verbose)
        cout << "Connection accepted. Using new socket descriptor: "  <<  usedSocketDescriptor << endl;
      return 0;
    }

    sendMessage("Connection refused. IP address not allowed!");
    cerr << "Connection refused. IP address not allowed!" << endl;
    return -1;
  }

  cerr << "Error: connection failed!" << endl;
  return -1;
}

// Checks whether the IP address is allowed.
bool TcpServer::isAllowedAddress(sockaddr_storage address)
{
  if (!checksAddress)
    return true;

  if (verbose)
    cout << "checking IP address: " << endl;
  char host[NI_MAXHOST];

  if (address.ss_family == AF_INET)
    inet_ntop(AF_INET, &(((struct sockaddr_in *)&address)->sin_addr), host, sizeof(host));
  else
    inet_ntop(AF_INET6, &(((struct sockaddr_in6 *)&address)->sin6_addr), host, sizeof(host));

  if (verbose)
    cout << "your address: " << host << ", allowed address: " << allowedAddress << endl;
  bool result = strcmp(host, allowedAddress.c_str()) == 0;

  return result;
}

// Closes the connection.
void TcpServer::closeConnection()
{
  if (verbose)
    cout << "Closing connection..." << endl;
  freeaddrinfo(hostInfoList);
  close(usedSocketDescriptor);
  close(defaultSocketDescriptor);
  if (verbose)
    cout << "Disconnected." << endl;
  prepared = false;
}

// Waits until a client's message is received.
string TcpServer::receiveMessage()
{
  ssize_t bytesRecieved;
  const int maxLength = 11;
  char dataBuffer[maxLength];

  bytesRecieved = recv(usedSocketDescriptor, dataBuffer, maxLength, 0);

  while (bytesRecieved <= 0)
  {
    cerr << "Error: receiving failed!" << endl;
    close(usedSocketDescriptor);
    makeConnection();

    if (verbose)
      cout << "Waiting for data..." << endl;
    bytesRecieved = recv(usedSocketDescriptor, dataBuffer, maxLength, 0);
  }

  if (verbose)
    cout << bytesRecieved << " bytes recieved: " << endl;
  dataBuffer[bytesRecieved] = '\0';
  if (verbose)
    cout << dataBuffer << endl;

  return string(dataBuffer);
}

// Sends the given message to the client.
void TcpServer::sendMessage(const string message)
{
  if (verbose)
    cout << "Sending message..." << endl;

  int length;
  ssize_t bytesSent;
  length = strlen(message.c_str());
  bytesSent = send(usedSocketDescriptor, message.c_str(), length, 0);

  if (verbose)
    cout << bytesSent << " bytes sent." << endl;
}
