// The Thread model
 
var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var StockListSchema = new Schema({
    name: { type: String, unique: true},
    active: Boolean,
});

module.exports = mongoose.model('StockList', StockListSchema);