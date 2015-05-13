/**
 * Trida zajistujici logovani 
 * @param  {Boolean} LOG        Prepinac zda vypisovat logovaci informace na vystuj
 * @param  {Boolean} LOG_EVENTS Prepinac zda vypisovat eventy na vystuj
 */
module.exports = function ( LOG, LOG_EVENTS, NAME ) {

    if ( ! NAME )
        NAME = "";
    else
        NAME += ": ";
    /**
     * Vrati cas zformatovany pro logovani, napr:
     * [20:03:42.699] 
     * @return {String} Cas ve formatu pro logovani
     */ 
    var t = function () {

        d = new Date();

        hour = ("0" + d.getHours()).slice(-2);
        min = ("0" + d.getMinutes()).slice(-2);
        sec = ("0" + d.getSeconds()).slice(-2);
        milli = (d.getMilliseconds()+"000").substring(0,3);

        return "["+hour+":"+ min + ":"+ sec +"." + milli +"] ";
    }

    /**
     * Funkce pro logovani zprav
     * @param  {String} text Text zpravy
     */
    var logMessage = function ( text ) {

        if ( LOG )
            console.log ( t().white+ NAME+ text );
    }

    /**
     * Funkce pro logovani errorovych zprav
     * @param  {String} text Text zpravy
     */
    var logError = function ( text ) {

        if ( LOG )
            console.log ( t().white+NAME+ text.red );
    }

    /**
     * Funkce pro logovani eventu
     * @param  {String} evName Nazev eventu
     * @param  {Object} d      Data s informacemi o eventu
     */
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

