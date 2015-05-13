var mongoose = require('mongoose')
, Schema = mongoose.Schema;

var Events = require("../modules/events");

 
var ClientHistorySchema = new Schema({
    type: Number,
	ticker: String,
	amount: Number,
	price: Number,
	originalOrderId: {type: Schema.Types.ObjectId, ref:'Order', default: null },
  	client: {type: Schema.Types.ObjectId, ref: 'Client' },
    date: { type: Date, default: Date.now },
    notifyDate: { type: Number, default:0 }
});


ClientHistorySchema.statics.saveEvent = function ( uid, info, cb ) {

	if ( ! info.originalOrderId )
		info.originalOrderId = null;

	var data = {
		type: info.type,
		ticker: info.ticker,
		amount: info.amount,
		price: info.price,
		originalOrderId: info.originalOrderId,
		client: uid
	}

	if ( info.notifyDate ) 
		data.notifyDate = info.notifyDate;

	new this( data ).save ( function ( err, res ) {

		Events.emit("clientChange", uid );
		
		if ( cb ) 
			cb ( err, res );
	});
}

ClientHistorySchema.statics.markAsReaded = function ( uid, cb ) {

	this.update({ notifyDate: 0, client: uid }, {$set: { notifyDate: Date.now() }}, { multi: true}, cb );
}


module.exports = mongoose.model('ClientHistory', ClientHistorySchema);

