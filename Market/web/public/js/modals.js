/**
 * Controller obsluhujici modalni okno s emisi akcii
 */
var StockEmission = function($scope, $http, $modalInstance, MsgService) {

    $scope.ok = function() {

        $scope.emise.stockId = $scope.stockId;

        $http.post( REST_LOC+"stock-emission", $scope.emise).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Emise byla úspěšná.", 1.5);
                if ( $scope.loadCompanies )
                    $scope.loadCompanies();

                $modalInstance.close();
            }
        });
    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
};

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var AddCompany = function($scope, $http, $modalInstance, MsgService) {

    if ( $scope.editInfo ) {

        $scope.type = "Editace";
        $scope.name = $scope.editInfo.name;
        $scope.n = $scope.editInfo;
        $scope.n.codeOld = $scope.n.ticker;
    } else {

        $scope.type = "Přidání";
        $scope.name = "";
        $scope.n = {};
        $scope.n.shares = 0;
    }

    $scope.ok = function() {

        $http.post( REST_LOC+"add-stock", $scope.n).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Položka byla přidána do seznamu.", 1.5);
                
                if ( $scope.loadCompanies )
                    $scope.loadCompanies();
                
                $modalInstance.close();
            }
        });
    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
};

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var AddBroker = function($scope, $http, $modalInstance, MsgService) {

    if ( $scope.editInfo ) {

        $scope.type = "Editace";
        $scope.name = $scope.editInfo.name;
        $scope.n = $scope.editInfo;
        $scope.n.codeOld = $scope.n.code;
    } else {

        $scope.type = "Přidání";
        $scope.name = "";
        $scope.n = {};
        $scope.n.shares = 0;
    }

    $scope.ok = function() {

        $http.post( REST_LOC+"add-broker", $scope.n).then(function(res) {

            if (res.data.error)
                alert(res.data.error);
            else {
                MsgService.valid("Položka byla přidána do seznamu.", 1.5);
                $scope.loadData();
                $modalInstance.close();
            }
        });
    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
};

/**
 * Controller obsluhujici modalni okni s pridanim spolecnosti
 */
var OrderBookLine = function($scope, $http, $modalInstance, MsgService) {

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };
};
