function map() {
	this.price = parseFloat(this.price);
	
	// predpripravena struktura pro grupovani
	var out = [
		parseFloat(this.volume),
		this.price,	// open price
		this.price,	// high price
		this.price,	// low price
		this.price,	// close price
		parseInt(this.time), // startTime
		parseInt(this.time) // endTime
	];

	// bude se grupovat podle tickeru a casu v danem intervalu (1000ms)
	var key = {
		time: parseInt(this.time / interval) * interval, // interval in seconds
		ticker: this.ticker
	};
	emit(key, out);
};


function reduce(key, val) {
	
	// pokud pole hodnot obsahuje vice polozek, zgrupuji se
	if(val.length > 1) {
		for(var i = 1; i < val.length; i++ ) {
			// porovnava se vzdy druhy az posledni prvek s prvnim,
			// kam se zapisuje prubezny vysledek
			
			val[0][0] += val[i][0];						// volume
			val[0][3] = Math.min(val[0][3], val[i][3]); // low price
			val[0][2] = Math.max(val[0][2], val[i][2]); // high price

			// jestlize je porovnavany prvek starsi
			// nastavi se jeho cas jako startTime pro dalsi porovnani
			// a jeho cena bude open price vysledku
			if(val[0][6] > val[i][6]) {
				val[0][6] = val[i][6];
				val[0][1] = val[i][1];
			}

			// jestlize je porovnavany prvek mladsi
			// nastavi se jeho cas jako endTime pro dalsi porovnani
			// a jeho cena bude close price vysledku
			if(val[0][5] < val[i][5]) {
				val[0][5] = val[i][5];
				val[0][4] = val[i][4];
			}
		}
	}

	return val[0];
};


function aggregateDataInDb() {

	var params = {
		out: "history_sec_1",
		scope: {
			interval:  1000 // promenna v map funkci pro 
							// agregaci po sekundach 
		},
		query: {
			time: {
				$gt: dateFrom // datum od ktereho se budou zaznamy nacitat
			}
		}
	};
	
	DB.stock_history.mapReduce(map,reduce,params, function(err, res) {
		DB.collection(res.collectionName).find({}).sort({ '_id.time': 1 }, function(err, res) {

			console.log(res);
		});
	});
};

/**
 * Read aggregated data from database
 */
self.readAggregationFromDb = function(res, done) {
	if (!res.collectionName) return done('Aggregation failed');
	
};