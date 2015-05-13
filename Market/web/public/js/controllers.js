var ChartController = function($scope, $rootScope, ticker) {

    $scope.type = 1;
    $scope.info = {};
    $scope.stopStart = false;

    var lastTime = 0;
    var maxChartLen = 60;
    var data = {
        price: [],
        amount: []
    }


    function renderChart() {

        var options1 = {
            xaxis: {
                mode: "time",
                timeformat: "%H:%M.%S",
                minTickSize: [$scope.type * 4, "second"],
                axisLabel: 'čas',
                axisLabelUseCanvas: false
            },
            yaxis: {
                tickFormatter: function(val, axis) {
                    return "$" + parseFloat(val).toFixed(2);
                },
                axisLabel: 'cena',
                axisLabelUseCanvas: false,
                min: 0
            },
            grid: {
                hoverable: true,
            },
            tooltipOpts: {
                content: "Čas: %x | Cena: %y",
            },
            tooltip: true
            // grid: { hoverable: true, clickable: true},
        };

        var options = {
            xaxis: {
                mode: "time",
                timeformat: "%H:%M.%S",
                minTickSize: [$scope.type * 4, "second"],
            },
            yaxis: {
                tickFormatter: function(val, axis) {
                    return "$" + parseFloat(val).toFixed(2);
                },
                min: 0
            },
            grid: {
                hoverable: true,
            },
            tooltipOpts: {
                content: "Čas: %x | Cena: %y",
            },
            tooltip: true
            // grid: { hoverable: true, clickable: true},
        };

        var options2 = {
            xaxis: {
                mode: "time",
                timeformat: "%H:%M.%S",
                minTickSize: [$scope.type * 4, "second"],
                axisLabel: 'čas',
                axisLabelUseCanvas: false
            },
            bars: {
                show: true,
                barWidth: $scope.type * 1000
            },
            yaxis: {
                tickFormatter: function(val, axis) {
                    return parseFloat(val).toFixed(2);
                },
                minTickSize: 1,
                axisLabel: 'množství',
                axisLabelUseCanvas: false,
                min: 0
            },
            grid: {
                hoverable: true,
                clickable: true,
                autoHighlight: true
            },
            tooltipOpts: {
                content: "Čas: %x | Množství: %y",
            },
            tooltip: true
            // grid: { hoverable: true, clickable: true},
        };

        $.plot("#chart_price", [data.price], options);
        $.plot("#chart_price2", [data.price], options1);
        $.plot("#chart_amount2", [data.amount], options2);
    }

    function addEntry(e) {

        var price = parseFloat(e.price / e.count).toFixed(2);

        if (data.price.length) {
            var last = data.price[data.price.length - 1];

            if (parseInt(last[0]) + 100 >= parseInt(e.time))
                return;
        }

        data.price.push([e.time, price]);
        data.amount.push([e.time, e.amount]);
    }

    function removeOldEntries() {

        if (data.price.length > maxChartLen) {

            data.price.splice(0, data.price.length - maxChartLen);
            data.amount.splice(0, data.amount.length - maxChartLen);
        }
    }

    function processResult(res) {
        var e = {};

        $scope.info = res.info;
        $scope.$apply();

        var cData = res.chart.data;

        if (cData.length) {

            for (var i in cData)
                addEntry(cData[i]);

            lastTime = res.chart.lastTime;

            removeOldEntries();
            renderChart();
        }

        $("#loading-msg").fadeOut();
        $(".chart_small .invis").delay(500).fadeIn(500);

        $rootScope.timeout = setTimeout($scope.loadGraph, $scope.type * 1000);
    }

    $scope.stopStart = function() {

        $scope.stopStartVal = !$scope.stopStartVal;
        $scope.loadGraph();
    };

    $scope.loadGraph = function(type) {

        clearTimeout($rootScope.timeout);

        if ($scope.stopStartVal)
            return false;

        if (type && type != $scope.type) {

            $scope.type = type;
            data = {
                price: [],
                amount: []
            }
            lastTime = 0;
        }

        $(".range a").css("font-weight", "normal");
        $("#type_" + $scope.type).css("font-weight", "bold");

        // $.get( "//"+CONF_CHART.addr+":"+CONF_CHART.port+"/stock-history/"+ticker+"/"+$scope.type+"?last="+lastTime, processResult);
    };

    $scope.loadGraph();

    $scope.$on("$destroy", function() {
        clearTimeout($rootScope.timeout);
    });

    $(window).resize(function() {
        renderChart()
    });
};

