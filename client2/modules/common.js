
exports.createLocals = function ( app ) {
	 
   return function ( req, res, next ) {

      res.locals = {
        req: req,
        res: res,
        brokerConf: app.get("config").broker,
        sess: req.session,
        DIR  : __dirname + "/../",
        ADDR: req.url.replace(/\/*$/, "")+"/"
      };
      next();
   }
}
     
exports.testLogin = function (req, res, next) {

    if ( ! res.login && req.cookies.key ) {
        global.USER.linkLogin ( req.cookies.key, function ( data ) {

            if ( ! data ) 
                res.clearCookie ( "key" );
            else {

                req.session.user = data;
                req.session.user.prihlaseno = true;
                res.locals.login = req.session.user;
            }
           next();
        });
    } else {

       next();
    }
}
    
exports.getDefaultConfig = function () {

    return {
        color       : 3,
        smer_vypisu : 0,
        sysmsg      : 0
    }
}

exports.clearInData = function ( d, fields, useNull ) {

    if ( typeof fields === 'object')
        fields = Object.keys( fields );

    for ( i in d )
        if ( useNull == undefined && d[i] == null )
            delete d[i];

        else if(fields.indexOf(i) == -1)
            delete d[i];

    return d;
}

exports.mergeConfig = function (c1, c2) {

    for ( i in c1 )
        c2[i] = c1[i];

    return c2;
}
