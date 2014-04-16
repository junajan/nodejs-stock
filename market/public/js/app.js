
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

  $routeProvider.when("/stocks/:code", {
   templateUrl: "partials/stockItem.html",
   controller: "StockItem"
  });

  $routeProvider.when("/brokers", {
   templateUrl: "partials/brokers.html",
   controller: "Brokers"
  });

  $routeProvider.otherwise ({
   templateUrl: "partials/error404.html",
   controller: "Error404Controller"
  });

  $locationProvider.html5Mode(true);
});

