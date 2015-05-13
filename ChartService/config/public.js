
var path = require('path');
var expressLayouts = require('express-ejs-layouts');
var engine = require('ejs-locals');
var bodyParser = require('body-parser');


var config = {
	development: {
		db: {
			collections	: ["stockHistory", "stocks"],
			url: "stock_history"
		},
		cacheSize: 60 * 60 * 2,
		livereload: true,
		market: {
			address: 'localhost',
			port: 5555,
			connectInterval: 1000,
			auth: {
				name: "ChartService",
				secret: "history_password",
			}
		}
	},
	production: {
		db: {
			collections	: ["stockHistory", "stocks"],
			url: "stock_history"
		},
		cacheSize: 60 * 60 * 2,
		livereload: false,
		market: {
			address: 'localhost',
			port: 5555,
			connectInterval: 1000,
			auth: {
				name: "ChartService",
				secret: "history_password",
			}
		}
	}
};

module.exports = function(express, app, root_path) {
    

	if (!~(Object.keys(config).indexOf(app.get('env')))) {
		console.log("Bad environment! Must be one of:", Object.keys(config));
		process.exit(1);
	}

	app.engine('ejs', engine);
	
	app.use(express.static(path.join(root_path, 'public')));
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());
   
	// all environments
	app.set('port', process.env.PORT || 5400);
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout');
	
	app.use(expressLayouts);

	app.set ( "config", config[app.get("env")] );
};
