var color = require('colors');

/**
 * Trida zajistujici logovani
 * @param  {Boolean} LOG        Prepinac zda vypisovat logovaci informace na vystup
 * @param  {Boolean} LOG_EVENTS Prepinac zda vypisovat eventy na vystup
 */
module.exports = function(NAME, LOG, LOG_EVENTS) {

    if (!NAME)
        NAME = "";
    else
        NAME += ": ";
    /**
     * Vrati cas zformatovany pro logovani, napr:
     * [20:03:42.699]
     * @return {String} Cas ve formatu pro logovani
     */
    var t = function() {

        d = new Date();

        hour = ("0" + d.getHours()).slice(-2);
        min = ("0" + d.getMinutes()).slice(-2);
        sec = ("0" + d.getSeconds()).slice(-2);
        milli = (d.getMilliseconds() + "000").substring(0, 3);

        return "[" + hour + ":" + min + ":" + sec + "." + milli + "] ";
    }

    /**
     * Funkce pro logovani zprav
     * @param  {String} text Text zpravy
     */
    var logMessage = function(text, data) {

        if (LOG)
            console.log(t().white + NAME + text, data || '' );
    }

    /**
     * Funkce pro logovani errorovych zprav
     * @param  {String} text Text zpravy
     */
    var logError = function(text, data) {

        if (LOG)
            console.log( (t() + NAME).white + text.red, data || '');
    }

    /**
     * Funkce pro logovani eventu
     * @param  {String} text   Text eventu
     * @param  {Object} d      Data s informacemi o eventu
     */
    var logEvent = function(text, data) {

        if (LOG_EVENTS)
            logMessage((text).yellow, data);
    }

    return {
        event: logEvent,
        message: logMessage,
        error: logError,
        t: t
    }
}