// The Thread model
 
var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var StockSchema = new Schema({
	price: Number,
	change: Number,
    date: { type: Date, default: Date.now },
	stock: {type: Schema.Types.ObjectId, ref: 'StockList' }
});

module.exports = mongoose.model('Stock', StockSchema);