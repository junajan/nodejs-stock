
    setTimeout(function() {

        var startTime = (new Date()).getTime();
        i = 0;
        var send = function () {
            BROKER.sendMsg ( "AHOJ", function () {
                
                i++;
                if ( i < 100000 ) {

                    send();

                } else {

                    var endTime = (new Date()).getTime();
                    log.message ( ("Time: " + ( endTime-startTime ) + "ms").green );
                }
            });
        }


        send();
    }, 2000);