/**
 * Controller obsluhujici index page
 */
app.controller("IndexController", function($scope, $http, MsgService) {

    $scope.timeout = false;

    $scope.loadData = loadData = function(cb) {

        $http.get(REST_LOC + "server-info").then(function(res) {

            $scope.info = res.data;
            $scope.timeout = setTimeout(loadData, 1000);
        });
    };

    loadData();
    $scope.$on("$destroy", function() {
        clearTimeout($scope.timeout);
    });
});

/**
 * Controller obsluhujici index page
 */
app.controller("Workers", function($scope, $http, MsgService) {
    $scope.states = {
        1: "connected",
        2: "disconnected",
        3: "error",
        4: "reconnecting",
        5: "connecting",
    };

    $scope.timeout = false;
    $scope.activeWorkersLength = 0;
    $scope.showOnlyConnected = false;

    $scope.loadData = function(cb) {

        $http.get(REST_LOC + "workers").then(function(res) {
            $scope.workers = res.data;
            $scope.activeWorkersLength = 0;

            res.data.forEach(function(item) {
                if (item.state == 1)
                    $scope.activeWorkersLength++;
            });

            $scope.timeout = setTimeout($scope.loadData, 1000);
        });
    };

    $scope.refreshWorkers = function() {
        $("#worker-spinner").addClass("fa-spin");

        $http.get(REST_LOC + "refresh-workers").finally(function() {
            setTimeout(function() {
                $("#worker-spinner").removeClass("fa-spin");
            }, 1000);
        });
    };

    $scope.loadData();
    $scope.$on("$destroy", function() {
        clearTimeout($scope.timeout);
    });
});

/**
 * Controller obsluhujici error404 stranku
 */
app.controller("Error404Controller", function($scope) {});

/**
 * Controller obsluhujici stranku s historii
 */
app.controller("History", function($scope, $http, MsgService) {});

/**
 * Controller obsluhujici seznam spolecnosti
 */
app.controller("Stocks", function($scope, $http, MsgService, $modal) {

    $scope.n = {};
    $scope.timeout = false;

    $scope.loadCompanies = loadCompanies = function(cb) {

        $http.get(REST_LOC + "stock-list").then(function(res) {

            $scope.data = res.data;
            cb && cb();
        });
    };

    $scope.timeout = setInterval(loadCompanies, 1000);
    loadCompanies();

    $scope.$on("$destroy", function() {
        clearInterval($scope.timeout);
    });

    $scope.showAddForm = function(info) {

        $scope.editInfo = angular.copy(info);;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/addStock.html',
            controller: AddCompany,
            scope: $scope
        });

        modalInstance.result.then(function() {}, function() {
            $scope.editInfo = null;
        });
    };

    $scope.openEmission = function(info) {

        $scope.ticker = info.ticker;
        $scope.stockId = info.id;
        $scope.emise = angular.copy(info);

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockEmission.html',
            controller: StockEmission,
            scope: $scope
        });
    };
});

/**
 * Controller obsluhujici detail spolecnosti
 */
