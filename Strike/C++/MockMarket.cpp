#include <iostream>
#include <cstring>
#include <sys/socket.h> 
#include <unistd.h>  

#include "MockMarket.h"

using namespace std;


int main(int argc, char* argv[])
{
  if (argc != 3)
  {
    cout << "Run client with 2 arguments: Striker IP address and Port!" << endl;
    return -1;
  }

  const char* address = argv[1];
  const char* port = argv[2];

  MockMarket(address, port);
}

MockMarket::MockMarket(const char* address, const char* port)
{
  if (connectToStriker(address, port) != -1)
    doWork();
}

int MockMarket::connectToStriker(const char* address, const char* port)
{
  cout << "Connecting to Striker..." << endl;

  struct addrinfo hostInfo;
  memset(&hostInfo, 0, sizeof hostInfo);
  hostInfo.ai_family = AF_UNSPEC;     
  hostInfo.ai_socktype = SOCK_STREAM; 
  hostInfo.ai_flags = AI_PASSIVE;

  int status;
  status = getaddrinfo(address, port, &hostInfo, &hostInfoList);
  if (status != 0)
  {
    cout << "Connection failed. Calling getaddrinfo function caused an error: " << gai_strerror(status);
    return -1;
  }

  socketfd = socket(hostInfoList->ai_family, hostInfoList->ai_socktype, hostInfoList->ai_protocol);
  if (socketfd == -1)
  {
    cout << "Connection failed. Calling socket function caused an error.";
    return -1;
  }

  status = connect(socketfd, hostInfoList->ai_addr, hostInfoList->ai_addrlen);
  if (status == -1)
  {
    cout << "Connection failed. Calling connect function caused an error." << endl;
    return -1;
  }

  cout << "Connected." << endl;
  return 0;
}

void MockMarket::doWork()
{
  while(true)
  {
    cout << "Enter stock ID: ";
    string input;
    getline(cin, input);
    const char* task = input.c_str();
    if (strcmp(task, "stop") == 0)
      break;

    sendTask(task);

    if (receiveAnswer() == -1)
      break;
  }
}

int MockMarket::sendTask(const char* task)
{
  int len;
  len = strlen(task);
  cout << "Sending '" << task << "'..." << endl;
  ssize_t bytesSent;
  bytesSent = send(socketfd, task, len, 0);
  if (bytesSent == -1)
    cout << "Sending failed." << endl;
  return bytesSent;
}

int MockMarket::receiveAnswer()
{
  cout << "Waiting for data..." << endl;
  ssize_t bytesRecieved;
  char incommingDataBuffer[10000];
  bytesRecieved = recv(socketfd, incommingDataBuffer, 10000, 0);

  if (bytesRecieved == 0) 
  {
    cout << "Striker shut down." << endl;
    return -1;
  }

  if (bytesRecieved == -1)
  {
    cout << "Receiving failed." << endl;
    return -1;
  }

  cout << bytesRecieved << " bytes recieved:" << endl;
  incommingDataBuffer[bytesRecieved] = '\0';
  cout << incommingDataBuffer << endl;
  return 0;
}

MockMarket::~MockMarket()
{
  cout << "Closing connection..." << endl;
  freeaddrinfo(hostInfoList);
  close(socketfd);
}
