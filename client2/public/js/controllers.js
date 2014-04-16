
app.controller ( "IndexController", function ($scope, $modal, restCall, $http, MsgService) {

	function loadData () {

		restCall.get('news', function( res ) {
			$scope.news = res;
		});

		restCall.get('my-pending-orders', function( res ) {
			$scope.pendingOrders = res.data

		});

		restCall.get('my-stocks', function( res ) {
			// $scope.myStocks = res.data

			var dataSum = {};
			for ( i in res.data) {
				item = res.data[i];

				if ( ! dataSum[item.code] ) {

					dataSum[item.code] = {
						name: item.name,
						code: item.code,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

				dataSum[item.code].amount += item.amount;
				dataSum[item.code].price += item.price * item.amount;
				dataSum[item.code].priceCount += item.amount;

				if ( ! ( item.code in res.stocks) )
					continue;

				dataSum[item.code].actualPrice = res.stocks[ item.code ].price;
				dataSum[item.code].name = res.stocks[ item.code ].name;
				dataSum[item.code].data.push ( item );
			}

			$scope.myStocks = dataSum;
		});

		restCall.get('stock-list', function( res ) {

			$scope.stockList = res;
		});
	}

	$scope.loadInterval = setInterval ( loadData, 1000 );

    $scope.$on("$destroy", function(){
         clearInterval( $scope.loadInterval );
    });

    $scope.buyStock = function(code) {

        $scope.buyInfo = $scope.stockList[code];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockBuy.html',
            controller: StockBuy,
            scope: $scope
        });
    };
});

app.controller ( "Error404Controller", function ($scope) {


});

app.controller ( "StockDetail", function ($scope, restCall, $routeParams) {

	if ( ! $routeParams.code )
		window.location = "/stockinfo";

	$scope.code = $routeParams.code;
	
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
			restCall.post('save-account-info', $scope.info, function ( res ) {

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

		restCall.post('save-password', $scope.pass, function ( res ) {

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

	$scope.types = { 1:"BUY ORDER", 0:"SELL ORDER", 101: "BUY EXECUTED", 100: "SELL EXECUTED" };
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

	restCall.get('history', function( res ) {

		// alert ( res.toSource() );
		$scope.history = res;

		setTimeout ( function () {
			
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

});

var StockBuy = function($scope, $http, restCall, $modalInstance, MsgService) {

	$scope.balance = parseFloat($("#balance").attr("value"));
	$scope.buy = {
		code: $scope.buyInfo.code,
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
   //  	if ( ! c )
			// return false;

        restCall.post("stock-buy", $scope.buy, function( resOut ) {

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

    	var balance = parseFloat($("#balance").attr("value"));
    	$scope.buy.amount = parseInt( balance / $scope.buy.price );
    	$scope.recount();
    }

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };

	$scope.recount();
}


var StockSell = function($scope, $http, restCall, $modalInstance, MsgService) {

	$scope.result = false;
	$scope.balance = parseFloat($("#balance").attr("value"));

	$scope.sell = {
		code: $scope.sellInfo.code,
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

        restCall.post("stock-sell", $scope.sell, function(res) {

            if (res.error)
                alert(res.error);
            
            else if ( res.valid == 1 ) {

            		$scope.result = true;
	                $scope.readData();
	                alert("Příkaz pro prodej akcií byl úspěšně zadán.");
	                
	                $modalInstance.close();

        	} else 
            		alert ("Při provádění příkazu došlo k chybě.");
            
        });
    };

	$scope.recount();
}

app.controller ( "StockInfo", function ($scope, restCall, $http, MsgService, $modal) {

	function readInfo () {

		restCall.get('stock-list', function( res ) {

			$scope.items = res;
		});
	}

	readInfo();
	setInterval( readInfo, 1000 );

    $scope.buyStock = function(code) {

        $scope.buyInfo = $scope.items[code];

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

app.controller ( "MyStocks", function ($scope, restCall, $http, MsgService, TableService, $modal) {

	$scope.myStocks = [];
	$scope.myOrders = [];
	var loadingOrders = false;
	var loadingStocks = false;
	var loadingStocksCounter = 0;


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
				// return alert ( res );

			var dataSum = {};
			for ( i in res.data) {
				item = res.data[i];


				if ( ! dataSum[item.code] ) {

					dataSum[item.code] = {
						name: item.name,
						code: item.code,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

				dataSum[item.code].amount += item.amount;
				dataSum[item.code].price += item.price * item.amount;
				dataSum[item.code].priceCount += item.amount;
				dataSum[item.code].actualPrice = res.stocks[ item.code ].price;
				dataSum[item.code].name = res.stocks[ item.code ].name;
				dataSum[item.code].data.push ( item );
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
		restCall.get('my-pending-orders', function( res ) {
			if ( ! res.data )
				return alert ( res.toString() );

			$scope.myOrders = res.data;
			loadingOrders = false;
				
			// if ( ! loadingStocksCounter++ )
			// 	TableService.show( "myOrders_table" );
		});
	}

	$scope.readData = function readData () {

		readStocks();
		readOrders();

		setTimeout ( readData, 5000 );
	};

	$scope.readData();

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
