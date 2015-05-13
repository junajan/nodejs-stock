var LOAD_INTERVAL = 1000;

var CancelOrder = function ( $rootScope, info, restCall ) {

    if ( ! confirm ( "Opravdu chcete zrušit tento "+ $rootScope.orderTypes[info.type] +" příkaz?"))
     return false;

    restCall.post('order/cancel', { id: info._id }, function( res ) {
        
        if ( res.valid )
            alert ( "Zrušení příkazu bylo úspěšně zadáno." );
        else if ( res.error )
            alert ( res.error );

    });
};


function getStockByTicker(stocks, ticker) {

    if(jQuery.isArray(stocks))
        for(var i = 0; i < stocks.length; i++) {
            if(stocks[i].ticker == ticker)
                return stocks[i];
        }
    else
        for(var i in stocks) {
            if(stocks[i].ticker == ticker)
                return stocks[i];
        }
    
    return false;
}

app.controller ( "IndexController", function ($scope, $rootScope, $modal, restCall, $http, MsgService) {

	function loadData () {

		restCall.get('news', function( res ) {
			$scope.news = res;
		});

		restCall.get('my-orders', function( res ) {
			$scope.pendingOrders = res.data

		});

		restCall.get('my-stocks', function( res ) {

			var dataSum = {};
            var stockItem;
			for ( var i in res.data) {
				var item = res.data[i];
				if ( ! dataSum[item.ticker] ) {

					dataSum[item.ticker] = {
						ticker: item.ticker,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

				dataSum[item.ticker].amount += item.amount;
				dataSum[item.ticker].price += item.price * item.amount;
				dataSum[item.ticker].priceCount += item.amount;
                stockItem = getStockByTicker(res.stocks, item.ticker);
                if ( ! stockItem )
                    continue;

				dataSum[item.ticker].actualPrice = stockItem.price;
				dataSum[item.ticker].name = stockItem.name;
				dataSum[item.ticker].data.push ( item );
			}
            $scope.myStocks = dataSum;
			$scope.myStocksCount = Object.keys(dataSum).length;
		});

		restCall.get('stocks', function( res ) {
			$scope.stockList = res;
            $scope.stockListLen = Object.keys(res).length;
		});
	}

	$scope.loadInterval = setInterval ( loadData, LOAD_INTERVAL );

    $scope.$on("$destroy", function(){
         clearInterval( $scope.loadInterval );
    });

    $scope.buyStock = function(ticker) {

        $scope.buyInfo = $scope.stockList[ticker];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockBuy.html',
            controller: StockBuy,
            scope: $scope
        });
    };

    $scope.sellStock = function(ticker) {

        $scope.sellInfo = $scope.myStocks[ticker];
        $scope.sellInfo.id = ticker;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockSell.html',
            controller: StockSell,
            scope: $scope
        });
    };


    $scope.cancelOrder = function ( info ) {

        CancelOrder( $rootScope, info, restCall );
    }
});

app.controller ( "Error404Controller", function ($scope) {
});

app.controller ( "StockDetail", function ($scope, $rootScope, restCall, $routeParams) {

	if ( ! $routeParams.ticker )
		window.location = "/stockinfo";
	$scope.ticker = $routeParams.ticker;

	function loadData () {

		restCall.get('stocks/' + $scope.ticker, function( res ) {
			$scope.info = res.info;
		});
	}

	$scope.loadInterval = setInterval ( loadData, LOAD_INTERVAL );

    $scope.$on("$destroy", function(){
         clearInterval( $scope.loadInterval );
    });
	
	// alert ( $routeParams.toSource() );
});

app.controller ( "Account", function ($scope, restCall, $http, MsgService, restCall, FormErrors) {
	$scope.info = {};
	$scope.pass = {};

	restCall.get('account-info', function( res ) {

		$scope.info = res;
	});

	$scope.saveInfo = function () {
		$scope.error = null;
		$scope.success = null;

		if ( $scope.info.email == "" || $scope.info.name == "" ) 
			$scope.error = "Všechna pole jsou povinná!";
		else
			restCall.post('account-info', $scope.info, function ( res ) {

				if ( res.success ) {

					$(".name_val").html ( $scope.info.name );	
					$(".email_val").html ( $scope.info.email );	
					$scope.success = 1;
				}
				else if ( res.error )
					$scope.error = res.error;
				else
					$scope.error = "Neznámá chyba.";
			});
	}

	$scope.changePassword = function () {

		FormErrors.hideErrors( "#passForm" );
		$scope.error2 = null;
		$scope.success2 = null;

		restCall.post('account-info/password', $scope.pass, function ( res ) {

			if ( res.success ) {
				$scope.success2 = 1;
				$scope.pass = {};
			}
			else if ( res.error )
				FormErrors.showErrors ( "#passForm", res.error );
			else
				$scope.error2 = "Neznámá chyba.";
		});
	}
});

