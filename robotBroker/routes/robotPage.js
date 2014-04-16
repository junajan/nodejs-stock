module.exports = function(app) {
    
	// vyrenderujeme stranku s angular aplikaci (ta uz si poresi routovani sama)
	app.get("*", function (req, res ) {
        res.render('app', {layout: "layout.ejs" });
	});
}
