// The Thread model
 
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
 
var StockListSchema = new Schema({
	ticker: String,
	name: String,
	shares: Number,
	price: Number,
    priceChange: Number,
    old: { type: Number, default: 0 },
    dateInserted: { type: Date, default: Date.now }
});

StockListSchema.statics.markOld = function ( cb ) {
	mongoose.model('StockList').update({}, {$set:{old:1}}, {multi: true}, function(err) { 
		if ( cb )
			cb ( err );
	});
};

StockListSchema.statics.dropOld = function ( cb ) {

	mongoose.model('StockList').remove({old: 1}, function(err) { 
		if ( cb )
			cb ( err );
	});
};


module.exports = mongoose.model('StockList', StockListSchema);