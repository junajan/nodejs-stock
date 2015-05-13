var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
 
var OrderSchema = new Schema({
    stock: { type: Number, default: '' },
    orderId: { type: Number, default: '' },
    ticker: { type: String, default: '' },
    type: Number,
  	price: Number,
  	tradedPrice: { type: Number, default: null },
  	priceSumValue: Number,
  	amount: Number,
  	filledAmount: { type: Number, default: 0 },
  	client: {type: Schema.Types.ObjectId, ref: 'Client' },
    date: { type: Date, default: Date.now },
    ackDate: { type: Date, default:null },
    invalid: { type: Date, default:null },
    cancelOrder: { type: Number, default:0 },
    cancelled: { type: Number, default:0 },
    expired: { type: Number, default:0 },
});

OrderSchema.statics.invalidate = function ( id, cb ) {
     mongoose.model('Order').update({_id: id}, {$set: { invalid: Date.now()}}, function(err, res) {
        if(cb) cb(err, res);
     });
};


OrderSchema.statics.cancel = function ( id, cb ) {
     mongoose.model('Order').update({_id: id}, {$set: {cancelOrder: 1}}, cb);
};


OrderSchema.statics.expire = function ( id, cb ) {
    mongoose.model('Order').update({orderId: id}, {$set: {expired: 1}}, cb);
};


OrderSchema.statics.uncancel = function ( id, cb ) {
     mongoose.model('Order').update({_id: id}, {$set: {cancelOrder: 0}}, function(err, res) {
        if(cb) cb(err, res);
     });
};


module.exports = mongoose.model('Order', OrderSchema);
