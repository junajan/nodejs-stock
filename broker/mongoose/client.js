var mongoose = require('mongoose')
, Schema = mongoose.Schema;
 
var ClientSchema = new Schema({
    name: String,
	email: String,
	salt: String,
	lastUsedKey: { type: String, default: null },
	hash: String,
	password: String,
    accountBalance: { type: Number, default: 0 },
    updated: { type: Date, default: Date.now },
    regDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', ClientSchema);