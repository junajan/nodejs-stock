var colors = require("colors");
var log = require("./log")(true, true, "NewsClient");
var _ = require("underscore");
var request = require("request")

var Events = require("./events");

var loadNewsInterval = 10000;
var maxNewsCount = 5;

function NewsClient(app) {
	NEWS_CLIENT = this;
	var newsSource = app.get("config").news_source

	newsList = [];
	var lastLink = "";

	function loadNews() {

		if (newsList.length)
			lastLink = newsList[0].link;

		request({
			url: newsSource,
			json: true
		}, function(error, response, body) {

			if (error || response.statusCode != 200)
				return log.error("Chyba pri nacitani zprav.");

			var items, i, info;
			for (i in body.value.items) {

				// pro kazdy clanek vyber hlavni polozky a uloz do seznamu
				item = body.value.items[i];
				// console.dir ( item );
				info = {
					title: item.title,
					link: item.link,
					text: item.description,
					date: item["y:published"].utime
				}

				// pokud uz tento clanek v seznamu mame -> prerus nacitani
				if (info.link == lastLink)
					break;

				newsList.unshift(info);

				// pokud pocet nactenych clanku presahne 20 ukonci nacitani
				if (i > maxNewsCount)
					break;
			}


			if (newsList.length > maxNewsCount)
				newsList.splice(maxNewsCount, Number.MAX_VALUE);

		});
	}

	this.getList = function() {

		return newsList;
	}

	// setInterval( loadNews, loadNewsInterval );
	loadNews();
	return this;
}

NewsClient.instance = null;
module.exports = function(app) {

	if (NewsClient.instance == null)
		NewsClient.instance = new NewsClient(app);

	return NewsClient.instance;
}