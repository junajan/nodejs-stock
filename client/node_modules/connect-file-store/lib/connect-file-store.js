/**
 * Connect File Store
 * Copyright(c) 2013 jKey Lu <jkeylu@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var path = require('path')
  , util = require('util')
  , fs = require('fs')
  , crypto = require('crypto')
  , debug = require('debug')('connect:FileStore');

/**
 * Return the `FileStore` extending `connect`'s session Store.
 * 
 * @param {object} connect
 * @return {Function}
 * @api public
 */
module.exports = function (connect) {

  /**
   * Connect's Store.
   */
  var Store = connect.session.Store;

  /**
   * Initialize FileStore with given `opts`.
   *
   * @param {Object} opts Options.
   * @api public
   */
  function FileStore (opts) {
    opts = opts || {};
    Store.call(this, opts);

    // define default session store directory
    this.prefix = opts.prefix || 'file-store-';

    this.path = opts.path || process.env.TMPDIR || process.env.TEMP || '/tmp';
    // ensure specified path exists
    if (!fs.existsSync(this.path)) {
      throw new Error('Path ' + this.path + ' does not exist!');
    }

    this.useAsync = opts.useAsync;

    this.filePattern = new RegExp('^' + this.prefix + '.*');
    this.count = 0;

    // set default reapInterval to 10 minutes
    this.reapInterval = opts.reapInterval || 600000;
    this.maxAge = opts.maxAge || 600000 * 3;

    // interval for reaping stale sessions
    if (this.reapInterval !== -1) {
      setInterval(function (self) {
        self.reap(self.maxAge);
      }, this.reapInterval, this);
    }

  }

  util.inherits(FileStore, Store);

  /**
   * Reap sessions older than `ms` milliseconds.
   *
   * @param {Number} ms Milliseconds threshold.
   * @api private
   */
  FileStore.prototype.reap = function (ms) {
    var self = this // store 'this' object
      , threshold = + new Date() - ms
      , val, filePath;

    debug('start reap');

    // TODO AV : check the files we are reading match the prefix and are not directories

    fs.readdir(self.path, function (err, files) {
      if (files.length <= 0) {
        return;
      }

      files.forEach(function (f, i) {
        if (!self.filePattern.exec(f)) {
          return;
        }

        filePath = path.join(self.path, f);
        fs.readFile(filePath, function (err, data) {
          if (err) {
            return;
          }

          val = JSON.parse(data);
          if (val.__lastAccess < threshold) {
            debug('deleting ' + filePath);
            fs.unlink(filePath);
          }
        });

      });
    });
  };

  /**
   * Attemp to fetch session by the given `sid`.
   *
   * @param {String} sid Session ID.
   * @param {Function} fn Function, that called after get.
   * @api public
   */
  FileStore.prototype.get = function(sid, fn) {
    var serial = this.count++ //Math.round(Math.random()*1000);
      , fileName = this.prefix + crypto.createHash('md5').update(sid).digest('hex')
      , filePath = path.join(this.path, fileName);

    fn = fn || function () {};

    if (!this.useAsync) {
      if (fs.existsSync(filePath)) {
        var data = fs.readFileSync(filePath);
        debug(serial + ' get sync OK [' + fileName + ']' + data + '.');
        fn(null, JSON.parse(data));

      } else {
        debug(serial + ' get sync FAIL [' + fileName + '] - no data found');
        fn();
      }

      return;
    }

    debug(serial + ' get [' + fileName + ']');

    fs.exists(filePath, function (exists) {
      if (exists) {
        fs.readFile(filePath, function (err, data) {
          if (err || data.length <= 0) {
            debug(serial + ' get FAIL [' + fileName + '] - no data found');
            fn();

          } else {
            debug(serial + ' get OK [' + fileName + ']' + data + '.');
            fn(null, JSON.parse(data));
          }
        });

      } else {
        debug(serial + ' get FAIL [' + fileName + '] not exists');
        fn();
      }

    });
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid Session ID.
   * @param {Session} sess Session values.
   * @param {Function} fn Function, that called after set.
   * @api public
   */
  FileStore.prototype.set = function (sid, sess, fn) {
    var serial = this.count++ //Math.round(Math.random()*1000);
      , fileName = this.prefix + crypto.createHash('md5').update(sid).digest('hex')
      , filePath = path.join(this.path, fileName);

    sess.__lastAccess = + new Date();
    var content = JSON.stringify(sess);

    debug(serial + ' set [' + fileName + '] = ' + content);

    if (!this.useAsync) {
      fs.writeFileSync(filePath, content);

      debug(serial + ' set sync OK [' + filePath + '] = ' + content);

      fn && fn();
      return;
    }

    fs.writeFile(filePath, content, function (err) {
      if (err) {
        debug(serial + 'set err ' + err);
      }

      debug(serial + ' set OK [' + filePath + '] = ' + content);

      fn && fn();
    });
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid Session ID.
   * @param {Function} fn Function, that called after value delete.
   * @api public
   */
  FileStore.prototype.destroy = function (sid, fn) {
    var fileName = this.prefix + crypto.createHash('md5').update(sid).digest('hex')
      , filePath = path.join(this.path, fileName)
      , fn = fn || function () {};
 
    fs.exists(filePath, function (exists) {
      if (exists) {
        fs.unlink(filePath, function (err, data) {
          fn();
        });

      } else {
        fn();
      }

    });
  };

  /**
   * Invoke the given callback `fn` with all active sessions.
   * Method wasn't tested!
   *
   * @param {Function} fn Function that applyed to all active sessions.
   * @api public
   */
  FileStore.prototype.all = function (fn) {
    var self = this
      , result = [];

    fn = fn || function () {};
 
    fs.readdir(self.path, function (err, files) {
      if (files.length <= 0) {
        fn(null, result);
        return;
      }

      files.forEach(function (f, i) {
        if (self.filePattern.exec(f)) {
          fs.readFile(path.join(self.path, f), function (err, data) {
            if (err == null && data) {
              result.push(JSON.parse(data));
            }

            if (i >= files.length - 1) {
              fn(null, result);
            }
          });

        } else {
          if (i >= files.length - 1) {
            fn(null, result);
          }
        }

      });
    });
  };

  /**
   * Clear all sessions.
   *
   * @param {Function} fn Function, that calls after removing all sessions.
   * @api public
   */
  FileStore.prototype.clear = function (fn) {
    var self = this // store 'this' object
      , filePath;

    fn = fn || function () {};
    
    fs.readdir(self.path, function (err, files) {
      if (files.length <= 0) {
        fn();
        return;
      }

      files.forEach(function(f, i) {
        filePath = path.join(self.path, f);
 
        if(self.filePattern.exec(f)) {
          // debug('deleting ' + filePath );
          fs.unlink(filePath, function (err) {
            if (i >= files.length - 1) {
              fn();
            }
          });

        } else {
          if(i >= files.length - 1) {
            fn();
          }
        }

      });
    });
 
  };

  /**
   * Fetch number of sessions.
   *
   * @param {Function} fn Function, that accepts number of sessions.
   * @api public
   */
  FileStore.prototype.length = function (fn) {
    var self = this
      , result = []
      , result = 0;

    fn = fn || function () {};

    fs.readdir(self.path, function (err, files) {
      files.forEach(function (f) {
        if (self.filePattern.exec(f)) {
          result++;
        }
      })

      fn(null, result);
    });
  };

  return FileStore;

};

