// The Thread model
 
var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var StockSchema = new Schema({
	name 	  : String,
	data 	  : String,
    date_edit : { type: Date, default: Date.now }
});

module.exports = mongoose.model('settings', StockSchema);