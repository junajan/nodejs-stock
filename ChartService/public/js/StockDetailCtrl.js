app.controller("StockDetail", function ( $interval, $timeout, $scope, $routeParams, $rootScope ) {

	$scope.type = 1;
	$scope.history = {};
	$scope.loaded = false;
	$scope.detailInterval = false;

	$scope.loadDetail = function() {
		$.get("/api/stock-detail/"+$routeParams.ticker, function(res) {
			$scope.info = res;
			$scope.loaded = true;
			$scope.successLoad = true;
			$scope.$apply();
			$scope.detailInterval = $timeout($scope.loadDetail, 1000);
		});
	};

	$scope.loadDetail();
	$scope.$on("$destroy", function() {
		$timeout.cancel( $scope.detailInterval);
	});
});