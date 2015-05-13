CXX = c++
CXXFLAGS = -Wall 
#CXXFLAGS = -Wall -pedantic -g #-D__STD_C_PLUS_PLUS_11__ -std=c++11
CPPFLAGS = -I/usr/local/include -I/usr/local/pgsql/include
LDFLAGS = -L/usr/local/lib -L/usr/local/pgsql/lib -lpqxx -lpq

PREFIX = $(HOME)
BINDIR = $(PREFIX)/bin
MANDIR = $(PREFIX)/man/man1
CONFIGDIR = $(PREFIX)/etc
 
BINS = striker mockmarket decimal
MANS = striker.1 mockmarket.1
CONFIGS = striker.conf

DECIMAL_OBJS = Decimal.o decDouble.o decQuad.o decContext.o
STRIKER_OBJS = Striker.o StrikerConfig.o TcpServer.o JsonDataProvider.o PgsqlDataProvider.o \
		PriceCalculator.o OrderMatcher.o PriceCalculationRow.o \
		Trade.o Order.o Stock.o $(DECIMAL_OBJS)
 

all: $(BINS) $(MANS) $(CONFIGS)
 

mockmarket: MockMarket.cpp MockMarket.h
	$(CXX) $(CXXFLAGS) -o mockmarket MockMarket.cpp
 

decimal: $(DECIMAL_OBJS)
	$(CXX) $(CXXFLAGS) -o decimal TestDecimal.cpp $(DECIMAL_OBJS) 

Decimal.o: Decimal.h Decimal.cpp decNumber/decDouble.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c Decimal.cpp

decDouble.o: decNumber/decDouble.h decNumber/decDouble.c decNumber/decQuad.h decNumber/decContext.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c decNumber/decDouble.c

decQuad.o: decNumber/decQuad.h decNumber/decQuad.c decNumber/decContext.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c decNumber/decQuad.c

decContext.o: decNumber/decContext.h decNumber/decContext.c
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c decNumber/decContext.c

TestDecimal.o: TestDecimal.cpp Decimal.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c TestDecimal.cpp


striker: $(STRIKER_OBJS)
	$(CXX) $(CXXFLAGS) $(STRIKER_OBJS) -o striker $(LDFLAGS)

Striker.o: Striker.cpp Striker.h Decimal.h Stock.h Order.h Trade.h PriceCalculator.h OrderMatcher.h StrikerConfig.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c Striker.cpp

StrikerConfig.o: StrikerConfig.h StrikerConfig.cpp
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c StrikerConfig.cpp

TcpServer.o: TcpServer.h TcpServer.cpp StrikerConfig.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c TcpServer.cpp

JsonDataProvider.o: JsonDataProvider.h JsonDataProvider.cpp Decimal.h Trade.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c JsonDataProvider.cpp

PgsqlDataProvider.o: PgsqlDataProvider.h PgsqlDataProvider.cpp OrderType.h Order.h Trade.h StrikerConfig.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c PgsqlDataProvider.cpp

PriceCalculator.o: PriceCalculator.h PriceCalculator.cpp Decimal.h Order.h PriceCalculationRow.h StrikerConfig.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c PriceCalculator.cpp

OrderMatcher.o: OrderMatcher.h OrderMatcher.cpp Decimal.h Order.h Trade.h StrikerConfig.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c OrderMatcher.cpp

PriceCalculationRow.o: PriceCalculationRow.h PriceCalculationRow.cpp Decimal.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c PriceCalculationRow.cpp

Trade.o: Trade.h Trade.cpp Order.h Decimal.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c Trade.cpp

Order.o: Order.h Order.cpp OrderType.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c Order.cpp

Stock.o: Stock.h Stock.cpp Decimal.h
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c Stock.cpp


install: $(BINS) $(MANS)
	install -d $(BINDIR)
	install -d $(MANDIR)
	install -d $(CONFIGDIR)
	install $(BINS) $(BINDIR)
	install $(MANS) $(MANDIR)
	install $(CONFIGS) $(CONFIGDIR)

clean:
	rm -f $(BINS) $(DECIMAL_OBJS) $(STRIKER_OBJS)
	rm -f *~ *.core
