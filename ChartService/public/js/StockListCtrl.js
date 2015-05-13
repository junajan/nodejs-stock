app.controller("StockList", function ($interval, $scope, $rootScope) {
	$scope.loadInt = null;
	$scope.loaded = false;
	$scope.data = [];

	$scope.processResult = function(res) {
		$scope.loaded = true;
		$scope.count = Object.keys(res).length;

		if($scope.count)
			$scope.data = res;

		$scope.$apply();
	};

	$scope.load = function() {
		$.get("/api/stock-list/").then($scope.processResult);
	};

	$scope.loadInt = $interval($scope.load, loadInterval);
	$scope.$on("$destroy", function() {
		$interval.cancel($scope.loadInt);
	});
});