app.controller("StockItem", function($scope, $rootScope, $routeParams, $modal, $http, MsgService) {
    $scope.info = {};
    $scope.orderBook = {};

    var T_SELL = 2;
    var T_BUY = 1;
    var loadingData = false;

    ChartController($scope, $rootScope, $routeParams.ticker);

    $scope.min = Math.min;
    $scope.max = Math.max;

    function getDefaultHashItem() {

        return {
            buy: {
                amount: 0,
                sumAmount: 0,
                orderAmount: 0,
                ordersId: [],
                orders: []
            },
            sell: {
                amount: 0,
                sumAmount: 0,
                orderAmount: 0,
                ordersId: [],
                orders: []
            }
        };
    }

    function processOrderData(d) {


        var ordersLines = [];

        var indSell = 0;
        var indBuy = 0;
        var indHash = -1;
        var item, type;

        var sumBuy = 0;
        var sumSell = 0;
        var orders = d;

        var countAll = orders.buy.length + orders.sell.length;
        // projde vsechny prikazy ze seznamu buy i sell
        // a zpracuje je do pole prikazu
        for (var i = 0; i < countAll; i++) {

            if (!(indBuy in orders.buy) || ((indSell in orders.sell) && orders.buy[indBuy].price > orders.sell[indSell].price)) {

                item = orders.sell[indSell];
                type = 0;
                indSell++;
            } else {

                item = orders.buy[indBuy];
                type = 1;
                indBuy++;
            }

            // if ( item.amount > 30 )
            //     continue;

            if (!ordersLines.length || ordersLines[indHash].price != item.price) {

                ordersLines.push(getDefaultHashItem());
                indHash++;
            }

            item.price = parseFloat(item.price).toFixed(2);
            item.amount = parseInt(item.amount);

            ordersLines[indHash].price = item.price;

            if (type) {
                // pridavame do buy
                sumBuy += item.amount;

                ordersLines[indHash].buy.price = item.price;
                ordersLines[indHash].buy.amount += item.amount;
                // ordersLines[indHash].buy.sumAmount = sumBuy;
                ordersLines[indHash].buy.ordersId.push(item.id);
                ordersLines[indHash].buy.orders.push(item);
                ordersLines[indHash].buy.orderAmount++;

            } else {
                // pridavame do sell
                sumSell += item.amount;

                ordersLines[indHash].sell.price = item.price;
                ordersLines[indHash].sell.amount += item.amount;
                ordersLines[indHash].sell.sumAmount = sumSell;
                ordersLines[indHash].sell.orders.push(item);
                ordersLines[indHash].sell.ordersId.push(item.id);
                ordersLines[indHash].sell.orderAmount++;
            }
        }

        prevSell = 0;
        var end = ordersLines.length;
        for (var i = 0; i < end; i++) {

            ordersLines[i].buy.sumAmount = sumBuy;
            sumBuy -= ordersLines[i].buy.amount;

            if (!ordersLines[i].sell.sumAmount)
                ordersLines[i].sell.sumAmount = prevSell;

            prevSell = ordersLines[i].sell.sumAmount;
            // console.log ( ordersLines[i].sell.sumAmount );
        }

        // zjisti maximum ze vsech zobchodovatelnych objemu a vypocita previs
        var maxIndex = -1;
        var max = 0;
        for (var i = 0; i < end; i++) {
            var line = ordersLines[i];

            line.min = Math.min(line.buy.sumAmount, line.sell.sumAmount);
            line.diff = Math.max(line.buy.sumAmount, line.sell.sumAmount) - line.min;

            if (line.min > max) {
                maxIndex = i;
                max = line.min;
            }
        }

        if (maxIndex >= 0)
            ordersLines[maxIndex].isMax = true;

        $scope.orderBook = ordersLines;
        $scope.$apply();
    }

    $scope.openDetail = function(price) {

        $scope.lineDetail = $scope.orderBook[price];
        $scope.lineDetailPrice = price;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/orderBookLine.html',
            controller: OrderBookLine,
            scope: $scope
        });
    };

    function findSortingPosition(list, item, direction) {

        var i = 0
        for (; i < list.length; i++) {

            if (direction == 1 && list[i].price < item.price)
                return i;
            else if (direction == -1 && list[i].price > item.price)
                return i;
        }

        return i;
    }

    function sortOrderList(list, direction) {
        var n = [];
        var pos = 0;

        for (var i = 0; i < list.length; i++) {

            pos = findSortingPosition(n, list[i], direction);
            n.splice(pos, 0, list[i]);
        }

        // var c = n.map(function(item) {
        //     return item.price;
        // });
        // console.log(c);

        return n;
    }

    function transformOrders(list) {
        var orders = {
            buy: [],
            sell: []
        };
        list.forEach(function(item) {
            item.price = parseFloat(item.price);
            item.amount = parseInt(item.amount);
            if (item.type_id == T_BUY)
                orders.buy.push(item);
            else
                orders.sell.push(item);
        });

        orders.buy = sortOrderList(orders.buy, -1);
        orders.sell = sortOrderList(orders.sell, -1);

        return orders;
    }

    function loadData() {
        if (loadingData)
            return;

        loadingData = true;

        $.get(REST_LOC + "stock-detail/" + $routeParams.ticker, function(res) {

            $scope.stockInfo = res.info;
            $scope.$apply();

            $.get(REST_LOC + "stock-orders/" + res.info.id, function(res) {

                processOrderData(transformOrders(res));
                loadingData = false;
            });
        });
    }

    loadData();
    var loadInt = setInterval(loadData, 1000);

    $scope.$on("$destroy", function() {
        clearInterval(loadInt);
    });

    $scope.showAddForm = function(info) {

        $scope.editInfo = info;

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/addStock.html',
            controller: AddCompany,
            scope: $scope
        });

        modalInstance.result.then(function() {}, function() {
            $scope.editInfo = null;
        });
    };

    $scope.openEmission = function() {
        $scope.stockId = $scope.stockInfo.id;
        $scope.ticker = $scope.stockInfo.ticker;

        $scope.emise = {
            price: $scope.stockInfo.price
        };

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/stockEmission.html',
            controller: StockEmission,
            scope: $scope
        });
    };
});

