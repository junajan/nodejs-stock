var StockCore = require ("./marketCore" )();
var ObjectId = require('mongojs').ObjectId;

/**
 * REST sluzba pro obsluhu pozadavku na portale marketu
 */
function StockRestApi ( app ) {
	
	// DB vrstva
	var DB = app.get("mongo");
	var STOCK_API = require( "./marketApi")();

	/**
	 * Index file - zobrazi angular aplikaci
	 */
	this.index = function(req, res){

		res.render('app');
		res.end();
	};

	/**
	 * Sluzba na pridani prikazu
	 */
	this.addOrder = function ( req, res ) {

		console.log ( "=================================== ADD ORDER ??? ".red );
		DB.trades.save( req.body, function(err, saved) {
			if( err || !saved ) {

				console.log("Error while saving data.");
				return res.send("ERROR");
			}

			console.log ( "Order saved" );
			res.send("OK");
		});
	}

	/**
	 * Getter na nacteni vsech prikazu na burze
	 * @param  {[type]} req [description]
	 * @param  {[type]} res [description]
	 * @return {[type]}     [description]
	 */
	this.getOrders = function ( req, res ) {

		console.log ( "Reading history" );

		DB.trades.find({}, function(err, data) {
  			if( err ) {

				console.log("Error while reading data.");
				return res.send("ERROR");
			}

			console.log ( "Order loaded" );
			res.send(data);
		});

	}

	/**
	 * Metoda na pridani spolecnosti
	 * @param {Object} req Objekt s requestem
	 * @param {Object} res Objekt s responsem
	 */
	this.addStock = function ( req, res ) {

		// data z formulare
		var data = req.body;
		if ( ! data.price || ! data.name || ! data.code ) 
			return res.send ( { error: "Všechny položky jsou povinné!"} );

		// prevedeme cenu na float
		data.price = parseFloat ( data.price );

		// posleme request na pridani do jadra burzy
		StockCore.addStock ( data, function ( c ) {

			// odesleme vysledek prikazu
			if ( c )
				res.send ( { error: "Při přidávání došlo k chybě."} );
			else
				res.send ( { success: 1});
		});
	}

	/**
	 * Metoda na pridani / upravu brokera
	 * @param {Object} req Objekt s requestem
	 * @param {Object} res Objekt s responsem
	 */
	this.addBroker = function ( req, res ) {

		// data z formulare
		var data = req.body;
		if ( ! data.secret || ! data.name  ) 
			return res.send ( { error: "Všechny položky jsou povinné!"} );

		// data pro insert do databaze
        dataIn = {
            name: data.name,
            secret: data.secret,
            id: 1
        }

        // pokud neni v parametrech codeOld (nejde o update, doplni se vlastni)
        if ( ! data.codeOld )
            data.codeOld = data.code;

        function cbInsert ( err, d ) {

        	// odesleme vysledek prikazu
			if ( err )
				res.send ( { error: "Při přidávání došlo k chybě."} );
			else
				res.send ( { success: 1});
        }
        function cbUpdate ( err, d ) {

        	// odesleme vysledek prikazu
			if ( err )
				res.send ( { error: "Při přidávání došlo k chybě."} );
			else if ( d.updatedExisting )
				res.send ( { success: 1});
			else
				res.send ( { error: "Položka nebyla nalezena v databázi."} );
        }

        if ( data._id && data._id != "" )
        	DB.brokers.update ( { _id:ObjectId( data._id)}, {$set: dataIn}, cbUpdate );
        else
        	DB.brokers.insert ( dataIn, cbInsert );
	}

	/**
	 * Metoda na emisi akcii - emituje dany pocet akcii pro danou spolecnost
	 */
	this.stockEmission = function ( req, res ) {
			
		// data z formulare
		var data = req.body;

		// test, zda jsou nastavene vsechny polozky
		if ( ! data.amount || ! data.code || ! data.price ) 
			return res.send ( { error: "Všechny položky jsou povinné!"} );

		// prevod na pouzivane typy
		data.amount = parseInt( data.amount );
		data.price = parseFloat ( data.price );

		// test, zda je pocet emitovanych akcii vetsi jak 0
		if ( ! data.amount || data.amount < 1 )
			return res.send ( { error: "Vstupní data nemají správný formát!"} );

		// posli do jadra request na emisi akcii
		StockCore.stockEmision ( data, function ( c ) {

			// informuj zpet o vysledku
			if ( c )
				res.send ( { error: "Při zpracování emise došlo k chybě."} );
			else	
				res.send ( { success: 1});
		});
	}

	/**
	 * Metoda na nacteni seznamu spolecnosti
	 */
	this.getStockList = function ( req, res ) {

		res.send ( StockCore.getStockList () );
	}

	/**
	 * Metoda na nacteni detailu jednotlive spolecnosti
	 */
	this.getStockDetail = function ( req, res ) {

		// kod spolecnosti na nacteni
		var code = req.params.code;

		// overi zda je request na existujici spolecnost a vrati data
		if ( code in StockCore.getStockList () )
			return res.send ( StockCore.getStockList ()[code] );

		// v pripade chyby vrati prazdny response
		res.send ( {} );
	}

	this.getBrokerList = function ( req, res ) {

		DB.brokers.find( { id: { $gt: 0}}, function ( err, data ) {

			if ( err )
				return res.send([]);

			var c = STOCK_API.getOnlineBrokers ();
			var online = {};
			if ( c ) for ( i in c )
				online[i] = 1;

			res.send ( { list: data, online: online } );
		});
	}

	this.getBrokerDetail = function ( req, res ) {

		DB.brokers.findOne( { id: { $gt: 0}, id: req.params.id}, function ( err, data ) {

			if ( err )
				return res.send([]);

			console.dir ( data );
			console.log ( "==================== PROMAZAT =============".red );
			res.send ( data );
		});
	}

	/**
	 * [getStockOrders description]
	 * @param  {[type]} req [description]
	 * @param  {[type]} res [description]
	 * @return {[type]}     [description]
	 */
	this.getStockOrders = function ( req, res ) {
		
		res.send ( StockCore.getStockOrders ( req.params.code ) );
	}

    this.getServerInfo = function ( req, res ) {

    	res.send( StockCore.getServerInfo() );
    }

	return this;
}

StockRestApi.instance = null;
module.exports = function ( app ) {
    
    if ( StockRestApi.instance == null ) 
        StockRestApi.instance = new StockRestApi ( app );

    return StockRestApi.instance;
}
