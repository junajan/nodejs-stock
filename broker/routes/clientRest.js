var form = require("express-form"),
    field = form.field;
var unauthPaths = ["ping", "login", "lost-password", "registration" ];

module.exports = function(app) {
    
    // na jake adrese bude rest sluzba naslouchat    
    var restUri = '/client-rest/';

    // trida zpracovavajici REST pozadavky
    var REST = require('../modules/clientApi') ( app );
    

 
    /**
     * Pro vsechny requesty vracime header s povolenymi vlastnostmi pro CORS (Cross origin request source)
     * - to nam umozni dotazovat se RESTu z angular aplikace umistene na jine domene 
     */
    app.all('*', function(req, res, next) {

        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization");

        next();
    });

    app.options('*', function(req, res, next) {

        res.send( 200 );
    });

    
    // // app.get("/client-rest/news", function ( req, res, next ) {
    // //     console.dir ( "aaaa" );

    // //     next();
    // // });


    // obhospodaruje test spojeni klienta a serveru
    app.get( restUri + 'ping', REST.call ( REST.ping, "ping", false ));

    // overi uziv. udaje a vrati LOGIN_KEY pro spojeni
    app.post( restUri + 'login', REST.call ( REST.login, "login", false ));   // druhy parametr fce call povoluje unauthenticated requesty
    app.post( restUri + 'registration', form(
        field("name", "Jméno")
                .trim()
                .custom( function(v){ if ( v.length > 12 || v.length < 4 ) throw new Error(); }, "Nick musí mít 4 až 12 znaků")
                .is(/^[a-zA-Z0-9]+$/, "Povolené jsou pouze alfanumerické znaky")
                .required("", "%s je povinná položka"),
        field("email", "Email")
                .trim()
                .required("", "%s je povinná položka")
                .isEmail("%s není validní"),
        field("password", "Heslo")
                .trim()
                .custom( function(v){ if ( v.length < 5 ) throw new Error(); }, "Heslo musí mít  minimáně 5 znaků")
                .required("", "%s je povinná položka"),
        field("password2", "")
                .trim()
                .required("", "Zadejte heslo znovu pro kontrolu")

        ), REST.call ( REST.doRegistration, "registration", false ) );
    
    app.post( restUri + 'lost-password', REST.call ( REST.doLostPassword, "lost-password", false ) );
    app.get( restUri + 'history', REST.call ( REST.getHistory, "history" ));
    app.get( restUri + 'news', REST.call ( REST.getNews, "news" ));


    app.get( restUri + 'account-info', REST.call ( REST.getClientInfo, "account-info" ));
    app.get( restUri + 'stock-list', REST.call ( REST.getStockList, "stock-list" ));
    app.get( restUri + 'stock-detail/:code', REST.call ( REST.getStockDetail, "stock-detail" ));
    app.get( restUri + 'my-stocks', REST.call ( REST.getMyStocks, "my-stocks" ));
    app.get( restUri + 'my-pending-orders', REST.call ( REST.getPendingStocks, "my-pending-orders" ));
    
    app.post( restUri + 'save-account-info', REST.call ( REST.setAccountInfo, "save-account-info" ));
    app.post( restUri + 'save-password', form(
        field("old", "Staré heslo")
                .trim()
                .required("", "%s je povinná položka"),
        field("password", "Nové heslo")
                .trim()
                .custom( function(v){ if ( v.length < 5 ) throw new Error(); }, "Heslo musí mít  minimáně 5 znaků")
                .required("", "%s je povinná položka"),
        field("password2", "Nové heslo znovu")
                .trim()
                .required("", "Zadejte heslo znovu pro kontrolu")

        ), REST.call ( REST.setPassword, "save-password" ));
    
    // ============= Stock =============
    app.post( restUri + 'stock-buy', REST.call ( REST.buyStock, "stock-buy" ));
    app.post( restUri + 'stock-sell', REST.call ( REST.sellStock, "stock-sell" ));
    app.post( restUri + 'stock-order-cancel', REST.call ( REST.cancelStockOrder, "stock-order-cancel" ));


    app.get( restUri+"*", function ( req, res) { res.send({not_implemented:1})});
}
