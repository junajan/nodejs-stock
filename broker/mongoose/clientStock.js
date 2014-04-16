var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var ClientStockSchema = new Schema({
	code: String,
	price: Number,
	amount: Number,
	originalAmount: Number,
  	client: {type: Schema.Types.ObjectId, ref: 'Clients' },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ClientStock', ClientStockSchema);