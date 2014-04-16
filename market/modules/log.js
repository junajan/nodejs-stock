
module.exports = function ( LOG, LOG_EVENTS ) {

    var t = function () {

        d = new Date();

        hour = ("0" + d.getHours()).slice(-2);
        min = ("0" + d.getMinutes()).slice(-2);
        sec = ("0" + d.getSeconds()).slice(-2);
        milli = (d.getMilliseconds()+"000").substring(0,3);

        return "["+hour+":"+ min + ":"+ sec +"." + milli +"] ";
    }

    var logMessage = function ( text ) {

        if ( LOG )
            console.log ( t().white+text );
    }

    var logError = function ( text ) {

        if ( LOG )
            console.log ( t().white+text.red );
    }

    var logEvent = function ( evName, d ) {

        if ( LOG_EVENTS )
            logMessage ( "EVENT: "+ evName + " | DATA: " + JSON.stringify ( d ));
    }


    return {
        event: logEvent,
        message: logMessage,
        error: logError,
        t: t
    }
}

