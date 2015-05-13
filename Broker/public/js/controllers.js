
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

var ChartController = function($scope, $rootScope, code) {

	$scope.type = 1;
	$scope.info = {};
	$scope.stopStart = false;

	var lastTime = 0;
	var maxChartLen = 60;
	var data = {
		price: [],
		amount: []
	}


	function renderChart() {

		var options1 = {
			xaxis: {
				mode: "time",
				timeformat: "%H:%M.%S",
				minTickSize: [$scope.type * 4, "second"],
				axisLabel: 'čas',
				axisLabelUseCanvas: false
			},
			yaxis: {
				tickFormatter: function(val, axis) {
					return "$" + parseFloat(val).toFixed(2);
				},
				axisLabel: 'cena',
				axisLabelUseCanvas: false,
				min: 0
			},
			grid: {
				hoverable: true,
			},
			tooltipOpts: {
				content: "Čas: %x | Cena: %y",
			},
			tooltip: true
			// grid: { hoverable: true, clickable: true},
		}
		var options2 = {
			xaxis: {
				mode: "time",
				timeformat: "%H:%M.%S",
				minTickSize: [$scope.type * 4, "second"],
				axisLabel: 'čas',
				axisLabelUseCanvas: false
			},
			bars: {
				show: true,
				barWidth: $scope.type * 1000
			},
			yaxis: {
				tickFormatter: function(val, axis) {
					return parseFloat(val).toFixed(2);
				},
				minTickSize: 1,
				axisLabel: 'množství',
				axisLabelUseCanvas: false,
				min: 0
			},
			grid: {
				hoverable: true,
				clickable: true,
				autoHighlight: true
			},
			tooltipOpts: {
				content: "Čas: %x | Množství: %y",
			},
			tooltip: true
			// grid: { hoverable: true, clickable: true},
		}

		$.plot("#chart_price2", [data.price], options1);
		$.plot("#chart_amount2", [data.amount], options2);
	}

	function addEntry(e) {

		var price = parseFloat(e.price / e.count).toFixed(2);

		if (data.price.length) {
			var last = data.price[data.price.length - 1];

			if (parseInt(last[0]) + 100 >= parseInt(e.time))
				return;
		}

		data.price.push([e.time, price]);
		data.amount.push([e.time, e.amount]);
	}

	function removeOldEntries() {

		if (data.price.length > maxChartLen) {

			data.price.splice(0, data.price.length - maxChartLen);
			data.amount.splice(0, data.amount.length - maxChartLen);
		}

		console.log(data.price.length);
	}

	function processResult(res) {
		var e = {};

		$scope.info = res.info;
		$scope.$apply();

		var cData = res.chart.data;

		if (cData.length) {

			for (var i in cData)
				addEntry(cData[i]);

			lastTime = res.chart.lastTime;

			removeOldEntries();
			renderChart();
		}

		$("#loading-msg").fadeOut();
		$(".charts .invis").delay(500).fadeIn(500);

		$rootScope.timeout = setTimeout($scope.loadGraph, $scope.type * 1000);
	}

	$scope.stopStart = function() {

		$scope.stopStartVal = !$scope.stopStartVal;
		$scope.loadGraph();
	}

	$scope.loadGraph = function(type) {

		clearTimeout($rootScope.timeout);

		if ($scope.stopStartVal)
			return false;

		if (type && type != $scope.type) {

			$scope.type = type;
			data = {
				price: [],
				amount: []
			}
			lastTime = 0;
		}

		$(".range a").css("font-weight", "normal");
		$("#type_" + $scope.type).css("font-weight", "bold");

		$.get("//" + CONF_CHART.addr + ":" + CONF_CHART.port + "/stock-history/" + code + "/" + $scope.type + "?last=" + lastTime, processResult);
	}

	$scope.loadGraph();

	$scope.$on("$destroy", function() {
		clearTimeout($rootScope.timeout);
	});

	$(window).resize(function() {
		renderChart()
	});
}


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
app.controller("IndexController", function($scope, $interval, $http, MsgService) {

	function readData() {

		$http.get("/broker-rest/broker-info").then(function(res) {

			$scope.data = res.data;
		});
	}

	$scope.showSecretKey = function() {

		alert($scope.data.config.market_credentials.secret);
	}

	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("Error404Controller", function($scope, $http, $timeout, $interval) {});

app.controller("History", function($scope, $http, $timeout, $interval) {


	function readData() {

		$http.get("/broker-rest/history").then(function(res) {

			$scope.history = res.data.history;

			$scope.clients = {};
			for (i in res.data.clients)
				$scope.clients[res.data.clients[i]._id] = res.data.clients[i].name;

		});
	}
	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("PendingOrders", function($scope, $http, $timeout, $interval) {

	function readData() {

		$http.get("/broker-rest/pending-orders").then(function(res) {

			$scope.orders = res.data.orders;

			$scope.clients = {};
			for (i in res.data.clients)
				$scope.clients[res.data.clients[i]._id] = res.data.clients[i].name;

		});
	}
	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("ServerStatus", function($scope, $http, $timeout, $interval) {

	$http.get("/broker-rest/server-status").then(function(res) {

		$scope.data = res.data;
	});
});

app.controller("Clients", function($interval, $scope, $http) {

	function readClients() {

		$http.get("/broker-rest/clients").then(function(res) {

			$scope.clients = res.data.clients;
			$scope.onlineClients = res.data.online;
		});
	}

	var promise = $interval(readClients, 1000);
	readClients();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("ClientDetail", function($modal, $routeParams, $scope, $http, $timeout, $interval) {

	$scope.showListDetail = function(id) {

		$scope.detailInfo = $scope.owned[id];

		var modalInstance = $modal.open({
			templateUrl: '/partials/dialogs/stockListDetailInfo.html',
			controller: StockListDetail,
			scope: $scope
		});
	};


	function readData() {

		$http.get("/broker-rest/clients/" + $routeParams.id).then(function(res) {

			for (var i in res.data)
				$scope[i] = res.data[i];

			var dataSum = {};
			for (var i in res.data.owned) {
				var item = res.data.owned[i];

				if (!dataSum[item.ticker]) {

					dataSum[item.ticker] = {
						name: item.name,
						code: item.ticker,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					};
				}

				var stockItem = getStockByTicker(res.data.stocks, item.ticker);
				dataSum[item.ticker].amount += item.amount;
				dataSum[item.ticker].price += item.price * item.amount;
				dataSum[item.ticker].priceCount += item.amount;
				dataSum[item.ticker].actualPrice = stockItem.price;
				dataSum[item.ticker].name = stockItem.name;
				dataSum[item.ticker].data.push(item);

				if (!$scope.info.ownedAmount)
					$scope.info.ownedAmount = 0;
				$scope.info.ownedAmount += item.amount;
			}

			$scope.owned = dataSum;

		});
	}

	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("Stocks", function($scope, $http, $timeout, $interval) {

	function readData() {

		$http.get("/broker-rest/stocks").then(function(res) {
			$scope.stockItems = res.data;
		});
	}

	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("StockDetail", function($routeParams, $scope, $rootScope, $http, $timeout, $interval) {

	$scope.info = {};

	function readData() {

		$http.get("/broker-rest/stock-info/" + $routeParams.ticker).then(function(res) {

			$scope.info = res.data;
		});

		$http.get("/broker-rest/owned-stocks/" + $routeParams.ticker).then(function(res) {

			// zpracuj uzivatele
			$scope.clients = {};
			for (i in res.data.clients)
				$scope.clients[res.data.clients[i]._id] = res.data.clients[i].name;

			// zpracuj zgrupovani nactenych akcii
			var dataSum = {};
			var dataClients = {};
			for (i in res.data.ownedStocks) {
				item = res.data.ownedStocks[i];

				if (!dataSum[item.ticker]) {

					dataSum[item.ticker] = {
						name: item.name,
						code: item.ticker,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

				dataSum[item.ticker].amount += item.amount;
				dataSum[item.ticker].price += item.price * item.amount;
				dataSum[item.ticker].priceCount += item.amount;
				dataSum[item.ticker].actualPrice = $scope.info.price;

				if (!(item.client in dataClients))
					dataClients[item.client] = {
						amount: 0,
						priceCount: 0
					}

				dataClients[item.client].amount += item.amount;
				dataClients[item.client].priceCount += item.price * item.amount;
				dataClients[item.client].actualPrice = $scope.info.price;

			}

			$scope.ownedSum = dataSum;
			$scope.ownedSumCount = Object.keys(dataSum).length;

			$scope.ownedClients = dataClients;

		});
	}


	ChartController($scope, $rootScope, $routeParams.ticker);


	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});

});

app.controller("MyStocks", function($scope, $modal, $http, $timeout, $interval) {

	$scope.clients = {};
	$scope.stocks = {};
	$scope.ownedStocks = {};

	$scope.showListDetail = function(id) {

		$scope.info = $scope.ownedStocks[id];

		var modalInstance = $modal.open({
			templateUrl: '/partials/dialogs/stockListDetail.html',
			controller: StockListDetail,
			scope: $scope
		});
	};

	function readData() {

		$http.get("/broker-rest/owned-stocks").then(function(res) {

			// zpracuj uzivatele
			$scope.clients = {};
			for (i in res.data.clients)
				$scope.clients[res.data.clients[i]._id] = res.data.clients[i].name;

			// zpracuj zgrupovani nactenych akcii
			var dataSum = {};
			for (i in res.data.ownedStocks) {
				item = res.data.ownedStocks[i];

				if (!dataSum[item.ticker]) {

					dataSum[item.ticker] = {
						name: item.name,
						code: item.ticker,
						amount: 0,
						price: 0,
						priceCount: 0,
						data: []
					}
				}

				var stockItem = getStockByTicker(res.data.stocks, item.ticker);
				dataSum[item.ticker].amount += item.amount;
				dataSum[item.ticker].price += item.price * item.amount;
				dataSum[item.ticker].priceCount += item.amount;
				dataSum[item.ticker].actualPrice = stockItem.price;
				dataSum[item.ticker].name = stockItem.name;
				dataSum[item.ticker].data.push(item);
			}

			$scope.ownedStocks = dataSum;
		});
	}

	var promise = $interval(readData, 1000);
	readData();

	$scope.$on("$destroy", function() {
		$interval.cancel(promise);
	});
});

app.controller("StockInfo", function($scope, $http, $timeout, $interval) {

	$http.get("/broker-rest/stock-info").then(function(res) {

		$scope.data = res.data;
	});
});