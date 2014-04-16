var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var ClientHistorySchema = new Schema({
    type: Number,
	code: String,
	amount: Number,
	price: Number,
  	client: {type: Schema.Types.ObjectId, ref: 'Client' },
    date: { type: Date, default: Date.now },
    notifyDate: { type: Number, default:0 }
});


ClientHistorySchema.statics.saveEvent = function ( uid, info, cb ) {

	var data = {
		type: info.type,
		code: info.code,
		amount: info.amount,
		price: info.price,
		client: uid
	}

	if ( info.notifyDate ) 
		data.notifyDate = info.notifyDate;

	new this( data ).save ( cb );
}

ClientHistorySchema.statics.markAsReaded = function ( uid, cb ) {

	this.update({ notifyDate: 0, client: uid }, {$set: { notifyDate: Date.now() }}, { multi: true}, cb );
}


module.exports = mongoose.model('ClientHistory', ClientHistorySchema);

