var colors = require("colors");
var async =  require("async");
var Events = require("./Events");
var log = require ( "../modules/Log")(true, true);

var HistoryService = function HistoryService(app, StockList) {
	var self = this;
	var DB = app.get("DB");
	
	// vyznam polozek v jednom agregovanem zaznamu
	var I_VOLUME = 0;
	var I_OPEN  = 1;
	var I_HIGH  = 2;
	var I_LOW   = 3;
	var I_CLOSE = 4;
	var I_TIME  = 5;

	var CACHE_SIZE = app.get("config").cacheSize; // how many items will be in cache
	self.inited = false;

	// array with aggregated data
	self.historyCache = {
		data: {}
	};
	
	/**
	 * Function will return hist data for given ticker
	 *  if parametr dateFrom is setted, it will return only items from this date
	 */
	self.getChartData = function ( ticker, dateFrom ) {
		var len, out, data;

		if(!StockList.getStockByTicker(ticker))
			return false;

		if(!self.inited)
			return {data: [], endTime: 0};
		
		dateFrom = dateFrom || 0;
		data = out = self.historyCache.data[ticker];
		len = data.length;

		if (dateFrom && len) {

			// if last item in array is younger than requested => we dont have data
			if ( data[len-1][I_TIME] < dateFrom )
				out = [];

			if ( data[len-1][I_TIME] >= dateFrom ) {

				// find first item in array for client
				for (var i=len - 1; i >= 0; i--) {
					if (dateFrom >= data[i][I_TIME])
						break;
				}

				out = data.slice(i+1);
			}
		}

		return {
			endTime: (out.length) ? out[out.length-1][I_TIME] : 0,
			data: out
		};
	};

	/**
	 * This will get tick records from DB
	 */
	var map = function() {
		this.price = parseFloat(this.price);
		// get one result from tick record
		var out = [
			parseFloat(this.volume),
			this.price,	// open
			this.price,	// high
			this.price,	// low
			this.price,	// close
			parseInt(this.time), // startTime
			parseInt(this.time) // endTime
		];

		// group him based on this key (ticker and granularity)
		var key = {
			time: parseInt(this.time / interval) * interval, // interval in seconds
			ticker: this.ticker
		};
		emit(key, out);
	};

	/**
	 * Reduce tick records and build aggregation result
	 */
	var reduce = function(key, val) {
		
		if(val.length > 1) {
			for(var i = 1; i < val.length; i++ ) {

				val[0][0] += val[i][0];						// volume
				val[0][3] = Math.min(val[0][3], val[i][3]); // low price
				val[0][2] = Math.max(val[0][2], val[i][2]); // high price

				// if 
				if(val[0][6] > val[i][6]) {
					val[0][6] = val[i][6];
					val[0][1] = val[i][1];
				}

				// if item is younger, set his price
				if(val[0][5] < val[i][5]) {
					val[0][5] = val[i][5];
					val[0][4] = val[i][4];
				}
			}
		}

		return val[0];
	};
	/**
	 * Call MongoDB mapReduce function to get aggregated result
	 */
	self.createAggregationInDb = function(done) {
		var dateTo = ((new Date()).getTime());
		var dateFrom = dateTo - CACHE_SIZE * 1000;

		log.event("Reading aggregated data from "+Date(dateFrom) + " to "+Date(dateTo));

		var params = {
			out: "history_sec_1",
			scope: {
				interval:  1000 // group results by second
			},
			query: {
				time: {
					$gt: dateFrom
				}
			}
		};

		DB.stockHistory.mapReduce(map,reduce,params, done);
	};

	/**
	 * Read aggregated data from database
	 */
	self.readAggregationFromDb = function(res, done) {
		if (!res.collectionName) return done('Aggregation failed');
		DB.collection(res.collectionName).find({}).sort({ '_id.time': 1 }, done);
	};

	/**
	 * Insert new item to cache under given ticker
	 */
	self.insertToCache = function(item, ticker) {
		if(!(ticker in self.historyCache.data))
			self.historyCache.data[ticker] = [];
		self.historyCache.data[ticker].push(item);
	};

	/**
	 * This will postprocess aggregated data and insert them to cache
	 */
	self.processAggregatedResult = function(res, done) {
		res.forEach(function(item) {
			item.value.splice(6,1); // remove sixth index - stop time
			item.value[I_TIME] = item._id.time;
			self.insertToCache(item.value, item._id.ticker);
		});

		done ( null );
	};

	/**
	 * This will remove entries from cache so there will be
	 * only CACHE_SIZE items in array
	 */
	self.removeOldData = function() {

		Object.keys(self.historyCache.data).forEach(function(ticker) {
			var len = self.historyCache.data[ticker].length;
			if ( len > CACHE_SIZE ) {

				self.historyCache.data[ticker].splice (0, len - CACHE_SIZE);
			}
		});
	};

	/**
	 * This will add new items to aggregated list
	 */
	self.insertToCacheAggregated = function(item) {
		if(!(item.ticker in self.historyCache.data)) {
			self.historyCache.data[item.ticker] = [];
		}
		
		var histData = self.historyCache.data[item.ticker];
		item.time = parseInt(item.time / 1000) * 1000;

		if ( histData.length ) {
			var last = histData[ histData.length - 1 ];
			
			if ( last[I_TIME] == item.time ) {

				last[I_HIGH] = Math.max(item.price, last.h);
				last[I_LOW] = Math.min(item.price, last.l);
				last[I_CLOSE] = last.price;
				last[I_VOLUME] += item.volume;
				return;
			}

			// there are missing some data
			if ( last[I_TIME] + 1000 < item.time ) {

				for (var t = last[I_TIME] + 1000; t < item.time; t += 1000 ) {
					var n = JSON.parse(JSON.stringify(last));
					n[I_TIME] = t;
					n[I_OPEN] = n[I_HIGH] = n[I_LOW] = n[I_CLOSE];
					n[I_VOLUME] = 0;
					histData.push(n);
				}
			}
		}
		histData.push([item.volume, item.price, item.price, item.price, item.price, item.time]);
	};

	self.insertStockListToCache = function(list) {
		list.forEach(self.insertToCacheAggregated);
		self.removeOldData();
	};

	/**
	 * This will load aggregated data for all stock items
	 */
	self.readAggregatedDataForStocks = function(list, done) {

		log.message("Reading aggregated data for: ", Object.keys(list).join(", "));
		console.time("Aggregation end");

		async.waterfall ([
			self.createAggregationInDb,
			self.readAggregationFromDb,
			self.processAggregatedResult
		], function(err, res) {
			if(err && err.errmsg != 'ns doesn\'t exist')
				console.dir(err);

			console.timeEnd("Aggregation end");
			done(null);
		});
	};

	/**
	 * Init history service
	 */
	self.init = function(ev) {

		self.readAggregatedDataForStocks(StockList.getList(), function() {
			// listen on stock refresh event
			self.inited = true;
			Events.on("stockListRefresh", self.insertStockListToCache);
		});
	};

	// when stock list is inited, load aggregated data for each stock
	if(StockList.inited) self.init(null);
	Events.on("StockListInited", self.init);
	return this;
};


HistoryService.instance = null;
module.exports = function (app, StockList) {
	
	if (HistoryService.instance === null)
		HistoryService.instance = new HistoryService(app, StockList);

	return HistoryService.instance;
};

