var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var OrderSchema = new Schema({
    orderId: { type: String, default: '' },
    type: Number,
	code: String,
	price: Number,
	tradedPrice: { type: Number, default: null },
	priceSumValue: Number,
	amount: Number,
	filledAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    ackDate: { type: Date, default:null },
    invalid: { type: Date, default:null },
	cancelled: { type: Number, default: 0 },
	expired: { type: Number, default: 0 },
});

module.exports = mongoose.model('Order', OrderSchema);