/**
 * Controller obsluhujici seznam spolecnosti
 */
app.controller("Brokers", function($scope, $http, MsgService, $modal) {

    $scope.n = {};
    $scope.timeout = false;
    $scope.editInfo = false;
    oldData = false;

    $scope.loadData = loadData = function(cb) {

        $http.get(REST_LOC + "broker-list").then(function(res) {

            var dataText = JSON.stringify(res.data);
            if (dataText != oldData) {

                oldData = dataText;
                // $scope.onlineBrokers = [];
                $scope.onlineBrokers = res.data.online;
                $scope.data = res.data.list;
            }
        });
    };

    $scope.interval = setInterval(loadData, 1000);
    loadData();

    $scope.$on("$destroy", function() {
        clearInterval($scope.interval);
    });


    $scope.showAddForm = function(ticker) {

        $scope.editInfo = false;
        if (typeof ticker != "undefined")
            $scope.editInfo = angular.copy($scope.data[ticker]);

        var modalInstance = $modal.open({
            templateUrl: '/partials/dialogs/addBroker.html',
            controller: AddBroker,
            scope: $scope
        });
    };
});

/**
 * Controller obsluhujici index page
 */
app.controller("BrokerDetail", function($scope, $routeParams, $http, MsgService) {

    $scope.timeout = false;

    $scope.loadData = loadData = function(cb) {

        $http.get(REST_LOC + "broker-detail/" + $routeParams.id).then(function(res) {
            console.log($scope.data);
            $scope.data = res.data;

            for (var i in res.data)
                $scope[i] = res.data[i];

            $scope.stocksSum = 0;
            if ($scope.ownedStocks)
                for (var i in $scope.ownedStocks) {
                    $scope.stocksSum += $scope.ownedStocks[i].amount;
                    
                    for(var j in $scope.stocks) {
                        if($scope.stocks[j].id == $scope.ownedStocks[i].stock_id)
                            $scope.ownedStocks[i].info = $scope.stocks[j];
                    }
                }

            $scope.timeout = setTimeout(loadData, 1000);
        });
    };

    loadData();

    $scope.$on("$destroy", function() {
        clearTimeout($scope.timeout);
    });

});

