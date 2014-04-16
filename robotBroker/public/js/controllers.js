
// ============================================
// ================ Modalni okna ==============
// ============================================
var StockListDetail = function($scope, $modalInstance) {

	$scope.close = function() {
        $modalInstance.dismiss('cancel');
    };
}

// ============================================
// ================ Controllery ===============
// ============================================
app.controller ( "IndexController", function ($scope, $http, MsgService) {

	$http.get("/broker-rest/broker-info").then(function(res) {

	    $scope.data = res.data;
	});
});

app.controller ( "Error404Controller", function ($scope, $http, $timeout, $interval ) {
});

app.controller ( "History", function ($scope, $http, $timeout, $interval ) {
	$scope.types = { 1:"BUY ORDER", 0:"SELL ORDER", 101: "BUY EXECUTED", 100: "SELL EXECUTED" };

	function readData () {

		$http.get("/broker-rest/history").then(function(res) {

		    $scope.history = res.data.history;
	    
		    $scope.clients = {};
		    for ( i in res.data.clients )
		    	$scope.clients[ res.data.clients[i]._id] = res.data.clients[i].name;

		});
	}
	var promise = $interval(readData, 1000);
	readData();

    $scope.$on("$destroy", function(){
         $interval.cancel( promise );
    });
});

app.controller ( "PendingOrders", function ($scope, $http, $timeout, $interval ) {


	function readData () {

		$http.get("/broker-rest/pending-orders").then(function(res) {

		    $scope.orders = res.data.orders;
	    
		    $scope.clients = {};
		    for ( i in res.data.clients )
		    	$scope.clients[ res.data.clients[i]._id] = res.data.clients[i].name;

		});
	}
	var promise = $interval(readData, 1000);
	readData();

    $scope.$on("$destroy", function(){
         $interval.cancel( promise );
    });
});

app.controller ( "ServerStatus", function ($scope, $http, $timeout, $interval ) {

	$http.get("/broker-rest/server-status").then(function(res) {

	    $scope.data = res.data;
	});
});

app.controller ( "Stocks", function ($scope, $http, $timeout, $interval ) {
});

app.controller ( "MyStocks", function ($scope, $modal, $http, $timeout, $interval ) {

	$scope.clients =  {};
	$scope.stocks =  {};
	$scope.ownedStocks =  {};

    $scope.showListDetail = function(id) {

        $scope.info = $scope.ownedStocks[id];

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockListDetail.html',
            controller: StockListDetail,
            scope: $scope
        });
    };

	function readData () {

		$http.get("/broker-rest/owned-stocks").then(function(res) {

			// zpracuj uzivatele

		    // zpracuj zgrupovani nactenych akcii
			var dataSum = {};
			for ( i in res.data.ownedStocks) {
				item = res.data.ownedStocks[i];

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
				dataSum[item.code].actualPrice = res.data.stocks[ item.code ].price;
				dataSum[item.code].name = res.data.stocks[ item.code ].name;
				dataSum[item.code].data.push ( item );
			}

			$scope.ownedStocks = dataSum;
		});
	}

	var promise = $interval(readData, 1000);
	readData();

    $scope.$on("$destroy", function(){
         $interval.cancel( promise );
    });
});

app.controller ( "StockInfo", function ($scope, $http, $timeout, $interval ) {

	$http.get("/broker-rest/stock-info").then(function(res) {

	    $scope.data = res.data;
	});
});
