var form = require("express-form"),
    field = form.field;

module.exports = function(app) {
    
    // na jake adrese bude rest sluzba naslouchat    
    var restUri = '/broker-rest/';

    // trida zpracovavajici REST pozadavky
    var REST = require('../modules/brokerApi') ( app );
    

    app.get( restUri + 'clients', REST.getClients );
    app.get( restUri + 'clients/:id', REST.getClientDetail );
    app.get( restUri + 'broker-info', REST.getServerStatusInfo );
    app.get( restUri + 'history', REST.getHistory );
    app.get( restUri + 'pending-orders', REST.getPendingOrders );
    app.get( restUri + 'owned-stocks', REST.getMyStocks );
    app.get( restUri + 'owned-stocks/:code', REST.getMyStocksDetail );
    app.get( restUri + 'stocks', REST.getStocks );
    app.get( restUri + 'stock-info/:code', REST.getStockInfo );
    
}

