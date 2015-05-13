var log = require("./modules/Log")("WorkerServer", true, true);
var net = require('net');

/**
 * This will handle connection to workers
 */
var WorkerList = function WorkerList(app) {
    var self = this;
    var workers = [];
    var activeWorkers = [];
    var Worker = require("./dao/worker.js")(app);
    var _config = app.get("config").core.workers;
    
    // Worker state
    var S_CONNECTING    = 5;
    var S_RECONNECTING  = 4;
    var S_ERROR         = 3;
    var S_DISCONNECTED  = 2;
    var S_CONNECTED     = 1;
    var S_INIT          = 0;

    /**
     * Load workers from DB and connect to them
     */
    this.loadWorkers = function() {
        log.event("Nacitam seznam workeru");

        Worker.findAll(self.processNewWorkers);
    };
    
    /**
     * Process loaded workers from DB
     */
    this.processNewWorkers = function(err, list) {
        var workersCount = 0;

        // for each worker try, if it is already in list
        list.forEach(function(item) {
            // go throught current list
            for(var i = 0; i < workers.length; i++) {
                
                // and dont them if they are already there
                if(item.port == workers[i].port && item.ip_address == workers[i].ip_address)
                    return;
            }
            // if not, add them to list
            workersCount++;
            self.addWorkerToList(item);
        });

        // if there are newly added workers, connect to them
        if(workersCount)
            self.connectNewWorkers();
    };

    /**
     * This will connect newly added workers
     */
    this.connectNewWorkers = function() {
        // go throught all workers
        workers.forEach(function(item) {

            // and if we haven't tried to connect to them connect them now
            if(! item.connectAttempts)
                self.connectWorker(item);
        });
    };

    /**
     * This will add worker to active list
     */
    this.addWorkerToActiveList = function(item)  {
        activeWorkers.push(item);
    };

    /**
     * This will remove worker from active list
     */
    this.removeWorkerFromActiveList = function(item)  {

        for(var i = 0; i < activeWorkers.length; i++) {
            if(item.port == activeWorkers[i].port && item.ip_address == activeWorkers[i].ip_address) {
                activeWorkers.splice(i, 1);
            }
        }
    };

    /**
     * This will remove worker from active list, main list and DB
     */
    this.removeWorker = function(item) {
        self.removeWorkerFromActiveList(item);

        for(var i = 0; i < workers.length; i++) {
            if(item.port == workers[i].port && item.ip_address == workers[i].ip_address) {
                workers.splice(i, 1);
            }
        }

        // remove from DB
        Worker.remove(item.ip_address, item.port);
    };

    /**
     * This will schedule worker reconnect attempt with some timeout
     */
    this.scheduleNextConnectAttempt = function(worker) {
        log.event("Scheduling worker reconnect in "+_config.connectAttemptTimeout+"ms");
        worker.state = S_RECONNECTING;
        worker.socket.setTimeout(_config.connectAttemptTimeout, function() {
            self.connectWorker(worker);
        });
    };

    /**
     * This will connect one selected worker
     */
    this.connectWorker = function(worker) {
        
        // increase connect attempts
        worker.connectAttempts++;

        // if we tried to connect to him, throw away old socket
        if(worker.socket)
            delete worker.socket;

        // create new one
        worker.socket = new net.Socket();
        
        log.event("Connecting to worker: "+worker.ip_address+":"+worker.port+ " attempt n. "+ worker.connectAttempts);
    
        // add error handler which will reconnect or remove worker from list        
        worker.socket.on('error', function(err) {
            log.error("Worker error", err.code);
            
            // set worker state to error
            worker.state = S_ERROR;
            // remove him from active workers
            self.removeWorkerFromActiveList(worker);

            // if we could not connect, try it again in some timeout but only MAX_CONNECT_ATTEMPTS times
            if(err.code == 'ECONNREFUSED' && worker.connectAttempts < _config.maxConnectAttempts)
                self.scheduleNextConnectAttempt(worker);
            else
                // else remove him from list and from DB
                self.removeWorker(worker);
        });

        // when worker close connection
        worker.socket.on('end', function() {
            log.error("Worker just ended");
            // set his state to ended
            worker.state = S_DISCONNECTED;
            // remove him from active list
            self.removeWorkerFromActiveList(worker);

            // and try to reconnect
            self.scheduleNextConnectAttempt(worker);
        });

        worker.state = 5;
        // try to connect
        worker.socket.connect({port: worker.port, host: worker.ip_address}, function() {
            console.log("Worker connected and running on: ", worker.ip_address+":"+worker.port);
            worker.connectAttempts = 1;
            worker.state = S_CONNECTED;

            self.addWorkerToActiveList(worker);
        });
    };

    /**
     * This will add worker to general list and set its attributes to default
     */
    this.addWorkerToList = function(worker) {
        worker.connectAttempts = 0;
        worker.state = S_INIT;
        worker.counting = true;
        worker.processedCount = 0;
        worker.connectedDate = (new Date()).getTime();

        workers.push(worker);
    };

    /**
     * This will return all active workers which can be used to process stocks
     */
    this.getWorkers = function() {
        return activeWorkers;
    };

    /**
     * This will return all workers
     */
    this.getAllWorkers = function() {
        return workers;
    };

    if(_config.refreshWorkersInterval > 0)
        setInterval(self.loadWorkers, _config.refreshWorkersInterval);


    // init list
    self.loadWorkers();
    return this;
};

var instance = null;
module.exports = function(app) {

    if (instance === null)
        instance = new WorkerList(app);
    return instance;
};
