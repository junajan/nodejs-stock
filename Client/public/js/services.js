app.factory('socket', function ($rootScope, errorService) {
  
  var url = CONF.url + ":" + CONF.port;
  $rootScope.msgTypes = { 
    0:"SELL ORDER", 
    1:"BUY ORDER", 
    100: "Příkaz na prodej @@ byl proveden.",
    101: "Příkaz na nákup @@ byl proveden.", 
    300: "Zrušení prodeje @@ bylo provedeno.",
    301: "Zrušení nákupu @@ bylo provedeno.", 
    400: "Příkaz na prodej @@ vyexpiroval.",
    401: "Příkaz na nákup @@ vyexpiroval.", 
  };

  $rootScope.socket = io.connect( url,
      {
          'force new connection':true,
          'reconnection delay': 100, // defaults to 500
          'reconnection limit': Infinity, // defaults to Infinity
          'max reconnection attempts': Infinity // defaults to 10
      });


  function authenticate () {

    $rootScope.socket.emit("authenticate", CONF.key, function ( r ) {
      // if ( r.res != 1 )
      //   alert ( "Došlo k chybě při připojování k serveru.");
    });
  }

  $rootScope.socket.on("disconnect", function () {

    errorService.showError();
  });

  $rootScope.socket.on("connect", function () {

    authenticate ();
  });

  $rootScope.socket.on("accountInfo", function ( d ) {

    $rootScope.userInfo = d;
    $rootScope.$apply();
  });
  
  $rootScope.socket.on("unreaded", function ( d ) {

    if ( d.len > 99 )
      d.len = 99;
    
    $rootScope.newMessagesCount = d.len;
    $rootScope.newMessages = d.data;

    $rootScope.$apply();
  });

  $rootScope.socket.on("serverInfo", function ( d ) {

    $rootScope.online = d.connected;
    $rootScope.$apply();
  });

  return {
    on: function (eventName, callback) {
      $rootScope.socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      $rootScope.socket.emit(eventName, data, function () {
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

app.service("FormErrors", function($rootScope) {
  
  this.showErrors = function ( el, err ) {

    $.each( err, function ( ind, val ) {

      var item = $(el).find( " *[name="+ind+"]");

      item.parent().addClass( "has-error" );

      e = val[0];
      if ( $.type( val ) === "string")
        e = val;

      msg = "<div class='errorMsg error'>"+e+"</div>";
      item.after ( msg );
    });
  }

  this.hideErrors = function ( el ) {

    $(el).find(".has-error").removeClass("has-error");
    $(el).find(".errorMsg").fadeOut().remove();
  }
});

app.service("TableService", function($rootScope) {
  
  dataTableCzech = {
    "sProcessing":   "Provádím...",
      "sLengthMenu":   "Zobraz záznamů _MENU_",
      "sZeroRecords":  "Žádné záznamy nebyly nalezeny",
      "sInfo":         "Zobrazuji _START_ až _END_ z celkem _TOTAL_ záznamů",
      "sInfoEmpty":    "Zobrazuji 0 až 0 z 0 záznamů",
      "sInfoFiltered": "(filtrováno z celkem _MAX_ záznamů)",
      "sInfoPostFix":  "",
      "sSearch":       "Hledat:",
      "sUrl":          "",
      "oPaginate": {
         "sFirst":    "První",
         "sPrevious": "Předchozí",
         "sNext":     "Další",
         "sLast":     "Poslední"
     }
  };

  this.show = function ( id ) {

    setTimeout ( function () {
      
      $('#'+id).dataTable({
        "oLanguage": dataTableCzech,
            "bPaginate": true,
            "bLengthChange": false,
            "bFilter": false,
            "bSort": true,
            "bInfo": true,
            "bAutoWidth": false
        });
    }, 200);
  }
});

app.filter('dateToISO', function() {
  return function(input) {
    alert ( input );

    input = new Date(input).toISOString();
    return input;
  };
});

app.service("errorService", function($rootScope, $http) {

  var brokerUrl = CONF.url+":"+CONF.port+"/client-rest/";
  var self = this;
  self.stopRequests = false;
  self.ignoreError404 = false;
  self.pingInt = false;
  self.logoutStop = false;

  this.readUserInfo = function () {
      
      $http({ url: brokerUrl+"account-info", method: 'GET' }).success(function ( data ) {

          self.testResult ( function () {

            $rootScope.userInfo = data;
            $rootScope.socket.socket.reconnect();
          }, data);
      });
  }
  this.showError = function ( loc, data, status, headers, config, $location) {
    
    if ( self.stopRequests )
      return false;

    // stop all requests
    self.stopRequests = true;
    setTimeout ( function() {

      // fade out page 
      $("#connError").fadeIn();
      $(".overlay_all").fadeIn();
      
      // // start pinging server
      self.pingInt = setInterval (function() {

        $http({ url: brokerUrl+"ping", method: 'GET' })
            .success(function(data, status, headers, config){

              // fade in page
              self.stopRequests = false;            
              clearInterval( self.pingInt );

              self.readUserInfo ();

              $("#connError").fadeOut();
              $(".overlay_all").fadeOut();

            }).error(function(data, status, headers, config){

              console.log ( "HTTP ERROR: "+ status );
            });
      }, 1000 );
        
    }, 500 );
  };
  
  this.testResult = function( cb, data, status, headers, config ) {

    if ( data.unauthenticated == 1 ) {

      if ( self.stopRequests )
        return false;
      
      self.stopRequests = true;
      alert ( "Došlo k odhlášení. Prosím přihlašte se znovu." );
      window.location = "/logout";

    }
    else if ( cb )
      cb ( data, status, headers, config );
  };
});

app.factory('restCall', function ($http, $rootScope, errorService) {

  var brokerUrl = CONF.url+":"+CONF.port+"/client-rest/";

  return{          
    get: function( loc, cb ) {

      if ( errorService.stopRequests )
        return false;

      return $http({ url: brokerUrl+loc, method: 'GET' })
        .success(function(data, status, headers, config){

          errorService.testResult ( cb, data, status, headers, config );

        }).error(function(data, status, headers, config){

          errorService.showError ( brokerUrl+loc, data, status, headers, config);
        });
    },
    post: function ( loc, data, cb ) {

      if ( errorService.stopRequests )
        return false;

      $http({ url: brokerUrl+loc, method: "POST", data: data })
        .success(function(data, status, headers, config) {
          
            errorService.testResult ( cb, data, status, headers, config );
        
        }).error(function(data, status, headers, config) {
          
            errorService.showError ( brokerUrl+loc, data, status, headers, config);
        });
    }
  }
});

app.run(function($rootScope) {

  $rootScope.orderTypes = { 
    0:"sell order", 
    1:"buy order", 
    100: "sell executed",
    101: "buy executed", 
    200: "sell cancel",
    201: "buy cancel",
    300: "sell cancelled",
    301: "buy cancelled",
    400: "sell expired",
    401: "buy expired",
  }

  $rootScope.orderTypesBig = { 
    0:"SELL ORDER", 
    1:"BUY ORDER", 
    100: "SELL EXECUTED",
    101: "BUY EXECUTED", 
    200: "SELL CANCEL",
    201: "BUY CANCEL",
    300: "SELL CANCELLED",
    301: "BUY CANCELLED",
    400: "SELL EXPIRED",
    401: "BUY EXPIRED",

  }

  
  $rootScope.$on('$routeChangeStart', function() {

    $("#content_box").hide();
  });
 
  $rootScope.$on('$routeChangeSuccess', function() {

    addr = window.location.pathname;
    $(".sidebar-menu li a[ng-href$='"+addr+"']").click();
    
    setTimeout ( function () {

      $("#content_box").fadeIn(500);
    }, 400);
  });

  $(".sidebar-menu li a").click(function(el) {

    $(".active").removeClass("active");
    $(this).parent().addClass("active");
  });
});

app.run(function($rootScope, socket, restCall) {
  $rootScope.newMessagesCount = 0;

  // nacti zakladni informace o klientovi
  restCall.get( "account-info",  function ( res ) {

    $rootScope.userInfo = res;
  });
});


app.filter('replace', function () {

  return function(text, f, t){
    return text.replace(f,t);
  } 
});


app.filter('cut', function () {
    return function (value, wordwise, max, tail) {
        if (!value) return '';

        max = parseInt(max, 10);
        if (!max) return value;
        if (value.length <= max) return value;

        value = value.substr(0, max);
        if (wordwise) {
            var lastspace = value.lastIndexOf(' ');
            if (lastspace != -1) {
                value = value.substr(0, lastspace);
            }
        }

        return value + (tail || ' …');
    };
});