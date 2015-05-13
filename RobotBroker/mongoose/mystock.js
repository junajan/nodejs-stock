var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var MyStockSchema = new Schema({
	code: String,
	price: Number,
	amount: Number,
	originalAmount: Number,
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MyStock', MyStockSchema);