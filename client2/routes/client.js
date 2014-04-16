module.exports = function(app, login) {

	var client = require('../modules/client') ( app );

    // ================================
    // unAuthorized ONLY
    // ================================

    // get requesty
    app.get('/login', login.unAuthenticatedOnly, client.login );
    // app.get('/new-pass/:code', login.unAuthenticatedOnly, client.newPass );
    app.get('/registration', login.unAuthenticatedOnly, client.registration );
    // app.get('/lost-pass', login.unAuthenticatedOnly, client.lostPass );
	app.get('/logout', login.authenticatedOnly, client.logout );

    // post requesty
	app.post('/login', login.authenticate, client.doLogin );
    // app.post('/new-pass/:code', client.doNewPass );
    // app.post('/lost-pass', client.doLostPass );

    // app.post('/registration', form(
    //     field("name", "Jméno")
    //             .trim()
    //             .custom( function(v){ if ( v.length > 12 || v.length < 4 ) throw new Error(); }, "Nick musí mít 4 až 12 znaků")
    //             .is(/^[a-zA-Z0-9]+$/, "Povolené jsou pouze alfanumerické znaky")
    //             .required("", "%s je povinná položka"),
    //     field("email", "Email")
    //             .trim()
    //             .required("", "%s je povinná položka")
    //             .isEmail("%s není validní"),
    //     field("password", "Heslo")
    //             .trim()
    //             .custom( function(v){ if ( v.length < 5 ) throw new Error(); }, "Heslo musí mít  minimáně 5 znaků")
    //             .required("", "%s je povinná položka"),
    //     field("password2", "")
    //             .trim()
    //             .required("", "Zadejte heslo znovu pro kontrolu")

    //     ), client.doRegistration );

	
    // ================================
    // authorized ONLY
    // ================================
	app.get('/', login.authenticatedOnly, client.index);
	app.get('*', login.authenticatedOnly, client.index );
}


