var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var OrderSchema = new Schema({
    stock_id: { type: String, default: '' },
    type: Number,
	code: String,
	price: Number,
	tradedPrice: { type: Number, default: null },
	priceSumValue: Number,
	amount: Number,
	filledAmount: { type: Number, default: 0 },
  	client: {type: Schema.Types.ObjectId, ref: 'Client' },
    date: { type: Date, default: Date.now },
    ackDate: { type: Date, default:null },
    invalid: { type: Date, default:null }
});

module.exports = mongoose.model('Order', OrderSchema);