app.controller ( "History", function ($scope, restCall, $http, MsgService) {
    $scope.inited = false;

	$scope.history = [];

	dataTableCzech = {
		"sProcessing":   "Provádím...",
	    "sLengthMenu":   "Zobraz záznamů _MENU_",
	    "sZeroRecords":  "Žádné záznamy nebyly nalezeny",
	    "sInfo":         "Zobrazuji _START_ až _END_ z celkem _TOTAL_ záznamů",
	    "sInfoEmpty":    "Zobrazuji 0 až 0 z 0 záznamů",
	    "sInfoFiltered": "(filtrováno z celkem _MAX_ záznamů)",
	    "sInfoPostFix":  "",
	    "sSearch":       "Hledat:",
	    "sUrl":          "",
	    "oPaginate": {
	       "sFirst":    "První",
	       "sPrevious": "Předchozí",
	       "sNext":     "Další",
	       "sLast":     "Poslední"
	   }
	};

    function loadData () {

        restCall.get('history', function( res ) {

            // alert ( res.toSource() );
            $scope.history = res;

            if(!$scope.inited)
            setTimeout ( function () {
                $scope.inited = true;
                $('#history_table').dataTable({
                    "oLanguage": dataTableCzech,
                    "bPaginate": true,
                    "bLengthChange": false,
                    "bFilter": false,
                    "bSort": true,
                    "bInfo": true,
                    "bAutoWidth": false
                });

            }, 200);
        });
    }

    loadData();
    // setInterval( loadData, LOAD_INTERVAL );
});

var StockBuy = function($scope, $rootScope, $http, restCall, $modalInstance, MsgService) {

	$scope.balance = parseFloat($("#balance").attr("value"));
	$scope.buy = {
		ticker: $scope.buyInfo.ticker,
		amount: 1,
		price: $scope.buyInfo.price
	}

	$scope.buy.priceSum = $scope.buy.amount * $scope.buy.price;

    function formatCurrency ( c ) {
    	return c.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') + "$";
    }

    $scope.ok = function() {

    	if ( $scope.buy.priceSumValue > $scope.balance )
    		return alert ( "Celková cena převyšuje maximální cenu "+ formatCurrency ( $scope.balance )+"!" );

    	// var c = confirm ( "Opravdu chcete nakoupit "+ $scope.buy.amount +" akcií společnosti "+ $scope.buyInfo.name +"?" );
        // if ( ! c )
		//    return false;

        restCall.post("order/buy", $scope.buy, function( resOut ) {

            if ( resOut.error ) {
        	
        		alert ( resOut.error );
            } else if ( resOut.valid == 1 ) {

        		var val = parseFloat ( $("#balance").attr("value") );
        		val -= resOut.decrBalance;

        		$("#balance").attr("value", val );
        		$("#balance").html( formatCurrency ( val ));
                alert("Příkaz pro nákup akcií byl úspěšně zadán.");
                $modalInstance.close();

        	} else {

	            alert( "Při odesílání požadavku došlo k chybě." );
        	}
        });
    };

    $scope.recount = function () {

    	$scope.buy.priceSumValue = ($scope.buy.amount * $scope.buy.price);
    	$scope.buy.priceSum = formatCurrency ( $scope.buy.priceSumValue );
    }

    $scope.plus = function () {

    	$scope.buy.amount++;
    	$scope.recount();
    }

    $scope.minus = function () {

    	$scope.buy.amount--;
    	$scope.recount();
    }

    $scope.plusPrice = function () {

    	$scope.buy.price++;
    	$scope.recount();
    }

    $scope.minusPrice = function () {

    	$scope.buy.price--;
    	if ( $scope.buy.price <= 0 )
    		$scope.buy.price = 1;
    	$scope.recount();
    }

    $scope.max = function () {

    	$scope.buy.amount = parseInt( $rootScope.userInfo.accountBalance / $scope.buy.price );
    	$scope.recount();
    }

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };

	$scope.recount();
}

