var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var ClientConnectionSchema = new Schema({
  	client: {type: Schema.Types.ObjectId, ref: 'Client' },
	key: String,
    date: { type: Date, default: Date.now }
});


module.exports = mongoose.model('ClientConnection', ClientConnectionSchema);

