var colors = require("colors");
var async = require("async");
var log = require("../modules/Log")("OrderMatching", true, true);
var net = require('net');

var OrderMatching = function OrderMatching(app) {

    var self = this;
    this.idleWorkers = [];

    this.processStock = function(stock, done) {
        log.message("Processing " + stock.ticker + " ("+stock.id+") with price: " + stock.price);

        // get free worker
        var worker = self.idleWorkers.shift();

        worker.counting = true;
        worker.processedCount++;
        // =============================================
        // ==== Add socket listeners first
        // =============================================
        
        function returnResult(err, data) {
            removeListeners();
            data.info.volume = data.info.totalAmount;
            done(err, data);
        }

        function handleData(data) {
            var jsonData = {};

            try {
                jsonData = JSON.parse(data.toString());
            } catch (e) {
                return done(1, {});
            }
            
            worker.counting = false;
            // unltil we have some login here
            self.idleWorkers.push(worker);
            return returnResult(null, jsonData);
        }

        function handleError(res) {
            log.error('Worker '+ worker.name+' has quit');
            
            worker.counting = false;
            // return worker back to pool
            self.idleWorkers.push(worker);
            
            // and continue to next stock
            returnResult(worker, null);
        }

        function removeListeners() {

            worker.socket.removeListener('data', handleData);
            worker.socket.removeListener('close', handleError);
            worker.socket.removeListener('error', handleError);
        }

        worker.socket.on('data', handleData);
        worker.socket.on('close', handleError);
        worker.socket.on('error', handleError);

        // start worker on given stock ID
        worker.socket.write(stock.id.toString());
    };

    /**
     * If there is no worker - return empty result
     */
    this.getEmptyResult = function(stockList) {

        var defaultResult = [];

        stockList.forEach(function(item) {
            defaultResult.push({
                info: {
                    stockId: item.id,
                    price: item.price,
                    volume: 0,
                    strikeTime: (new Date()).getTime(),
                },
                trades: []
            });
        });

        return defaultResult;
    };

    /**
     * This function will process all items from stock list - for each
     * it will send to free worker and grab the result
     */
    this.process = function(stockList, workers, done) {
        // register all workers as free
        self.idleWorkers = workers;
        
        if(! workers.length) {
            // log.error("There are no workers to process orders");

            return done(null, self.getEmptyResult(stockList));
        }

        // log.event("Starting order matching with "+ workers.length + " workers");
        // in every moment process only as much stocks as we have workers
        async.mapLimit(stockList, workers.length, self.processStock, done);
    };
    return this;
};

OrderMatching.instance = null;
module.exports = function(app) {

    if (OrderMatching.instance === null)
        OrderMatching.instance = new OrderMatching(app);

    return OrderMatching.instance;
};
