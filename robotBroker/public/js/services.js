app.factory('socket', function ($rootScope) {
  var socket = io.connect();

  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});

app.service("MsgService", function($rootScope) {
  
  clearValid = this.clearValid = function () {
    $rootScope.messageValid = "";
    $rootScope.$apply();
  }

  clearError = this.clearError = function() {
    $rootScope.messagesError = "";
  }

  this.valid = function(message, ttl) {
    $rootScope.messageValid = message;
    if ( ttl ) 
      setTimeout(function() {
        clearValid();

      }, ttl * 1000 );
  }

  this.error = function ( message, ttl ) {
    $rootScope.messagesError = message;
    if ( ttl ) 
      setTimeout(function() {
        clearError();
      }, ttl);
  }
});

app.controller('navCtrl', ['$scope', '$location', function ($scope, $location, $rootScope , $timeout ) {

    $scope.navLinks = [{
        Title: '',
        LinkText: 'Úvod'
    }, {
        Title: 'server-status',
        LinkText: 'Server status'
    }, {
        Title: 'stocks',
        LinkText: 'Přehled akcií'
    }, {
        Title: 'owned-stocks',
        LinkText: 'Vlastněné akcie'
    }, {
        Title: 'pending',
        LinkText: 'Nevyřízené příkazy'
    }, {
        Title: 'history',
        LinkText: 'Historie'
    }];

    $scope.navClass = function (page) {
        var currentRoute = $location.path().substring(1) || '';
        return page === currentRoute ? 'active' : '';
    };   
}]);


app.filter("writeNonZero", function () {
  return function(d) {
    
    return d == 0 ? "" : d;
  };
});