app.controller("History", function($scope, $routeParams, $http, MsgService) {

    $scope.EVENT_NAMES = {
        0: "SELL ORDER",
        1: "BUY ORDER",
        10: "SELL EXECUTED",
        11: "BUY EXECUTED",

        20: "SELL CANCEL",
        21: "BUY CANCEL",
        30: "SELL CANCELLED",
        31: "BUY CANCELLED",

        40: "SELL EXPIRED",
        41: "BUY EXPIRED",
    }

    $scope.timeout = false;
    var oldData = "";

    $scope.loadData = loadData = function(cb) {

        $http.get(REST_LOC + "history").then(function(res) {

            var dataText = JSON.stringify(res.data);
            if (dataText != oldData) {

                oldData = dataText;
                $scope.data = res.data.history;

                $scope.brokers = {};
                res.data.brokers.forEach(function(item) {

                    $scope.brokers[item._id] = item;
                });
            }

            $scope.timeout = setTimeout(loadData, 1000);
        });
    }

    loadData();

    $scope.$on("$destroy", function() {
        clearTimeout($scope.timeout);
    });
});

app.controller("Statistics", function($scope, $routeParams, $http, MsgService) {

    // $scope.testData = [
    //     {buy: [1, 15, 5330], sell: [3,5, 5320]},
    //     {buy: [2, 15, 5325], sell: [5,5, 5325]},
    //     {buy: [4, 15, 5320], sell: [6,10, 5330]},
    //     {buy: [7, 10, 5315], sell: [9,10,5350]},
    //     {buy: [8, 10, 5305], sell: [10,10,5700]},
    //     {buy: [11,10, 5200], sell: false},
    // ];

    $scope.testData = [
        {buy: [40, 5], sell: [0,0], price: 490},
        {buy: [35, 8], sell: [8,8], price: 500},
        {buy: [27, 15], sell: [20,12], price: 505},
        {buy: [12, 3], sell: [21,1], price: 510},
        {buy: [9, 7], sell: [24,3], price: 520},
        {buy: [2,2], sell: [30,6], price:535},
        {buy: [0,0], sell: [45,15], price: 560},
    ];
    
    $scope.min = Math.min;
    $scope.abs = Math.abs;

    // $scope.testData = [
    //     [0, 0, 5200, 0, 0],
    //     [0, 0, 5305, 0, 0],
    //     [0, 0, 5315, 0, 0],
    //     [0, 0, 5320, 0, 0],
    //     [0, 0, 5325, 0, 0],
    //     [0, 0, 5330, 0, 0],
    //     [0, 0, 5350, 0, 0],
    //     [0, 0, 5700, 0, 0],
    // ];
    









    $scope.timeout = false;
    var oldData = false;


    function parseHistory(data) {

        var out = {
            bought: {},
            cancelledSell: {},
            cancelledBuy: {},
            expirySell: {},
            expiryBuy: {},
        };

        for (var i = 0; i < data.length; i++) {
            var item = data[i];

            if (item._id == 11) // nakoupene akcie
                out.bought = item;

            if (item._id == 30)
                out.cancelledSell = item;
            if (item._id == 31)
                out.cancelledBuy = item;

            if (item._id == 40)
                out.expirySell = item;
            if (item._id == 41)
                out.expiryBuy = item;
        }

        for (var i in out)
            if (Object.keys(out[i]).length == 0)
                out[i] = {
                    "sumAmount": 0,
                    "sumPrice": 0,
                    "sumPriceAmount": 0,
                    "count": 0
                }

        return out;
    }

    $scope.loadData = loadData = function(cb) {

        $http.get(REST_LOC + "statistics").then(function(res) {

            var dataText = JSON.stringify(res.data);
            if (dataText != oldData) {

                oldData = dataText;

                $scope.data = res.data;

                $scope.dayData = parseHistory($scope.data.stockOrdersSumDay);
                $scope.monthData = parseHistory($scope.data.stockOrdersSumMonth);

                console.log(JSON.stringify($scope.dayData));
            }

            $scope.timeout = setTimeout(loadData, 1000);
        });
    };

    loadData();

    $scope.$on("$destroy", function() {
        clearTimeout($scope.timeout);
    });
});