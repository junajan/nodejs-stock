
var app = angular.module("fancyApp", ['ngRoute', 'ui.bootstrap']).config( function ( $httpProvider, $routeProvider, $locationProvider ){

  // $httpProvider.defaults.useXDomain = true;
  // delete $httpProvider.defaults.headers.common['X-Requested-With'];
  $httpProvider.defaults.headers.common["Authorization"] = CONF.key;
  $httpProvider.defaults.headers.common["Content-type"] = "application/json";
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];

  $routeProvider.when("/", {
   templateUrl: "/partials/index.html",
   controller: "IndexController"
  });

  $routeProvider.when("/mystocks", {
   templateUrl: "/partials/mystocks.html",
   controller: "MyStocks"
  });

  $routeProvider.when("/account", {
   templateUrl: "/partials/account.html",
   controller: "Account"
  });

  $routeProvider.when("/stockinfo", {
   templateUrl: "/partials/stockinfo.html",
   controller: "StockInfo"
  });

  $routeProvider.when("/history", {
   templateUrl: "/partials/history.html",
   controller: "History"
  });

  $routeProvider.when("/detail/:code/", {
   templateUrl: "/partials/stockdetail.html",
   controller: "StockDetail"
  });

  $routeProvider.when("/server-status", {
   templateUrl: "/partials/serverinfo.html",
   controller: "ServerInfo"
  });

  $routeProvider.otherwise ({
   templateUrl: "partials/error404.html",
   controller: "Error404Controller"
  });

  $locationProvider.html5Mode(true);
});
