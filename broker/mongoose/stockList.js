// The Thread model
 
var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var StockListSchema = new Schema({
	code: String,
	name: String,
	amount: Number,
	price: Number,
    priceChange: Number,
    amountOrdersItemsBuy: Number,
    amountOrdersItemsSell: Number,
    amountOrdersBuy: Number,
    amountOrdersSell: Number,
    bestSellPrice: Number,
    old: { type: Number, default: 0 },
    bestBuyPrice: Number,
    dateInserted: { type: Date, default: Date.now }
});


StockListSchema.statics.markOld = function ( cb ) {

	this.update({}, {$set:{old:1}}, {multi: true}, function(err) { 
		if ( cb )
			cb ( err );
	});
}


StockListSchema.statics.dropOld = function ( cb ) {

	this.remove({old: 1}, function(err) { 
		if ( cb )
			cb ( err );
	});
}


module.exports = mongoose.model('StockList', StockListSchema);