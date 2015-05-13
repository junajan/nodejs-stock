var loadInterval = 1000;
var app = angular.module("fancyApp", ['ngRoute'] ).config( function ($routeProvider, $locationProvider){
	$locationProvider.html5Mode(true);

	$routeProvider.when("/", {
			templateUrl: "partials/stockList.html",
			controller: "StockList"
		})
		.when("/stocks/:ticker", {
			templateUrl: "partials/stockDetail.html",
			controller: "StockDetail"
		})
		.otherwise ({
			templateUrl: "partials/error404.html",
			controller: function() {}
		});
});
