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
        Title: 'clients',
        LinkText: 'Seznam klientů'
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



app.filter('truncate', function () {
    return function (text, length, end) {
        if (isNaN(length))
            length = 10;

        if (end === undefined)
            end = "...";

        if (text.length <= length || text.length - end.length <= length) {
            return text;
        }
        else {
            return String(text).substring(0, length-end.length) + end;
        }

    };
});


app.filter('dateDiffFromNow', function () {
    return function (diff ) {
        
      diff = Date.now() - diff;
      ret = "";

      if ( moment.duration( diff ).asDays() >= 1 )
        ret += moment.duration( diff ).days()+"d ";
      
      if ( moment.duration( diff ).asHours() >= 1 )
        ret += moment.duration( diff ).hours()+"h ";
      
      if ( moment.duration( diff ).asMinutes() >= 1 )
        ret += moment.duration( diff ).minutes()+"m ";
      
        ret += moment.duration( diff ).seconds()+"s ";


      return ret;

      // var seconds = oarsdiff/1000;
      // var minutes = seconds/60;
      // var hours = minutes/60;
      // var days = hours/24;
      // var months = days/30;
      // var years = months/30;
    }
});
