/**
 * Create local variables which will be passed to views
 */
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
   };
};
