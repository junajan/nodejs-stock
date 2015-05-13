var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var HistorySchema = new Schema({
    type: Number,
	code: String,
	amount: Number,
	price: Number,
    item_id: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    notifyDate: { type: Date, default:null }
});


HistorySchema.statics.saveEvent = function ( info, cb ) {

	var data = {
		type: info.type,
		code: info.code,
		amount: info.amount,
		price: info.price,
		notifyDate: Date.now()
	}

	if ( info.item_id ) 
		data.item_id = info.item_id;
		
	new this( data ).save ( cb );
}

HistorySchema.statics.markAsReaded = function ( cb ) {

	this.update({ notifyDate: null}, {$set: { notifyDate: Date.now() }}, cb );
}


module.exports = mongoose.model('History', HistorySchema);

