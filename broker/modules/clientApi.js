var async = require("async");
var validator = require("validator");
var randString = require("generate-key");
var colors = require("colors");
var sha1 = require("sha1");

// logovani a broker API
var log = require('./log')( false, false );

// databazove modely
var Client = require("../mongoose/client");
var Order = require("../mongoose/order");
var ClientStock = require("../mongoose/clientStock");
var ClientHistory = require("../mongoose/clientHistory");
var ClientConnection = require("../mongoose/clientConnection");

var Events = require("./events");

/**
 * Trida zajistuje rozhrani REST api pro obslouzeni klientovych pozadavku
 * @param {Object} app Objekt s aplikaci realizujici REST API
 */
var ClientApi = function ( app ) {

    var brokerApi = require('./marketClient')( app );
    var ConnectedClientsById = {};
    var ConnectedClientsByKey = {};
    var ConnectedClientsBySocketId = {};

    var CLIENT_SOCKET_API = this;

    var NEWS_CLIENT = require("./newsClient")( app );
    var NOT_READY = true;

    Events.on("client_api_finished", function() {

        NOT_READY = false;
    });
      

    /** 
     * Funkce zajistujici kontrolu pristupu pouze pro autorizovane 
     */
    this.call = function ( f, loc, authOnly ) {

        // pokud neni zadana authOnly, nastav ji na true
        if ( typeof authOnly == "undefined" )
            authOnly = true;

        // vrat funkci, ktera bude obluhovat request
        var cb = function(req, res) {
            // console.dir ( req.url );

            var auth = false;

            // pokud je request pro prihlasene
            if ( authOnly ) {
                
                // vezmi z headers auth key 
                var key = req.get("Authorization");

                // a otestuj, zda je v lokalni cachei prihlasenych uzivatelu
                if ( typeof key != "undefined" && key in ConnectedClientsByKey ) {
                    
                    // console.log ( key.blue );
                    var id = ConnectedClientsByKey[key];
                    req.user = ConnectedClientsById[ id ];
                    auth = true;
                }

                // pokud neni, nastav obsluhujici funkci na unauth
                if ( ! auth )
                    return CLIENT_SOCKET_API.unauthenticated(req, res );
            }

            // zavolej obsluhujici funkci requestu
            return f( req, res );
        }

        return cb;
    }

    this.testAuth = function ( req, res, next ) {

        console.log ( "=========> ".green );

        next();
    }
    /**
     * Pokud se klient nemuze pripojit, posila dokola pingy a ceka zda server odpovi
     */
    this.ping = function ( req, res ) {

        return res.send({pong:1});
    }

    /**
     * Funkce, ktera se zavola, pokud dojde k neautorizovanemu requestu
     */
    this.unauthenticated = function ( req, res ) {

        console.log ( ("Unauthenticated client: "+ req.get("Authorization") ).red );

        // vraci unauth: 1 na ktery by mel reagovat client odhlasenim
        // a vybidnutim k opetovnemu prihlaseni
        res.send (  { unauthenticated: 1 } );
    }

    /**
     * Na request vrati historii akci klienta
     * @param  {Object} req Object s informacemi o requestu
     * @param  {Object} res Object s infem a funkcemi na response
     */
    this.getHistory = function ( req, res ) {

        console.dir ( "GET_HISTORY FOR USER: " + req.user._id );

        // nacist z DB data s historii
        ClientHistory.find( { client: req.user._id}).sort({date: -1}).exec(function ( err, data ) {

            if ( err )
                return res.send ( "Při práci s databází došlo k chybě." );

            // odesli data s historii
            res.send ( data );

            // oznac vsechny do ted neprectene zaznamy za prectene
            ClientHistory.markAsReaded( req.user._id, function() {} );
        });
    }

    this.getClientUnreadedHistory = function ( uid, cb ) {

        // nacist z DB data s historii
        ClientHistory.find( { client: uid, notifyDate: 0 }).sort({date: -1}).exec(function ( err, data ) {
            if ( err )
                return cb ( false, 0 );
            
            cb ( data, data.length );
        });
    }

    /**
     * Vrati informace o uctu klienta
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.getClientInfo = function ( req, res ) {

        // informace o uzivateli
        var data = {
            email: req.user.email, 
            name: req.user.name,
            accountBalance: req.user.accountBalance
        }

        // odesli data
        res.send ( data );
    }

    /**
     * Vrati seznam s obchodovatelnymi akciemi
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.getStockList = function ( req, res ) {

        // z brokerApi nacti data a odesli je
        res.send ( brokerApi.getStocks () );
    }

    /**
     * Vrati seznam klientovych akcii
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.getMyStocks = function ( req, res ) {

        // z brokerApi nacti seznam klientovych akcii
        brokerApi.getClientStocks ( req.user._id, function ( err, data ) {

            if ( err ) 
                return res.send({ error: "Nepodařilo se načíst data z databáze." });

            // odesli zpet spolu se seznamem vsech spolecnosti
            res.send ( { stocks: brokerApi.getStocks(), data: data} );
        });
    }

    /**
     * Vrati seznam zatim nedokoncenych prikazu
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.getPendingStocks = function ( req, res ) {

        brokerApi.getClientsOrders ( req.user._id, function ( err, data ) {

            if ( err ) 
                return res.send({ error: "Nepodařilo se načíst data z databáze." });

            res.send ( { data: data} );
        });
    }

    /**
     * Nastavi uzivatelske informace na klientove uctu
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.setAccountInfo = function ( req, res ) {

        update = {
            name: req.body.name,
            email: req.body.email
        };

        if ( ! validator.isEmail( update.email ) )
            return res.send ( { error: "Email nemá požadovaný formát." } );

        // update v databazi
        Client.update ( {_id: req.user._id}, update, {}, function ( err ) {

            if ( err ) 
                return res.send ( { error: "Při ukládání do databáze došlo k chybě." });

            // upravime i lokalni cache
            ConnectedClientsById[ req.user._id ].name = update.name;
            ConnectedClientsById[ req.user._id ].email = update.email;

            return res.send ( {success:1} );
        });
    }

    /**
     * Nastavi uzivateli pristupove heslo
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.setPassword = function ( req, res ) {

        var error = {};

        // pokud je formular nevalidni - pri testech doslo k chybe
        // pridej errory do seznamu
        if (! req.form.isValid)
            return res.send({ error: req.form.getErrors() });

        // pokud se neshoduji nova hesla, vyhod chybu
        if ( req.form.password !== req.form.password2 )
            error.password = "Hesla se neshodují!";

        // pokud jsou nejake errory, odesly je
        if ( Object.keys(error).length )
            return res.send( { error: error });

        // otestujeme zda se shoduje stare heslo
        hash( req.form.old, req.user.salt, function (err, hashOld) {

            if (err)
                return res.send( { error: "Při úpravě hesla došlo k chybě." } );

            // pokud se stare heslo shoduje s tim v DB, uloz nove
            if ( hashOld == req.user.password) {

                // vytvor salt a hash noveho hesla
                var salt = randString.generateKey(7);
                var password = hash ( req.form.password, salt );

                // uloz ho do db
                Client.update ( { _id: req.user._id }, { $set: { password: password, salt: salt }}, function ( err ) {

                    if ( err )
                        return res.send( { error: "Při úpravě hesla došlo k chybě." });

                    // uloz heslo i do lokalni cache
                    ConnectedClientsById[ req.user._id ].password = password;
                    ConnectedClientsById[ req.user._id ].salt = salt;
                        
                    return res.send( {success:1});
                });
            } else {

                return res.send( { error: { old: "Staré heslo pro ověření nesouhlasí s heslem v databázi!" }});

            }
        });
    }

    /**
     * Odesle prikaz na nakup akcii do broker api
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.buyStock = function ( req, res ) {

        // pokud se jedna o neautorizovany pristup, ukonci spracovani
        if ( ! req.user )
            return res.send ({error:"Unauthenticated user!"});

        // info obsahuje data s informacemi o nakupu
        var info = req.body;

        // nastavi typ prikazu na BUY(=1)
        info.type = 1;

        // nacte seznam obchodovatelnych akcii
        var stocks = brokerApi.getStocks ();

        // otestuje zda je nakup akcii na existujici spolecnost
        if ( ! stocks[info.code] )
            return res.send ({error:"Příkaz byl zadán pro neznámou společnost."});
        
        // nacte data o klientovi
        Client.findOne({ _id: req.user._id}, function( err, u ) {

            // otestuje, zda ma klient dost prostredku na nakup
            if ( u.accountBalance < info.price * info.amount )
                return res.send ({error:"Na Vašem účtě není dostatek prostředků!"});

            // odecte z uctu klienta penize na nakup
            var originalBalance = u.accountBalance;
            u.accountBalance -= info.price * info.amount;

            // ulozi novy stav klientova uctu
            u.save( function ( err, o ) {

                // pokud doslo k chybe, vypis error
                if ( err )  
                    return res.send ( {error: "Chyba při aktualizaci účtu klienta!" });
                
                // k prikazu na nakup prida ID klienta
                info.client = req.user._id;

                // odesle prikaz na nakup do brokerApi
                brokerApi.addBuyOrder ( info, function ( err, out ) {

                    // pokud se odeslani prikazu nepovedlo, vypis a zaloguj chybu
                    if ( err ) {

                        // pri chybe pripis zpatky klientovi penize
                        u.accountBalance = originalBalance;
                        u.save();

                        log.error ( err );
                        return res.send ({ valid: 0, error: err.toString() });
                    }

                    // odesli info klientovi o uspesnem provedeni
                    res.send ({ valid: 1, decrBalance: info.price * info.amount });

                    // data s informacemi pro vedeni historie klientovych prikazu
                    var histData = {
                        type: info.type,
                        code: info.code,
                        price: info.price,
                        amount: info.amount,
                        notifyDate: Date.now()
                    }

                    // pokud se odeslani prikazu povedlo, pridej udalost do historie
                    ClientHistory.saveEvent ( req.user._id, histData );
                });
            });
        });         
    }

    /**
     * Prijme a zpracuje prikaz na prodej akcii
     * @param  {Object} req Object s requestem
     * @param  {Object} res Object s response
     */
    this.sellStock = function ( req, res ) {
        
        // info o prikazu
        var info = req.body;

        // doplni typ prikazu je 0 - sell
        info.type = 0;

        // test zda je uzivatel prihlaseny
        if ( ! req.user )
            return res.send ({error:"Unauthenticated user!"});
    
        // test, zda se jedna o existujici spolecnost        
        var stocks = brokerApi.getStocks ();

        // otestuje, zda se obchoduje s existujici spolecnosti
        if ( ! stocks[info.code] )
            return res.send ({error:"Bad stock code!"});
        
        // hledame klientovi akcie, kde je volne mnozstvi vice jak 0
        ClientStock
            .find({ client: req.user._id, amount: { $gt: 0 }, code: info.code })
            .sort({'date': -1})
            .exec(function(err, u){

            // test zda ma uzivatel dost akcii, aby je mohl prodat
            var stockRemove = [];

            // vytvorime seznam klientovych akcii, ktere muzeme odecist
            var amountLeft = info.amount;
            if ( u.length ) for ( i in u ) {

                stockRemove.push ( [ u[i]._id, Math.min(amountLeft, u[i].amount) ] );
                amountLeft -= u[i].amount;

                // pokud mame dost akcii, aby pokryly prikaz na prodej, ukoncime cyklus
                if ( amountLeft <= 0 ) 
                    break;
            }

            // pokud klient nema dostatek kusu akcii na prodej, vyhodime chybu
            if ( amountLeft > 0 )
                return res.send ( "Nedostatečné prostředky pro realizaci příkazu!");

            // prida k prikazu id uzivatele
            info.client = req.user._id;

            // odesle sell prikaz
            brokerApi.addSellOrder ( info, stockRemove, function ( err, out ) {

                // pokud doslo k chybe, zaloguj a vrat chybu
                if ( err ) {

                    console.log ( err.toString().red );
                    return res.send ({ valid: 0, error: err.toString() });
                }

                // odesli vysledek prikazu
                res.send ({ valid: 1});

                // sestav data s infem pro ulozeni do historie prikazu
                var histData = {
                    type: info.type,
                    code: info.code,
                    price: info.price,
                    amount: info.amount,
                    notifyDate: Date.now()
                }

                // uloz prikaz do historie
                ClientHistory.saveEvent ( req.user._id, histData );
            });
        });      
    }

    /**
     * Vytvori hash hesla a saltu
     * @param  {String}   pass heslo
     * @param  {String}   salt salt
     * @param  {Function} cb   Callback funkce
     * @return {String}        hash
     */
    function hash ( pass, salt, cb ) {

        pass = sha1 ( pass+"-"+salt );
        if ( ! cb ) return pass;

        cb ( null, pass );
    }

    /**
     * Prihlasi uzivatele a vytvori mu auth KEY, ktery bude pouzivat k pristupu
     * k apine
     */
    this.login = function ( req, res ) {

        console.log ( "User loging in: " + req.body.user );

        // over existenci uzivatele
        Client.findOne({ email : req.body.user },function(err,user){

            if(err)
                return res.send ( { valid: 3});

            // pokud uzivatel neexistuje, vyhod error
            if(!user)
                return res.send ( { valid: 0});

            // vytvor hash hesla a saltu
            hash( req.body.pass, user.salt, function (err, hash) {

                if (err) { return done(err); }

                // pokud jsou prihlasovaci udaje spravne
                if (hash == user.password) {

                    // vytvor klic pro pristup
                    var salt = randString.generateKey(7);
                    var KEY = String(sha1 ( req.body.pass+"-"+salt ));
                    user._id = String(user._id);

                    // uloz ho do lokalni cache
                    ConnectedClientsByKey[ KEY ] = user._id;
                    if ( ! ( user._id in ConnectedClientsById) ) {

                        // do cache pridej info o uzivatelu
                        ConnectedClientsById[ user._id ] = user;
                        ConnectedClientsById[ user._id ].keys = {};
                        ConnectedClientsById[ user._id ].sockets = {};
                    }
                    
                    // pridej klic do seznamu pouzivanych klicu
                    ConnectedClientsById[ user._id ].keys[ KEY ] = Date.now();
                    
                    // ulozime klic i do DB, aby se nacetl i po restartu
                    ClientConnection( { client: user._id, key: KEY } ).save( function () {});

                    // odesli info o vysledku prihlaseni + pokud OK, priloz i access KEY
                    return res.send ( { valid: 1, key: KEY });
                }
                return res.send ( { valid: 0});
            });
        });
    }

    /**
     * Pri prihlaseni uzivatele se vytvori klic, ktery vezme tato metoda
     * a prida ho do lokalni cache a databaze
     */
    function addConnectionKey ( d, done ) {

        d.key = String( d.key );

        ConnectedClientsByKey[ d.key ] = d.client;

        if ( ! ( d.client in ConnectedClientsById ) ) {

            Client.findOne({ _id : d.client },function(err,user){
                if ( err )
                    console.dir ( err );

                user._id = String( user._id );

                ConnectedClientsById[ user._id ] = user;
                ConnectedClientsById[ user._id ].keys = {};
                ConnectedClientsById[ user._id ].keys[ d.key ] = Date.now();
                ConnectedClientsById[ user._id ].sockets = {};

                done( err );
            });

        } else {

            d.client = String( d.client );
            ConnectedClientsById[ d.client ].keys[ d.key ] = Date.now();

            done( null );
        }
    }

    /**
     * Nacte z databaze klice, ktere pouzivaji klientske aplikace k pristupu
     * nacita klice z posledni hodiny
     */
    function loadConnectedClientsKeys () {

        // nacti klice za poslednich 24 hodin
        ClientConnection.find( { date: { $gt: Date.now() - 1000 * 60 * 60 * 24 }}, function ( err, r ) {

            if ( err )
                return;

            async.forEach ( r, function ( item, done ) {

                addConnectionKey ( item, done );

            }, function ( err ) {

                Events.emit ( "client_api_finished" );
                console.log ( "========= LOADING DONE ========".yellow );
            });
        });
    }

    /**
     * Vrati klienta z cache podle klice
     * @param  {String} key klic
     * @return {Object}     Data o klientovi
     */
    this.getClientByKey = function ( key ) {

        var id = ConnectedClientsByKey[ key ]

        // pokud se jedna o neexistujici klic, vrat false
        if ( ! id )
            return false;

        return ConnectedClientsById[ id ];
    }

    this.getConnectedClientSocketIds = function () {

        return ConnectedClientsBySocketId;
    }

    /**
     * Prida socket klienta do seznamu
     * @param {String} uid Id klienta
     * @param {String} key Socket
     */
    this.addClientSocketKey = function ( uid, socket ) {

        ConnectedClientsById[uid].sockets[socket.id] = socket;
        ConnectedClientsBySocketId[ socket.id ] = uid;
    }

    /**
     * Pri odhlaseni se odstrani socket klienta ze seznamu
     */
    this.removeClientSocketKey = function ( uid, socket ) {

        if ( uid in ConnectedClientsById )
            delete ConnectedClientsById[uid].sockets[ socket.id ];

        console.dir ( ConnectedClientsBySocketId);
        if ( socket.id in ConnectedClientsBySocketId )
            delete ConnectedClientsBySocketId[ socket.id ];
        console.dir ( ConnectedClientsBySocketId);
    }

    /**
     * Prijme a zpracuje prikaz na zruseni rozpracovaneho prodeje / nakupu akcii
     *
     *  ============= NEDODELANE
     */
    this.cancelStockOrder = function ( req, res ) {
        // res.send ("Nedodelane");
    }

    this.getNews = function ( req, res ) {

        res.send ( NEWS_CLIENT.getList () );
    }
    
    this.getStockDetail = function ( req, res ) {

        if ( ! req.params.code || ! ( req.params.code in brokerApi.getStocks () ) )
            return res.send({ error: "unknown_code" });


        console.dir ( req.params.code );
        return res.send( { info: {} });
    }

    /**
     * Metoda obsluhujici odeslani formulare se ztracenym heslem
     */
    this.doLostPass = function ( req, res ) {

        // overime, zda se jedna o existujici email/uzivatele
        Client.findOne( {email: req.body.email}, function ( err, c ) {

            // pokud ne, vyhodime chybu
            if ( ! c )
                return res.render( view_dir+'lost_pass', {layout: layout, email: req.body.email, msg: "Zadaný email není v naší databázi.", title: "Zapomenuté heslo"});

            // vygenerujeme klic pro zmenu hesla
            var code = hash ( randString.generateKey(7) + c._id );

            // data s informacemi o pozadavku na zmenu hesla
            var dataIn = {
                code    : code,
                user_id : c._id,
                ip      : req.connection.remoteAddress
            }

            // vlozime klic do databaze
            ClientLostPwd( dataIn ).save ( function ( err, d ) {

                // pokud selhalo vkladani, vrat chybu
                if ( ! c ) {

                    console.dir ( err );
                    return res.render( view_dir+'lost_pass', {layout: layout, email: req.body.email, msg:"Při práci s databází došlo k chybě", title: "Zapomenuté heslo"});
                }

                // text v emailu
                var text = "Zapomenuté heslo\n"
                +"Na serveru " + req.headers.host + " bylo zažádáno o zaslání postupu na obnovu hesla.\n"
                +"Nové heslo si můžete nastavit na této adrese:\n"
                +"http://"+req.headers.host+"/nove-heslo/"+dataIn.code+"\n"
                +"\n"
                +"Pokud Vám tento email přišel neprávem, prosím ignorujte jej.\n"
                +"\n"
                +"S pozdravem,\n"
                +"team " + req.headers.host + "\n";

                // odeslani zpravy s postupem na email
                nodemailer.sendMail({
                        from: "Info - "+req.headers.host+" <info@"+req.headers.host+">",
                        to: req.body.email,
                        subject: "Nove heslo",
                        text: text
                    }, function ( err ) {

                    if ( err ) {

                        console.dir ( err );
                        return res.render( view_dir+'lost_pass', {layout: layout, email: req.body.email, msg: "Při odesílání emailu došlo k chybě.", title: "Zapomenuté heslo"});
                    }
                    
                    // vyrendruj stranku s vysledkem
                    res.render( view_dir+'lost_pass', {layout: layout, email: req.body.email, info: c, title: "Zapomenuté heslo"});
                 });

            });
        });
    };
    
    this.doRegistration = function ( req, res ) {
        error = {};

        if (! req.form.isValid)
            return res.send({ error: req.form.getErrors() });


        if ( req.form.password !== req.form.password2 )
            error.password = "Hesla se neshodují!";

        
        Client.findOne ( {email: req.form.email}, function ( err, data ) {

            if ( err ) 
                error.alert = "Při registraci došlo k chybě! " + JSON.stringify ( err );

            if ( data )
                error.email = "Tento email již existuje v databázi!";

            if ( Object.keys(error).length )
                return res.send( { error: error });
            
            req.form.salt = randString.generateKey(7);
            req.form.password = hash ( req.form.password, req.form.salt );
            req.form.accountBalance = app.get("config").default_acc_balance;

            new Client ( req.form ).save( function ( err ) {

                if ( err ) 
                    return res.send ( err );

                res.send ( {valid: 1} );
            });
        });
    };

    this.doNewPass = function ( req, res ) {

        ClientLostPwd.findOne ( {code: req.params.code, finished: null }, function ( err, changeRequest ) {

            if ( err ) 
                return res.render(view_dir+'new_pass', {layout: layout, msg: "Chyba při práci s databází.", title: "Nové heslo"});

            if ( ! changeRequest )
                return res.render(view_dir+'new_pass', {layout: layout, msg: "Zadaný kód nebyl nalezen.", title: "Nové heslo"});
            
            // testy na poslana data z formulare
            if ( req.body.pass == "" ) 
                return res.render(view_dir+'new_pass', {layout: layout, msg2: "Obě položky jsou povinné.", title: "Nové heslo"});
            
            if ( req.body.pass != req.body.pass2 ) 
                return res.render(view_dir+'new_pass', {layout: layout, msg2: "Zadaná hesla se neshodují.", title: "Nové heslo"});
            
            // nove heslo a salt
            var newSalt = randString.generateKey(7);
            var newPass = hash ( req.body.pass, newSalt );

            // upravime heslo klienta
            Client.update({ _id: changeRequest.user_id}, { $set: {password: newPass, salt: newSalt }}, function ( err, out ) {

                if ( err )
                    return res.render(view_dir+'new_pass', {layout: layout, msg: "Chyba při práci s databází.", title: "Nové heslo"});

                // oznacime request na zmenu hesla za vyrizeny - tj pouzije se jen jednou
                ClientLostPwd.update( {_id: changeRequest._id}, { $set: { finished: Date.now() }}, function () {});

                // vyrenderujeme stranku s OK hlaskou
                return res.render(view_dir+'new_pass', {layout: layout, info: 1, title: "Nové heslo"});
            });

        });

    };


    // nacte klienty pouzivane klice
    loadConnectedClientsKeys();

    return this;
};

// singleton
ClientApi.instance = null;
module.exports = function ( app ) {

    if ( null === ClientApi.instance ) 
        ClientApi.instance = new ClientApi ( app );

    return ClientApi.instance;
}