var StockSell = function($scope, $rootScope, $http, restCall, $modalInstance, MsgService) {

	$scope.result = false;

	$scope.sell = {
		ticker: $scope.sellInfo.ticker,
		amount: $scope.sellInfo.amount,
		price: $scope.sellInfo.actualPrice
	}
	$scope.sell.priceSum = $scope.sell.amount * $scope.sell.price;
	
    $scope.recount = function () {

    	$scope.sell.priceSumValue = ($scope.sell.amount * $scope.sell.price);
    	$scope.sell.priceSum = formatCurrency ( $scope.sell.priceSumValue );

    }

    $scope.plus = function () {

    	$scope.sell.amount++;
    	$scope.recount();
    }

    $scope.minus = function () {

    	$scope.sell.amount--;
    	$scope.recount();
    }

    $scope.plusPrice = function () {

    	$scope.sell.price++;
    	$scope.recount();
    }

    $scope.minusPrice = function () {

    	$scope.sell.price--;
    	if ( $scope.sell.price <= 0 )
    		$scope.sell.price = 1;
    	$scope.recount();
    }

    $scope.max = function () {

    	$scope.sell.amount = $scope.sellInfo.amount;
    	$scope.recount();
    }

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };

    function formatCurrency ( c ) {
    	return c.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') + "$";
    }

    $scope.ok = function() {

    	if ( $scope.sellInfo.amount < $scope.sell.amount )
    		return alert ( "Zadané množství převyšuje Váš počet jednotek!" );
    	if ( 0 >= $scope.sell.amount )
    		return alert ( "Počet jednotek musí být větší jak 0!" );
    	if ( 0 >= $scope.sell.price )
    		return alert ( "Cena musí být větší jak 0!" );

   //  	var c = confirm ( "Opravdu chcete prodat "+ $scope.sell.amount +" akcií společnosti "+ $scope.sellInfo.name +"?" );
   //  	if ( ! c )
			// return false;

        restCall.post("order/sell", $scope.sell, function(res) {
            
            if (res.error)
                alert(res.error);
            
            else if ( res.valid == 1 ) {

            		$scope.result = true;
	                alert("Příkaz pro prodej akcií byl úspěšně zadán.");
	                
	                $modalInstance.close();

        	} else 
            		alert ("Při provádění příkazu došlo k chybě.");
            
        });
    };

	$scope.recount();
}

app.controller ( "StockInfo", function ($scope, restCall, $http, MsgService, $modal) {

	var readInterval;

	function readInfo () {

		restCall.get('stocks', function( res ) {

			$scope.items = res;
        });
       readInterval = setTimeout( readInfo, LOAD_INTERVAL );
    }

    readInfo();


    $scope.$on("$destroy", function(){
         clearTimeout( readInterval );
    });


    $scope.buyStock = function(ind) {

        $scope.buyInfo = $scope.items[ind];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockBuy.html',
            controller: StockBuy,
            scope: $scope,
            resolve: {
                items: function() {
                    return $scope.items;
                }
            }
        });
    };
});

var StockListDetail = function($scope, $http, restCall, $modalInstance, MsgService) {

	$scope.close = function() {
        $modalInstance.dismiss('cancel');
    };
}

app.controller ( "BaseController", function ($scope, $rootScope) {


});

app.controller ( "MyStocks", function ($scope, $rootScope, restCall, $http, MsgService, TableService, $modal) {

	$scope.myStocks = [];
	$scope.myOrders = [];
	var loadingOrders = false;
	var loadingStocks = false;
	var loadingStocksCounter = 0;
	var timeoutRead = 0;

    $scope.cancelOrder = function ( info ) {

        CancelOrder( $rootScope, info, restCall );
    }

    $scope.showListDetail = function(id) {

        $scope.info = $scope.myStocks[id];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockListDetail.html',
            controller: StockListDetail,
            scope: $scope,
            resolve: {
                result: function() {
                    return $scope.result;
                }
            }
        });
    };

	function readStocks () {
        $scope.result = false;

        if ( loadingStocks )
            return false;

        loadingStocks = true;
        restCall.get('my-stocks', function( res ) {
            if ( ! res.data )
                return false;

            var stockItem;
			var dataSum = {};
			for ( i in res.data) {
				item = res.data[i];


				if ( ! dataSum[item.ticker] ) {

					dataSum[item.ticker] = {
						name: item.name,
						ticker: item.ticker,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

                stockItem = getStockByTicker(res.stocks, item.ticker);
                
				dataSum[item.ticker].amount += item.amount;
				dataSum[item.ticker].price += item.price * item.amount;
				dataSum[item.ticker].priceCount += item.amount;
				dataSum[item.ticker].actualPrice = stockItem.price;
				dataSum[item.ticker].name = stockItem.name;
				dataSum[item.ticker].data.push ( item );
			}

			$scope.myStocks = dataSum;
			loadingStocks = false;
			// TableService.show( "myStocks_table" );
		});
	}

	function readOrders () {

		if ( loadingOrders )
			return false;

		loadingOrders = true;
		restCall.get('my-orders', function( res ) {
			if ( ! res.data )
				return alert ( res.toString() );

			$scope.myOrders = res.data;
			loadingOrders = false;
				
			// if ( ! loadingStocksCounter++ )
			// 	TableService.show( "myOrders_table" );
		});
	}

	$rootScope.readData = function readData () {

		readStocks();
		readOrders();
        clearTimeout(timeoutRead);
		timeoutRead = setTimeout ( readData, LOAD_INTERVAL );
	};

	$scope.readData();


    $scope.$on("$destroy", function(){
         clearTimeout( timeoutRead );
    });


    $scope.sellStock = function(id) {

        $scope.sellInfo = $scope.myStocks[id];
        $scope.sellInfo.id = id;
        
        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockSell.html',
            controller: StockSell,
            scope: $scope
        });
    };
});

app.controller ( "ServerInfo", function ($scope, restCall, $http, MsgService) {

	restCall.get('server-info', function( res ) {

		$scope.serverInfo = res;
	});
});
