/**
 * Controller obsluhujici modalni okni s emisi akcii
 */
var StockEmission = function($scope, $http, $modalInstance, MsgService) {

    $scope.emise = {};

    $scope.ok = function() {

        $scope.emise.code = $scope.code;

        $http.post("/rest/stock-emission", $scope.emise).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Emise byla úspěšná.", 1.5);
                $scope.loadCompanies();
                $modalInstance.close();
            }
        });

    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
}

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var AddCompany = function($scope, $http, $modalInstance, MsgService) {

    if ( $scope.editInfo ) {

        $scope.type = "Editace";
        $scope.name = $scope.editInfo.name;
        $scope.n = $scope.editInfo;
        $scope.n.codeOld = $scope.n.code;
    } else {

        $scope.type = "Přidání";
        $scope.name = "";
        $scope.n = {};
        $scope.n.amount = 0;
    }

    $scope.ok = function() {

        $http.post("/rest/add-stock", $scope.n).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Položka byla přidána do seznamu.", 1.5);
                $scope.loadCompanies();
                $modalInstance.close();
            }
        });
    }

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
}

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var AddBroker = function($scope, $http, $modalInstance, MsgService) {

    if ( $scope.editInfo ) {

        $scope.type = "Editace";
        $scope.name = $scope.editInfo.name;
        $scope.n = $scope.editInfo;
        $scope.n.codeOld = $scope.n.code;
    } else {

        $scope.type = "Přidání";
        $scope.name = "";
        $scope.n = {};
        $scope.n.amount = 0;
    }

    $scope.ok = function() {

        $http.post("/rest/add-broker", $scope.n).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Položka byla přidána do seznamu.", 1.5);
                $scope.loadData();
                $modalInstance.close();
            }
        });
    }

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
}

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var OrderBookLine = function($scope, $http, $modalInstance, MsgService) {

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
}


/**
 * Controller obsluhujici index page
 */
app.controller("IndexController", function($scope, $http, MsgService) {

    $http.get("/rest/server-info").then(function(res) {

        $scope.info = res.data;
    });
});

/**
 * Controller obsluhujici error404 stranku
 */
app.controller("Error404Controller", function($scope) {});

/**
 * Controller obsluhujici stranku s historii
 */
app.controller("History", function($scope, $http, MsgService) {
});

/**
 * Controller obsluhujici seznam spolecnosti
 */
app.controller("Stocks", function($scope, $http, MsgService, $modal) {

    $scope.n = {};
    $scope.timeout = false;

    $scope.loadCompanies = loadCompanies = function(cb) {

        $http.get("/rest/stock-list").then(function(res) {

            $scope.data = res.data;
            if ( cb ) 
                cb();
        });
    }

    $scope.timeout = setInterval( loadCompanies, 1000);
    loadCompanies();

    $scope.$on("$destroy", function() {
        clearInterval($scope.timeout);
    });

    $scope.showAddForm = function( code ) {

        if ( code ) 
            $scope.editInfo = $scope.data[code];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/addStock.html',
            controller: AddCompany,
            scope: $scope
        });

        modalInstance.result.then ( function () {}, function () {
            $scope.editInfo = null;
        });
    }

    $scope.openEmission = function(code) {

        $scope.code = code;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockEmission.html',
            controller: StockEmission,
            scope: $scope
        });
    };
});

/**
 * Controller obsluhujici detail spolecnosti
 */
