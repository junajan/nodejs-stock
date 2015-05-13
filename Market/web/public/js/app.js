var REST_LOC = "/api/";

var app = angular.module("fancyApp", ['ngRoute', 'ui.bootstrap']).config( function ($routeProvider, $locationProvider){

  $routeProvider.when("/", {
   templateUrl: "partials/index.html",
   controller: "IndexController"
  });

  $routeProvider.when("/order-matching", {
   templateUrl: "partials/orderMatching.html",
   controller: "OrderMatching"
  });

  $routeProvider.when("/stocks", {
   templateUrl: "partials/stocks.html",
   controller: "Stocks"
  });

  $routeProvider.when("/stocks/:ticker", {
   templateUrl: "partials/stockItem.html",
   controller: "StockItem"
  });

  $routeProvider.when("/brokers", {
   templateUrl: "partials/brokers.html",
   controller: "Brokers"
  });

  $routeProvider.when("/history", {
   templateUrl: "partials/history.html",
   controller: "History"
  });

  $routeProvider.when("/statistics", {
   templateUrl: "partials/statistics.html",
   controller: "Statistics"
  });

  $routeProvider.when("/brokers/:id", {
   templateUrl: "partials/brokerDetail.html",
   controller: "BrokerDetail"
  });

  $routeProvider.when("/workers", {
   templateUrl: "partials/workers.html",
   controller: "Workers"
  });

  $routeProvider.otherwise ({
   templateUrl: "partials/error404.html",
   controller: "Error404Controller"
  });

  $locationProvider.html5Mode(true);
}).run(function($rootScope, $timeout) {
  $rootScope.inited = false;
  $timeout(function() {
    $rootScope.inited = true;
  }, 200);
});

