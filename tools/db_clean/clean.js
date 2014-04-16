collections_broker	= [
	"clientconnections", "clients", "settings",
	"clienthistories", "clientstocks", "orders", "stocklist"
];

collections_market = [
	"orders", "orders_finished",
	"brokers", "broker_connections", "broker_stocks",
	"stocks", "stock_history"
];


var DB_Broker = new require("mongojs").connect("broker", collections_broker);
var DB_Market = new require("mongojs").connect("market", collections_market);

var cb = function ( err, res ) { 

	console.dir ( res );
}

// smaz data u brokera
DB_Broker.clientstocks.drop( cb );
DB_Broker.clienthistories.drop( cb );
DB_Broker.clientconnections.drop( cb );
DB_Broker.orders.drop( cb );
DB_Broker.stocklist.drop( cb );

// smaz data na burze
DB_Market.orders.drop( cb );
DB_Market.broker_connections.drop( cb );
DB_Market.orders_finished.drop( cb );
DB_Market.broker_stocks.drop( cb );
DB_Market.stock_history.drop( cb );

DB_Market.stocks.update({}, {$set: { priceChange: 0, amount: 0}}, {multi:true}, cb );