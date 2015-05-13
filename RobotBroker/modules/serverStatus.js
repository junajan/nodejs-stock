
ServerStatus = function () {

	var data = {};

	this.set = function ( ind, val ) {

		data[ind] = val;
	}

	this.get = function ( ind ) {

		return data[ind];
	}

	this.getData = function () {

		return data;
	}

	this.flush = function () {

		data = {};
	}

	return this;
};

ServerStatus.instance = null;

module.exports = function( server, io ){
	
    if( ServerStatus.instance === null ){
        ServerStatus.instance = new ServerStatus( server, io );
    }
    return ServerStatus.instance;
}