app.controller("StockItem", function($scope, $routeParams, $modal, $http, MsgService) {
    $scope.info = {};
    $scope.orderBook = {};

    var loadingData = false;

    function getDefaultHashItem () {

        return {
                buy: {
                    amount: 0,
                    sumAmount: 0,
                    orderAmount: 0,
                    ordersId: [],
                    orders: []
                },
                sell: {
                    amount: 0,
                    sumAmount: 0,
                    orderAmount: 0,
                    ordersId: [],
                    orders: []
                }
            }
    }
    
    function processOrderData ( d ) {


        var ordersLines = [];

        var indSell = 0;
        var indBuy = 0;
        var indHash = -1;
        var item, type;

        var sumBuy = 0;
        var sumSell = 0;

        orders= d;

        countAll = orders.buy.length + orders.sell.length;
        // projde vsechny prikazy ze seznamu buy i sell
        // a zpracuje je do pole prikazu
        for ( var i = 0; i < countAll; i++ ) {

            if ( ! ( indBuy in orders.buy ) || (( indSell in orders.sell ) && orders.buy[indBuy].price > orders.sell[indSell].price ) ) {

                item =  orders.sell[indSell];
                type = 0;
                indSell++;
            } else {
                
                item =  orders.buy[indBuy];
                type = 1;
                indBuy++;
            }

            // if ( item.amount > 30 )
            //     continue;

            if ( ! ordersLines.length || ordersLines[indHash].price != item.price ) {

                ordersLines.push ( getDefaultHashItem() );
                indHash++;
            }

            item.price = parseFloat( item.price ).toFixed(2);
            item.amount = parseInt( item.amount - item.finished_amount );
            
            ordersLines[indHash].price = item.price;
            
            if ( type ) {
                // pridavame do buy
                sumBuy += item.amount;
                
                ordersLines[indHash].buy.price = item.price;
                ordersLines[indHash].buy.amount += item.amount;
                // ordersLines[indHash].buy.sumAmount = sumBuy;
                ordersLines[indHash].buy.ordersId.push( item._id );
                ordersLines[indHash].buy.orders.push( item );
                ordersLines[indHash].buy.orderAmount++;
                
            } else {
                // pridavame do sell
                sumSell += item.amount;
                
                ordersLines[indHash].sell.price = item.price;
                ordersLines[indHash].sell.amount += item.amount;
                ordersLines[indHash].sell.sumAmount = sumSell;
                ordersLines[indHash].sell.orders.push( item );
                ordersLines[indHash].sell.ordersId.push( item._id );
                ordersLines[indHash].sell.orderAmount++;
            }
        }

        prevSell = 0;
        var end = ordersLines.length;
        for ( var i = 0; i < end ; i++ ) {
            
            ordersLines[i].buy.sumAmount = sumBuy;
            sumBuy -= ordersLines[i].buy.amount;

            if ( ! ordersLines[i].sell.sumAmount )
                ordersLines[i].sell.sumAmount = prevSell;

            prevSell = ordersLines[i].sell.sumAmount;
            // console.log ( ordersLines[i].sell.sumAmount );
        }

        $scope.orderBook = ordersLines;
        $scope.$apply();
    }

    $scope.openDetail = function ( price ) {

        $scope.lineDetail = $scope.orderBook[price];
        $scope.lineDetailPrice = price;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/orderBookLine.html',
            controller: OrderBookLine,
            scope: $scope
        });
    }

    function loadData () {
        if ( loadingData )
            return;

        loadingData = true;

        $.get("/rest/stock-detail/" + $routeParams.code, function ( res ) {

            $scope.info = res;
            $scope.$apply();
        });
        
        $.get("/rest/stock-orders/" + $routeParams.code, function ( res ) {

            processOrderData ( res );
            loadingData = false;
        });
    }

    loadData();
    var loadInt = setInterval( loadData, 3000 );

    $scope.$on("$destroy", function() {
        clearInterval(loadInt);
    });

});

/**
 * Controller obsluhujici seznam spolecnosti
 */
app.controller("Brokers", function($scope, $http, MsgService, $modal) {

    $scope.n = {};
    $scope.timeout = false;
    $scope.editInfo = false;

    $scope.loadData = loadData = function(cb) {

        $http.get("/rest/broker-list").then(function(res) {

            // $scope.onlineBrokers = [];
            $scope.onlineBrokers = res.data.online;
            $scope.data = res.data.list;
        });
    }

    $scope.interval = setInterval( loadData, 1000);
    loadData();

    $scope.$on("$destroy", function() {
        clearInterval($scope.interval);
    });


    $scope.showAddForm = function( code ) {

        $scope.editInfo = false;
        if ( typeof code != "undefined" ) 
            $scope.editInfo = $scope.data[code];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/addBroker.html',
            controller: AddBroker,
            scope: $scope
        });
    }
});

