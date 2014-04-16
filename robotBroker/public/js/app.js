var app = angular.module("fancyApp", ['ngRoute', 'ui.bootstrap']).config( function ($routeProvider, $locationProvider){

  $routeProvider.when("/", {
   templateUrl: "/partials/index.html",
   controller: "IndexController"
  });

  $routeProvider.when("/server-status", {
   templateUrl: "/partials/serverStatus.html",
   controller: "ServerStatus"
  });

  $routeProvider.when("/history", {
   templateUrl: "/partials/history.html",
   controller: "History"
  });

  $routeProvider.when("/stocks", {
   templateUrl: "/partials/stocks.html",
   controller: "Stocks"
  });

  $routeProvider.when("/owned-stocks", {
   templateUrl: "/partials/myStocks.html",
   controller: "MyStocks"
  });

  $routeProvider.when("/pending", {
   templateUrl: "/partials/pendingOrders.html",
   controller: "PendingOrders"
  });

  $routeProvider.otherwise ({
   templateUrl: "partials/error404.html",
   controller: "Error404Controller"
  });

  $locationProvider.html5Mode(true);
});


app.run( function ( $rootScope) {

  $rootScope.orderTypes = { 1: "buy", 0: "sell", 2: "abcdhewkdj", 3:" cancel buy" };
});