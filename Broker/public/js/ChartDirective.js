app.directive('chart', function($timeout) {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			ticker: "=",
			height: "@"
		},
		template: '<div><a style="cursor: pointer;" ng-if="chart" ng-click="toggleChart()"><span ng-if="ohlcChart">Zobrazit data do jednoduchého grafu.</span><span ng-if="!ohlcChart">Zobrazit data do svícového grafu.</span></a><div class="chartContainer"></div><div id="loading-msg">Loading chart data...</div><div ng-if="isError" class="chartError">Data se nepodařilo načíst. Je zapnuta služba pro historická data?</div></div></div>',
		link: function($scope, element) {
			var I_VOLUME = 0;
			var I_OPEN = 1;
			var I_HIGH = 2;
			var I_LOW = 3;
			var I_CLOSE = 4;
			var I_TIME = 5;

			$scope.historyService = "";
			if (typeof CONF_CHART != 'undefined')
				$scope.historyService = "//" + CONF_CHART.addr + ":" + CONF_CHART.port;

			$scope.apiResource = $scope.historyService + "/api/stock-history/" + $scope.ticker + "/?last=";
			$scope.chart = null;
			$scope.endTime = 0;
			$scope.promise = false;
			$scope.ohlcChart = 0; // line chart
			$scope.isError = false;
			$scope.close = false;
			if (!$scope.height)
				$scope.height = 450;
			var data = [];

			function handleError() {
				$scope.isError = true;
				$("#loading-msg").slideUp();
				$("#chartdiv").css("height", "unset");
			}

			function roundPrice(p) {
				return parseFloat(p.toFixed(2));
			}

			function getChartPriceArray(item) {
				// for simple or candlestick chart (one line with closing price)
				if ($scope.ohlcChart)
					return [item[I_TIME], item[I_OPEN], item[I_HIGH], item[I_LOW], item[I_CLOSE]];
				else
					return [item[I_TIME], item[I_CLOSE]];
			}

			function processResult(res) {
				if($scope.close) return false;

				$scope.info = res.info;
				$scope.endTime = res.endTime;
				data = res.data;
				console.log("Loaded " + res.data.length + " items to chart");

				$("#loading-msg").slideUp(renderChart);
			}

			function renderChart() {

				var ohlc = [],
					volume = [],
					dataLength = data.length,
					tooltipConfig = {
						pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y}</b><br />',
						valueDecimals: 2
					},
					groupingUnits = [
						['second', [1, 5, 10, 15, 30]],
						['minute', [1, 15, 30]],
						['hour', [1, 12]],
						['day', [1, 7]],
						['month', [1]]
					];

				if ($scope.ohlcChart)
					delete tooltipConfig.pointFormat;

				data.forEach(function(e) {

					ohlc.push(getChartPriceArray(e));
					volume.push([e[I_TIME], e[I_VOLUME]]);
				});

				Highcharts.setOptions({
					global: {
						useUTC: false
					}
				});

				// create the chart
				$scope.chart = $("#chartdiv", element).highcharts('StockChart', {
					chart: {
						events: {
							load: function() {
								var series = this.series;

								function processResult(res) {
									if($scope.close) return false;
									$scope.promise = $timeout(loadData, 1000);

									if (!res.data.length) return;
									console.log("Loaded " + res.data.length + " items to chart");

									$scope.endTime = res.endTime;
									res.data.forEach(function(item) {
										series[0].addPoint(getChartPriceArray(item), false, false);
										series[1].addPoint([item[I_TIME], item[I_VOLUME]], false, false);
									});
									$('#chartdiv').highcharts().redraw();
								}

								function loadData() {
									$.get($scope.apiResource + $scope.endTime, processResult).fail(handleError);
								}

								loadData();
							}
						}
					},
					rangeSelector: {
						selected: 1
					},
					rangeSelector: {
						buttons: [{
							type: 'minute',
							count: 1,
							text: '1m'
						}, {
							type: 'hour',
							count: 1,
							text: '1h'
						}, {
							type: 'day',
							count: 1,
							text: '1D'
						}, {
							type: 'all',
							count: 1,
							text: 'All'
						}],
						selected: 1,
						inputEnabled: false
					},
					title: {
						text: $scope.ticker + ' Historical'
					},
					subtitle: {
						text: $scope.info.name + ''
					},
					yAxis: [{
						labels: {
							align: 'right',
							x: -3,
							formatter: function() {
								return '$' + Highcharts.numberFormat(this.value, 2);
							}
						},
						title: {
							text: 'Price'
						},
						height: '60%',
						lineWidth: 2
					}, {
						labels: {
							align: 'right',
							x: -3
						},
						title: {
							text: 'Volume'
						},
						top: '65%',
						height: '35%',
						offset: 0,
						lineWidth: 2
					}],
					series: [{
						type: ($scope.ohlcChart) ? 'candlestick' : 'line',
						tooltip: tooltipConfig,
						name: $scope.ticker,
						data: ohlc,
						dataGrouping: {
							units: groupingUnits
						}
					}, {
						type: 'column',
						name: 'Volume',
						tooltip: {
							valueDecimals: 0
						},
						data: volume,
						yAxis: 1,
						dataGrouping: {
							units: groupingUnits
						}
					}]
				});
			}

			$scope.loadGraph = function() {
				$(".chartContainer").html('<div id="chartdiv" style="height: ' + $scope.height + 'px; width: 100%;">');
				$.get($scope.apiResource + $scope.endTime, processResult).fail(handleError);
			};

			$scope.toggleChart = function() {
				$scope.ohlcChart = !$scope.ohlcChart;

				$timeout(function() {
					$('#chartdiv').highcharts().destroy();

					$timeout.cancel($scope.promise);
					$scope.endTime = 0;
					$timeout($scope.loadGraph);
				});
			};

			$timeout($scope.loadGraph);
			$scope.$on("$destroy", function() {
				$timeout.cancel($scope.promise);
				$scope.close = true;
			});
		}
	};
});