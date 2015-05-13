var app = angular.module("fancyApp", ['ngRoute', 'ui.bootstrap']).config(function($routeProvider, $locationProvider) {

  $routeProvider.when("/", {
    templateUrl: "/partials/index.html",
    controller: "IndexController"
  });

  $routeProvider.when("/clients", {
    templateUrl: "/partials/clients.html",
    controller: "Clients"
  });

  $routeProvider.when("/clients/:id", {
    templateUrl: "/partials/clientDetail.html",
    controller: "ClientDetail"
  });

  $routeProvider.when("/history", {
    templateUrl: "/partials/history.html",
    controller: "History"
  });

  $routeProvider.when("/stocks", {
    templateUrl: "/partials/stocks.html",
    controller: "Stocks"
  });
  $routeProvider.when("/stocks/:code", {
    templateUrl: "/partials/stockDetail.html",
    controller: "StockDetail"
  });

  $routeProvider.when("/owned-stocks", {
    templateUrl: "/partials/myStocks.html",
    controller: "MyStocks"
  });

  $routeProvider.when("/pending", {
    templateUrl: "/partials/pendingOrders.html",
    controller: "PendingOrders"
  });

  $routeProvider.otherwise({
    templateUrl: "partials/error404.html",
    controller: "Error404Controller"
  });

  $locationProvider.html5Mode(true);
});


app.run(function($rootScope) {

  $rootScope.orderTypes = {
    1: "BUY",
    0: "SELL"
  };

  $rootScope.orderTypesBig = {
    0: "SELL ORDER",
    1: "BUY ORDER",
    100: "SELL EXECUTED",
    101: "BUY EXECUTED",
    200: "SELL CANCEL",
    201: "BUY CANCEL",
    300: "SELL CANCELLED",
    301: "BUY CANCELLED",
    400: "SELL EXPIRED",
    401: "BUY EXPIRED",
  };

});