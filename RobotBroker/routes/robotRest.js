module.exports = function(app) {
    
    // na jake adrese bude rest sluzba naslouchat    
    var restUri = '/broker-rest/';

    // trida zpracovavajici REST pozadavky
    var REST = require('../modules/robotApi') ( app );

    app.get( restUri + 'broker-info', REST.getServerStatusInfo );
    app.get( restUri + 'history', REST.getHistory );
    app.get( restUri + 'pending-orders', REST.getPendingOrders );
    app.get( restUri + 'owned-stocks', REST.getMyStocks );
    app.get( restUri + 'stocks', REST.getStocks );
    app.get( restUri + 'robot-info', REST.getRobotInfo );
    app.get( restUri + 'robot-state', REST.getRobotState );
    app.get( restUri + 'robot-state-switch', REST.switchRobotState );
    app.get( restUri + 'traded-stocks', REST.getTradedStocks );
    app.get( restUri + 'stock-info/:code', REST.getStockInfo );
};
