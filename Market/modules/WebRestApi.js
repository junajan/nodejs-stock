var async = require('async');
var log = require("../modules/Log")("WebRestApi", true, false);

/**
 * REST sluzba pro obsluhu pozadavku na portale marketu
 */
var WebRestApi = function(app) {

	var MarketCore = require("./MarketCore")(app);
	// var History = require("../dao/history")(app);
	var Broker = require("../dao/broker")(app);
	var Stock = require("../dao/stock")(app);
	var Workers = require("../workerServer")(null);
	var StockList = require("./StockList")(app);
	var MarketApi = require("./MarketApi")(app);

	/**
	 * Index file - zobrazi angular aplikaci
	 */
	this.index = function(req, res) {

		res.render('app', {conf_charts: app.get("config").charts});
		res.end();
	};

	/**
	 * Error404 - posle not found error a 404 kod
	 */
	this.stockErro404Api = function(req, res) {

		res.send({error: "not_found"}, 404);
	};

	/**
	 * Funkce odesle error na klientsky pozadavek
	 */
	function sendError(res, err) {

		res.send({error: err});
	}

	/**
	 * Metoda na pridani spolecnosti
	 * @param {Object} req Objekt s requestem
	 * @param {Object} res Objekt s responsem
	 */
	this.addStock = function(req, res) {
		function onResult(err, dbRes) {

			// odesleme vysledek prikazu
			if (err) {
				return sendError(res, "Při práci s databází došlo k chybě.");
			} else {
				// reload stocklist 
				StockList.readStocks();
				return res.send({success: 1});
			}
		}

		// data z formulare
		var data = req.body;
		if (!data.price || !data.name || !data.ticker)
			return sendError(res, "Všechny položky jsou povinné!");
		// prevedeme cenu na float
		data.price = parseFloat(data.price);
		if(data.id) {
			Stock.updateSock (data.id, data, onResult);
		} else {

			Stock.addCompany(data.name, function(err, res) {
				if(err)
					return onResult(err);

				data.companyId = res[0].create_company;
		        if(!data.companyId)
		        	return onResult(true, false);
		        
				Stock.addStock(data, function(err, res) {
					onResult(err, res);
				});
			});
		}
	};

	/**
	 * Metoda na pridani / upravu brokera
	 * @param {Object} req Objekt s requestem
	 * @param {Object} res Objekt s responsem
	 */
	this.addBroker = function(req, res) {
		function handleResult(err, dbRes) {
			// odesleme vysledek prikazu
			if (err)
				return sendError(res, "Při práci s databází došlo k chybě.");
			else
				return res.send({success: 1});
		}

		// data z formulare
		var data = req.body;
		if (!data.token || !data.name)
			return sendError(res, "Všechny položky jsou povinné!");

		// data pro insert do databaze
		var n = {
			name: data.name,
			token: data.token
		};

		if (data.id)
			Broker.update(data.id, n, handleResult);
		else
			Broker.insert(n, handleResult);
	};

	/**
	 * Metoda na emisi akcii - emituje dany pocet akcii pro danou spolecnost
	 */
	this.stockEmission = function(req, res) {

		// data z formulare
		var data = req.body;

		// test, zda jsou nastavene vsechny polozky
		if (!data.amount || !data.stockId || !data.price)
			return sendError(res, "Všechny položky jsou povinné!");

		// prevod na pouzivane typy
		data.amount = parseInt(data.amount);
		data.price = parseFloat(data.price);

		// test, zda je pocet emitovanych akcii vetsi jak 0
		if (data.amount < 1 || data.price < 1)
			return sendError(res, "Vstupní data nemají správný formát!");

        StockList.emit(data, function(err) {
            if(err)
                return sendError(res, "Při emitování akcií došlo k chybě!");
            return res.send({success: 1});
        });
	};

	/**
	 * Metoda na nacteni seznamu spolecnosti
	 */
	this.getStockList = function(req, res) {
		res.send( StockList.getList() || {} );
	};

	/**
	 * Metoda na nacteni seznamu pripojenych workeru
	 */
	this.getWorkers = function(req, res) {
		var stocks = Workers.getAllWorkers();
		var out = [];

		stocks.forEach(function(item, index) {
			out.push({
				address: item.ip_address,
				state: item.state,
				connectAttempts: item.connectAttempts,
				port: item.port,
				counting: item.counting,
				processedCount: item.processedCount,
				connectedDate: item.connectedDate
			});
		});

		res.send(out);
	};

	/**
	 * Metoda na nacteni seznamu pripojenych workeru
	 */
	this.refreshWorkers = function(req, res) {
		Workers.loadWorkers();
		res.send("ok");
	};

	/**
	 * Metoda na nacteni detailu jednotlive spolecnosti
	 */
	this.getStockDetail = function(req, res) {

		// kod spolecnosti na nacteni
		var code = req.params.code;

		// overi zda je request na existujici spolecnost a vrati data
		res.send({info: StockList.getStockByCode(code)});
	};

	/**
	 * Vrati seznam brokeru spolu se seznamem online
	 */
	this.getBrokerList = function(req, res) {
		Broker.findAll(function (err, data) {
			res.send({
				list: data,
				online: Object.keys(MarketApi.getOnlineBrokers()),
			});
		});
	};

	/**
	 * Vrati detail brokera
	 */
	this.getBrokerDetail = function(req, res) {
		function getInfo(done) {
			Broker.find(req.params.id, function(err, res) {
				if(err)
					return done(err, {});
				return done(err, res[0]);
			});
		}

		function getStocks(done, data) {

			if (data.info)
				return Broker.getBrokerStocks(req.params.id, done);
			return done(true, null);
		}

		function getOnlineStatus(done) {

			done(null, !!MarketApi.getOnlineBrokers()[req.params.id]);
		}

		async.auto({
			info: getInfo,
			status: getOnlineStatus,
			ownedStocks: ["info", getStocks],
		}, function(err, data) {
			data.stocks = StockList.getList() || {};
			res.send(data);
		});
	};

	/**
	 * [getStockOrders description]
	 * @param  {[type]} req [description]
	 * @param  {[type]} res [description]
	 * @return {[type]}	 [description]
	 */
	this.getStockOrders = function(req, res) {
		Stock.getOrders(req.params.id, function(err, data) {
			res.send(data);
		});
	};

	/**
	 * Vrati obecne info o serveru
	 */
	this.getServerInfo = function(req, res) {
		function getServerConfig(done) {

			done(null, app.get("config"));
		}

		function getOnlineBrokersCount(done) {

			return done(null, Object.keys(MarketApi.getOnlineBrokers()).length);
		}

		function getOnlineWorkers(done) {
			
			var out = {
				count: 0,
				active: 0
			};

			Workers.getAllWorkers().forEach(function(item) {
				out.count++;
				if(item.state == 1)
					out.active++;
			});
			done(null, out);
		}

		async.auto({
			info: MarketCore.getServerInfo,
			brokersCount: Broker.getCount,
			config: getServerConfig,
			online: getOnlineBrokersCount,
			workers: getOnlineWorkers,
		}, function(err, out) {
			res.send(out);
		});
	};

	/**
	 * Vrati historii eventu
	 */
	this.getHistory = function(req, res) {

		// async.auto({
		// 	history: History.getHistory,
		// 	brokers: Broker.findAll
		// }, function(err, d) {

		// 	if (err) throw (err);
		// 	res.send(d);
		// });
	};

	return this;
};

WebRestApi.instance = null;
module.exports = function(app) {

	if (WebRestApi.instance === null)
		WebRestApi.instance = new WebRestApi(app);

	return WebRestApi.instance;
};
