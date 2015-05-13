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

  $routeProvider.when("/traded-stocks", {
   templateUrl: "/partials/tradedStocks.html",
   controller: "TradedStocks"
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


app.run( function ( $rootScope, $http) {

  $rootScope.orderTypes = { 1: "buy", 0: "sell", 2: "abcdhewkdj", 3:" cancel buy" };
  $rootScope.types = { 1:"BUY ORDER", 0:"SELL ORDER", 101: "BUY EXECUTED", 100: "SELL EXECUTED", 400: "SELL EXPIRED", 401: "BUY EXPIRED" };

  $rootScope.turnRobotState = function () {


    $http.get("/broker-rest/robot-state-switch").then(function(res) {

      $rootScope.robotState = res.data.state;
    });
  }

  $rootScope.getRobotState = function () {

    $http.get("/broker-rest/robot-state").then(function(res) {

        $rootScope.robotState = res.data.state;

    });
  }

  $rootScope.getRobotState();
});