DROP TABLE IF EXISTS strikers CASCADE;
DROP TABLE IF EXISTS trade_statistics CASCADE;
DROP TABLE IF EXISTS ownerships CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS archived_orders CASCADE;
DROP TABLE IF EXISTS live_orders CASCADE;
DROP TABLE IF EXISTS order_types CASCADE;
DROP TABLE IF EXISTS brokers CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS companies CASCADE;


-- The table of companies keeps a record of companies of which shares are 
-- traded on the stock exchange.
CREATE TABLE companies (
	id		serial PRIMARY KEY,
	name		varchar(128) NOT NULL UNIQUE
);

-- index: id


-- The table of stocks keeps a record of shares which are 
-- traded on the stock exchange.
CREATE TABLE stocks (
	id		serial PRIMARY KEY,
	company_id	integer REFERENCES companies NOT NULL,
	issued		date NOT NULL,
	shares		integer NOT NULL,
	ticker		varchar(8) NOT NULL UNIQUE,
	name		varchar(128) NOT NULL UNIQUE,
	price		numeric(10, 3) NOT NULL	
);

-- index: id, ticker, [name]


-- The table of brokers keeps a record of autorized dealers to 
-- trade on the stock exchange.
CREATE TABLE brokers (
	id		serial PRIMARY KEY,
	name		varchar(128) NOT NULL UNIQUE,
	token		varchar(128) NOT NULL
	-- login, password, key?
	-- allowed IP to connect from
);

-- index: id, [name]

-- Postgres does not have constants, necessary to use a function returning a constant.
-- Use emitor_id() as ID of virtual emitor broker.
CREATE OR REPLACE FUNCTION emitor_id() RETURNS integer AS $$
	SELECT 1;
$$ LANGUAGE sql IMMUTABLE;

INSERT INTO brokers (id, name, token) VALUES (emitor_id(), 'Emitor', '');
ALTER SEQUENCE brokers_id_seq RESTART WITH 2; -- because 2 = emitor_id() + 1


-- The table of order_types keeps a record of supported types of orders 
-- on the stock exchange.
CREATE TABLE order_types (
	id		integer PRIMARY KEY,
	name		varchar(16) NOT NULL
);

-- index: [id]

-- Postgres does not have constants, necessary to use a function returning a constant.
-- Use buy_limit_type_id() as a 'Buy Limit' order type ID.
CREATE OR REPLACE FUNCTION buy_limit_type_id() RETURNS integer AS $$
	SELECT 1;
$$ LANGUAGE sql IMMUTABLE;

-- Postgres does not have constants, necessary to use a function returning a constant.
-- Use sell_limit_type_id() as a 'Sell Limit' order type ID.
CREATE OR REPLACE FUNCTION sell_limit_type_id() RETURNS integer AS $$
	SELECT 2;
$$ LANGUAGE sql IMMUTABLE;

-- Use buy_type_id() as a 'Buy Limit' order type ID.
CREATE OR REPLACE FUNCTION buy_type_id() RETURNS integer AS $$
	SELECT 1;
$$ LANGUAGE sql IMMUTABLE;

-- Use sell_type_id() as a 'Sell Limit' order type ID.
CREATE OR REPLACE FUNCTION sell_type_id() RETURNS integer AS $$
	SELECT 2;
$$ LANGUAGE sql IMMUTABLE;

-- Fills in the table of order_types with supported types on the stock exchange.
INSERT INTO order_types (id, name) VALUES (buy_type_id(), 'Buy Limit'), (sell_type_id(), 'Sell Limit');


-- The table of archived_orders keeps a record of what the brokers sent.
-- This is not the same thing as what eventually happened. An order,
-- for example, can be executed in more than one trade, for different
-- prices; can be executed only partly, with the rest expiring; etc.
-- The table of trades is what actually happened.
CREATE TABLE archived_orders (
	id		bigserial PRIMARY KEY,
	type_id		integer REFERENCES order_types NOT NULL,
	broker_id	integer REFERENCES brokers NOT NULL,
	stock_id	integer REFERENCES stocks NOT NULL,

	amount		integer NOT NULL,
	price		numeric(10, 3) NOT NULL,	

	received	timestamp with time zone NOT NULL,	-- when we received the order
	cancel_received	timestamp with time zone,	-- when we received broker's cancel request

	-- No more than one of the following 4 columns can be NULL:
	rejected	timestamp with time zone,	-- when we rejected the order
	canceled	timestamp with time zone,	-- when (the last bit of) order was canceled 
	expired		timestamp with time zone,	-- when (the last bit of) order expired
	executed	timestamp with time zone,	-- when (the last bit of) order was executed

	receiving_notified	timestamp with time zone,	-- when we sent broker a confirmation that we had received the order
	completion_notified	timestamp with time zone	-- when we sent broker a confirmation of rejection / cancellation / expiration / execution
);

-- index: id, broker_id, stock_id 
CREATE INDEX archived_orders_broker_id_idx ON archived_orders (broker_id);
CREATE INDEX archived_orders_stock_id_idx ON archived_orders (stock_id);


-- The table of live_orders keeps a record of remaining brokers' orders.
-- When a trade is executed, amount in live_orders is decreased; if the 
-- last bit got executed, that record is removed from live_orders and
-- executed in archived_orders is set.
CREATE TABLE live_orders (
	id		bigint PRIMARY KEY,
	type_id		integer REFERENCES order_types NOT NULL,
	broker_id	integer REFERENCES brokers NOT NULL,
	stock_id	integer REFERENCES stocks NOT NULL,

	amount		integer NOT NULL,
	price		numeric(10, 3) NOT NULL,	
	received	timestamp with time zone NOT NULL	
);

-- index: id, (stock_id, price), broker_id
CREATE INDEX live_orders_stock_id_price_idx ON live_orders (stock_id, price);
CREATE INDEX live_orders_broker_id_idx ON live_orders (broker_id);


-- The table of trades keeps records of all executed trades.
CREATE TABLE trades (
	id		bigserial PRIMARY KEY,
	buy_order_id	bigint REFERENCES archived_orders NOT NULL,
	sell_order_id	bigint REFERENCES archived_orders NOT NULL,
	stock_id	integer REFERENCES stocks NOT NULL,
	buyer_id	integer REFERENCES brokers NOT NULL,
	seller_id	integer REFERENCES brokers NOT NULL,
	amount		integer NOT NULL,
	price		numeric(10, 3) NOT NULL,	
	executed	timestamp with time zone NOT NULL,
	buyer_notified	timestamp with time zone,	-- when we notified the buyer
	seller_notified	timestamp with time zone	-- when we notified the seller
);

-- index: [id], (buy_order_id, sell_order_id), (stock_id, executed)
CREATE UNIQUE INDEX trades_buy_order_id_sell_order_id_idx ON trades (buy_order_id, sell_order_id);
CREATE INDEX trades_stock_id_executed_idx ON trades (stock_id, executed);


-- Input parameter of stored procedure processing trade.
DROP TYPE IF EXISTS t_trade CASCADE;
CREATE TYPE t_trade AS (
	buy_order_id	bigint,
	sell_order_id	bigint,
	stock_id	integer,
	buyer_id	integer,
	seller_id	integer,
	amount		integer,
	price		numeric(10, 3)
);


-- The table of ownerships keeps records of shares hold by brokers.
CREATE TABLE ownerships (
	broker_id	integer REFERENCES brokers NOT NULL,
	stock_id	integer REFERENCES stocks NOT NULL,
	amount		integer NOT NULL,
	PRIMARY KEY (broker_id, stock_id)
);

-- index: [(broker_id, stock_id)]


-- The table of trade_statistics keeps statistics of trades processed
-- within the interval.
CREATE TABLE trade_statistics (
	stock_id	integer REFERENCES stocks NOT NULL,
	interval_from	timestamp with time zone NOT NULL,
	interval_to	timestamp with time zone NOT NULL,
	price		numeric(10, 3) NOT NULL,
	amount		integer NOT NULL,
	volume		numeric(16, 3) NOT NULL,
	PRIMARY KEY (stock_id, interval_from, interval_to)
);

-- index: [(stock_id, interval_from, interval_to)]


-- The table of strikers keeps records of all available Strikers.
CREATE TABLE strikers (
	ip_address	inet,
	port		integer,
	PRIMARY KEY (ip_address, port)
);

-- index: [(ip_address, port)]


----- FUNCTIONS -----


-- COMPANIES --

-- Creates a new company, returns the new ID or zero.
CREATE OR REPLACE FUNCTION create_company(_name varchar) RETURNS integer AS $$
    DECLARE _new_id integer;
    BEGIN
        INSERT INTO companies (id, name) 
            VALUES (DEFAULT, _name)
            RETURNING id INTO _new_id;
        RETURN _new_id;    

	EXCEPTION WHEN OTHERS THEN
	    RETURN 0;
    END;
$$ LANGUAGE plpgsql;

-- Updates company.
CREATE OR REPLACE FUNCTION update_company(_id integer, _name varchar) RETURNS void AS $$
    UPDATE companies c SET name = _name WHERE c.id = _id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_company(_id integer) RETURNS companies AS $$
    SELECT * FROM companies c WHERE c.id = _id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_companies() RETURNS SETOF companies AS $$
    SELECT * FROM companies;
$$ LANGUAGE sql;


-- STOCKS --

-- Creates new stock, i.e. performs an IPO, returns the new ID or zero.
CREATE OR REPLACE FUNCTION create_stock(_company_id integer, _issued date, _shares integer, _ticker varchar, 
		_name varchar, _price numeric) RETURNS integer AS $$
    DECLARE _new_id integer;
    BEGIN
        INSERT INTO stocks (id, company_id, issued, shares, ticker, name, price) 
	    VALUES (DEFAULT, _company_id, _issued, 0, _ticker, _name, _price)
            RETURNING id INTO _new_id;
	PERFORM emit(_new_id, _shares, _price);
        RETURN _new_id;                        

	EXCEPTION WHEN OTHERS THEN
	    RETURN 0;
    END;
$$ LANGUAGE plpgsql;

-- Creates new stock, i.e. performs an IPO, returns the new ID or zero. 
-- Alias for create_stock which is called internally.
CREATE OR REPLACE FUNCTION ipo(_company_id integer, _issued date, _shares integer, _ticker varchar, 
		_name varchar, _price numeric) RETURNS integer AS $$
    SELECT create_stock(_company_id, _issued, _shares, _ticker, _name, _price);
$$ LANGUAGE sql;

-- Emits specified amount of stocks. Stock must exist in stocks table.
CREATE OR REPLACE FUNCTION emit(_stock_id integer, _amount integer , _price numeric) RETURNS void AS $$
    BEGIN
	IF _amount < 0 THEN
	    RAISE EXCEPTION 'Amount must be a positive number.';
        END IF;

        UPDATE stocks s SET shares = (shares + _amount), price = _price WHERE s.id = _stock_id; 
        IF NOT FOUND THEN
	    RAISE EXCEPTION 'Stock ID = % does not exist. Create stock first.', _stock_id;
        END IF;

	IF _amount > 0 THEN
            PERFORM increase_ownership(emitor_id(), _stock_id, _amount);
        END IF;
     END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stock(_id integer) RETURNS stocks AS $$
    SELECT * FROM stocks s WHERE s.id = _id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_stock_price(_id integer) RETURNS numeric AS $$
    SELECT price FROM stocks s WHERE s.id = _id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_stocks() RETURNS SETOF stocks AS $$
    SELECT * FROM stocks;
$$ LANGUAGE sql;


-- BROKERS --

-- Creates a new broker, returns the new ID or zero.
CREATE OR REPLACE FUNCTION create_broker(_name varchar, _token varchar) RETURNS integer AS $$
    DECLARE _new_id integer;
    BEGIN
        INSERT INTO brokers (id, name, token) 
	    VALUES (DEFAULT, _name, _token)
            RETURNING id INTO _new_id;
        RETURN _new_id;                        

	EXCEPTION WHEN OTHERS THEN
	    RETURN 0;
    END;
$$ LANGUAGE plpgsql;

-- Updates broker.
CREATE OR REPLACE FUNCTION update_broker(_id integer, _name varchar, _token varchar) RETURNS void AS $$
    UPDATE brokers b SET name = _name, token = _token WHERE b.id = _id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_broker(_id integer) RETURNS brokers AS $$
    SELECT * FROM brokers b WHERE b.id = _id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_broker_by_name(_name varchar) RETURNS brokers AS $$
    SELECT * FROM brokers b WHERE b.name = _name;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_brokers() RETURNS SETOF brokers AS $$
    SELECT * FROM brokers;
$$ LANGUAGE sql;


-- ORDER TYPES --

CREATE OR REPLACE FUNCTION get_order_type_name(_id integer) RETURNS varchar AS $$
    SELECT ot.name FROM order_types ot WHERE ot.id = _id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_order_types() RETURNS SETOF order_types AS $$
    SELECT * FROM order_types;
$$ LANGUAGE sql;


-- LIVE ORDERS --

-- Creates a new order, returns the new ID or zero.
CREATE OR REPLACE FUNCTION insert_order(_type_id integer, _broker_id integer, _stock_id integer, _amount integer, _price numeric) 
    RETURNS bigint AS $$
    DECLARE _new_id bigint; _now timestamp with time zone;
    BEGIN
        _now := localtimestamp;

        IF _amount <= 0 THEN
	    RAISE EXCEPTION 'Amount must be a positive number!';
	END IF;

        IF _price <= 0 THEN
	    RAISE EXCEPTION 'Price must be a positive number!';
	END IF;

        IF (_type_id = sell_type_id() AND _amount > owned_amount(_broker_id, _stock_id)) THEN
	    RAISE EXCEPTION 'Cannot sell more shares than owned!';
	END IF;

        INSERT INTO archived_orders (id, type_id, broker_id, stock_id, amount, price, received) 
	    VALUES (DEFAULT, _type_id, _broker_id, _stock_id, _amount, _price, _now)
            RETURNING id INTO _new_id;

        INSERT INTO live_orders (id, type_id, broker_id, stock_id, amount, price, received) 
	    VALUES (_new_id, _type_id, _broker_id, _stock_id, _amount, _price, _now);

        RETURN _new_id;                        

	EXCEPTION WHEN OTHERS THEN
	    RETURN 0;
    END;
$$ LANGUAGE plpgsql;

-- Creates a new buy order, returns the new ID or zero.
CREATE OR REPLACE FUNCTION bid(_broker_id integer, _stock_id integer, _amount integer, _price numeric) RETURNS bigint AS $$
    SELECT insert_order(buy_type_id(), _broker_id, _stock_id, _amount, _price);
$$ LANGUAGE sql;

-- Creates a new sell order, returns the new ID or zero.
CREATE OR REPLACE FUNCTION ask(_broker_id integer, _stock_id integer, _amount integer, _price numeric) RETURNS bigint AS $$
    SELECT insert_order(sell_type_id(), _broker_id, _stock_id, _amount, _price);
$$ LANGUAGE sql;


-- Returns the lowest price from active sell orders.
-- Intended for internal use.
CREATE OR REPLACE FUNCTION min_sell_price(_stock_id integer) RETURNS numeric AS $$
    SELECT min(o.price) FROM live_orders o WHERE o.stock_id = _stock_id AND o.type_id = sell_type_id();
$$ LANGUAGE sql;

-- Returns the highest price from active buy orders.
-- Intended for internal use.
CREATE OR REPLACE FUNCTION max_buy_price(_stock_id integer) RETURNS numeric AS $$
    SELECT max(o.price) FROM live_orders o WHERE o.stock_id = _stock_id AND o.type_id = buy_type_id();
$$ LANGUAGE sql;

-- Returns a subset of active buy orders suitable for strike price calculation.
-- Used by strike price calculator.
CREATE OR REPLACE FUNCTION get_crossed_buy_orders(_stock_id integer) RETURNS SETOF live_orders AS $$
    DECLARE _min_price numeric(10, 3);
    BEGIN
	_min_price := min_sell_price(_stock_id);
	IF _min_price IS NOT NULL THEN
	    RETURN QUERY (SELECT * 
		FROM live_orders o
		WHERE o.stock_id = _stock_id AND o.type_id = buy_type_id() AND o.price >= _min_price 
		ORDER BY o.price DESC, o.received ASC);  
	END IF;
    END;
$$ LANGUAGE plpgsql;

-- Returns a subset of active sell orders suitable for strike price calculation.
-- Used by strike price calculator.
CREATE OR REPLACE FUNCTION get_crossed_sell_orders(_stock_id integer) RETURNS SETOF live_orders AS $$
    DECLARE _max_price numeric(10, 3);
    BEGIN
	_max_price := max_buy_price(_stock_id);
	IF _max_price IS NOT NULL THEN
	    RETURN QUERY (SELECT * 
		FROM live_orders o
		WHERE o.stock_id = _stock_id AND o.type_id = sell_type_id() AND o.price <= _max_price 
		ORDER BY o.price ASC, o.received ASC);  
	END IF;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_active_order(_id integer) RETURNS live_orders AS $$
    SELECT * FROM live_orders o WHERE o.id = _id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_active_orders() RETURNS SETOF live_orders AS $$
    SELECT * FROM live_orders;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_active_orders(_stock_id integer) RETURNS SETOF live_orders AS $$
    SELECT * FROM live_orders o
	WHERE o.stock_id = _stock_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_active_buy_orders(_stock_id integer) RETURNS SETOF live_orders AS $$
    SELECT * FROM live_orders o
	WHERE o.stock_id = _stock_id AND o.type_id = buy_type_id() 
	ORDER BY o.price DESC, o.received;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_active_sell_orders(_stock_id integer) RETURNS SETOF live_orders AS $$
    SELECT * FROM live_orders o
	WHERE o.stock_id = _stock_id AND o.type_id = sell_type_id() 
	ORDER BY o.price, o.received;  
$$ LANGUAGE sql;

-- Returns orders have been received before _seconds seconds or earlier.
CREATE OR REPLACE FUNCTION get_old_active_orders(_seconds integer) RETURNS SETOF live_orders AS $$
    SELECT * FROM live_orders o
	WHERE o.received < localtimestamp - (_seconds * interval '1 second') AND o.broker_id <> emitor_id();
$$ LANGUAGE sql;


-- ARCHIVED ORDERS -- 

CREATE OR REPLACE FUNCTION get_all_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.stock_id = _stock_id AND o.received BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_rejected_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.stock_id = _stock_id AND o.rejected IS NOT NULL AND o.received BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_canceled_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.stock_id = _stock_id AND o.canceled IS NOT NULL AND o.received BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_expired_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.stock_id = _stock_id AND o.expired IS NOT NULL AND o.received BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_executed_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.stock_id = _stock_id AND o.executed IS NOT NULL AND o.received BETWEEN _from AND _to;  
$$ LANGUAGE sql;


-- Returns orders which are to be canceled.
CREATE OR REPLACE FUNCTION get_uncanceled_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.cancel_received IS NOT NULL AND canceled IS NULL;  
$$ LANGUAGE sql;

-- Returns orders which have been received but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_receiving_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.receiving_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders which have already been canceled but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_canceled_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.canceled IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders which have already been expired but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_expired_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.expired IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders which have already been rejected but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_rejected_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.rejected IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders which have already been executed but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_executed_orders() RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.executed IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;


-- Returns orders of specified Broker which are to be canceled.
CREATE OR REPLACE FUNCTION get_uncanceled_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.cancel_received IS NOT NULL AND canceled IS NULL;  
$$ LANGUAGE sql;

-- Returns orders of specified Broker which have been received but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_receiving_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.receiving_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders of specified Broker which have already been canceled but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_canceled_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.canceled IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders of specified Broker which have already been expired but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_expired_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.expired IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders of specified Broker which have already been rejected but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_rejected_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.rejected IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;

-- Returns orders of specified Broker which have already been executed but the Broker has not been notified yet.
CREATE OR REPLACE FUNCTION get_unnotified_executed_orders(_broker_id int) RETURNS SETOF archived_orders AS $$
    SELECT * FROM archived_orders o
	WHERE o.broker_id = _broker_id AND o.executed IS NOT NULL AND o.completion_notified IS NULL;  
$$ LANGUAGE sql;


-- Returns whether specified order has been executed.
CREATE OR REPLACE FUNCTION is_executed_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.executed FROM archived_orders o WHERE o.id = _order_id) IS NOT NULL; 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been canceled.
CREATE OR REPLACE FUNCTION is_canceled_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.canceled FROM archived_orders o WHERE o.id = _order_id) IS NOT NULL; 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been expired.
CREATE OR REPLACE FUNCTION is_expired_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.expired FROM archived_orders o WHERE o.id = _order_id) IS NOT NULL; 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been rejected.
CREATE OR REPLACE FUNCTION is_rejected_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.rejected FROM archived_orders o WHERE o.id = _order_id) IS NOT NULL; 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been completed (executed, canceled, expired or rejected).
CREATE OR REPLACE FUNCTION is_completed_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN is_executed_order(_order_id) OR is_canceled_order(_order_id) OR is_expired_order(_order_id) OR is_rejected_order(_order_id); 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been executed and not yet notified.
CREATE OR REPLACE FUNCTION is_unnotified_executed_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.executed FROM archived_orders o WHERE o.id = _order_id AND o.completion_notified IS NULL) IS NOT NULL; 
    END;
$$ LANGUAGE plpgsql;

-- Returns whether specified order has been completed and not yet notified.
CREATE OR REPLACE FUNCTION is_unnotified_completed_order(_order_id int) RETURNS boolean AS $$
    BEGIN
	RETURN (SELECT o.id FROM archived_orders o WHERE o.id = _order_id AND o.completion_notified IS NULL) IS NOT NULL
		AND is_completed_order(_order_id); 
    END;
$$ LANGUAGE plpgsql;

-- Fills in receiving_notified with a current time stamp. This means that the Broker has been informed
-- about receiving the order.
CREATE OR REPLACE FUNCTION set_order_receiving_notified(_order_id bigint) RETURNS void AS $$
    UPDATE archived_orders o SET receiving_notified = localtimestamp
	WHERE o.id = _order_id;  
$$ LANGUAGE sql;

-- Fills in completion_notified with a current time stamp. This means that the Broker has been informed
-- about completing the order (the order has been: a) executed, b) rejected, c) canceled, or d) expired).
CREATE OR REPLACE FUNCTION set_order_completion_notified(_order_id bigint) RETURNS void AS $$
    UPDATE archived_orders o SET completion_notified = localtimestamp
	WHERE o.id = _order_id;  
$$ LANGUAGE sql;

-- Fills in cancel_received with a current time stamp. This means that the Market has received
-- a command to cancel the order. Returns remaining number of stocks which has not been traded yet.
CREATE OR REPLACE FUNCTION set_cancel_order_received(_order_id bigint) RETURNS integer AS $$
    UPDATE archived_orders ao SET cancel_received = localtimestamp
	WHERE ao.id = _order_id;
    SELECT lo.amount FROM live_orders lo WHERE lo.id = _order_id;  
$$ LANGUAGE sql;

-- Deletes the specified order from live_orders and fills in canceled field in archived_orders
-- with a current time stamp. Returns remaining number of stocks which has not been traded yet.
CREATE OR REPLACE FUNCTION cancel_order(_order_id bigint) RETURNS integer AS $$
    UPDATE archived_orders ao SET canceled = localtimestamp
	WHERE ao.id = _order_id;
    DELETE FROM live_orders lo WHERE lo.id = _order_id
	RETURNING lo.amount;  
$$ LANGUAGE sql;

-- Deletes the specified order from live_orders and fills in rejected field in archived_orders
-- with a current time stamp. Returns remaining number of stocks which has not been traded yet.
CREATE OR REPLACE FUNCTION reject_order(_order_id bigint) RETURNS integer AS $$
    UPDATE archived_orders ao SET rejected = localtimestamp
	WHERE ao.id = _order_id;
    DELETE FROM live_orders lo WHERE lo.id = _order_id
	RETURNING lo.amount;
$$ LANGUAGE sql;

-- Deletes the specified order from live_orders and fills in expired field in archived_orders
-- with a current time stamp. Returns remaining number of stocks which has not been traded yet.
CREATE OR REPLACE FUNCTION expire_order(_order_id bigint) RETURNS integer AS $$
    UPDATE archived_orders ao SET expired = localtimestamp 
	WHERE ao.id = _order_id;
    DELETE FROM live_orders lo WHERE lo.id = _order_id
	RETURNING lo.amount;  
$$ LANGUAGE sql;


-- TRADES --

-- Executes given trades. Inserts into trades table and updates live_orders, 
-- archived_orders and stocks tables.
CREATE OR REPLACE FUNCTION process_trades(_trade_array  t_trade[]) RETURNS timestamp with time zone AS $$ 
    DECLARE
        _trade t_trade;
	_now timestamp with time zone;
    BEGIN
	_now := localtimestamp;

        FOREACH _trade IN ARRAY _trade_array
        LOOP
	    -- insert trade
            INSERT INTO trades (id, buy_order_id, sell_order_id, stock_id, buyer_id, seller_id, amount, price, executed) 
	        VALUES (DEFAULT, _trade.buy_order_id, _trade.sell_order_id, _trade.stock_id, _trade.buyer_id, _trade.seller_id, 
			_trade.amount, _trade.price, _now);

	    -- update buy order
	    PERFORM update_order(_trade.buy_order_id, _trade.amount, _now);

	    -- update buy order
	    PERFORM update_order(_trade.sell_order_id, _trade.amount, _now);

	    -- update ownerships
	    IF _trade.buyer_id <> _trade.seller_id THEN
		PERFORM increase_ownership(_trade.buyer_id, _trade.stock_id, _trade.amount);
		PERFORM decrease_ownership(_trade.seller_id, _trade.stock_id, _trade.amount);
            END IF;

        END LOOP;

	-- update stock price
	IF _trade IS NOT NULL THEN
	    UPDATE stocks s SET price = _trade.price WHERE s.id = _trade.stock_id;
	END IF;

	RETURN _now;
    END;
$$ LANGUAGE plpgsql;

-- Auxiliary method updating live_orders and archived_orders tables, 
-- called by process_trades(t_trade[]).
CREATE OR REPLACE FUNCTION update_order(_order_id bigint, _amount integer, _now timestamp with time zone) RETURNS void AS $$ 
    DECLARE
	_order_amount integer;
    BEGIN
	_order_amount := (SELECT lo.amount FROM live_orders lo WHERE lo.id = _order_id);
	IF _order_amount = _amount THEN
	    DELETE FROM live_orders lo WHERE lo.id = _order_id;
	    UPDATE archived_orders ao SET executed = _now WHERE ao.id = _order_id;
	ELSIF _order_amount > _amount THEN
	    UPDATE live_orders lo SET amount = (_order_amount - _amount) WHERE lo.id = _order_id;
	ELSE
	    RAISE EXCEPTION '_order_amount < _trade.amount! Order Id = %', _order_id;
	END IF;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_trade(_id integer) RETURNS trades AS $$
    SELECT * FROM trades t 
	WHERE t.id = _id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_trade(_buy_order_id bigint, _sell_order_id bigint) RETURNS trades AS $$
    SELECT * FROM trades t 
	WHERE t.buy_order_id = _buy_order_id AND t.sell_order_id = _sell_order_id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_trades() RETURNS SETOF trades AS $$
    SELECT * FROM trades t;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_trades(_from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trades AS $$
    SELECT * FROM trades t 
	WHERE t.executed BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_stock_trades(_stock_id integer) RETURNS SETOF trades AS $$
    SELECT * FROM trades t 
	WHERE t.stock_id = _stock_id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_stock_trades(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trades AS $$
    SELECT * FROM trades t
	WHERE t.stock_id = _stock_id AND t.executed BETWEEN _from AND _to;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_broker_trades(_broker_id integer) RETURNS SETOF trades AS $$
    SELECT * FROM trades t
	WHERE t.buyer_id = _broker_id OR t.seller_id = _broker_id;  
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_broker_trades(_broker_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trades AS $$
    SELECT * FROM trades t
	WHERE (t.buyer_id = _broker_id OR t.seller_id = _broker_id) AND t.executed BETWEEN _from AND _to;  
$$ LANGUAGE sql;

-- Fills in buyer_notified of specified trade with a current time stamp. It means that the buyer has been 
-- informed about the trade.
CREATE OR REPLACE FUNCTION set_trade_buyer_notified(_trade_id bigint) RETURNS void AS $$
    UPDATE trades t SET buyer_notified = localtimestamp
	WHERE t.id = _trade_id;  
$$ LANGUAGE sql;

-- Fills in seller_notified of specified trade with a current time stamp. It means that the seller has been 
-- informed about the trade.
CREATE OR REPLACE FUNCTION set_trade_seller_notified(_trade_id bigint) RETURNS void AS $$
    UPDATE trades t SET seller_notified = localtimestamp
	WHERE t.id = _trade_id;  
$$ LANGUAGE sql;

-- Fills in buyer_notified of specified trade with a current time stamp. It means that the buyer has been 
-- informed about the trade.
CREATE OR REPLACE FUNCTION set_trade_buyer_notified(_buy_order_id bigint, _sell_order_id bigint) RETURNS void AS $$
    UPDATE trades t SET buyer_notified = localtimestamp
	WHERE t.buy_order_id = _buy_order_id AND t.sell_order_id = _sell_order_id;  
$$ LANGUAGE sql;

-- Fills in seller_notified of specified trade with a current time stamp. It means that the seller has been 
-- informed about the trade.
CREATE OR REPLACE FUNCTION set_trade_seller_notified(_buy_order_id bigint, _sell_order_id bigint) RETURNS void AS $$
    UPDATE trades t SET seller_notified = localtimestamp
	WHERE t.buy_order_id = _buy_order_id AND t.sell_order_id = _sell_order_id;  
$$ LANGUAGE sql;

-- Vrací uzavřené obchody, o nichž nebyla informována alespoň jedna z obchodujících stran.
CREATE OR REPLACE FUNCTION get_unnotified_trades() RETURNS SETOF trades AS $$
    SELECT * FROM trades t
	WHERE t.buyer_notified IS NULL OR t.seller_notified IS NULL;  
$$ LANGUAGE sql;


-- OWNERSHIPS --

-- Increases ownership of specified amount of shares.
CREATE OR REPLACE FUNCTION increase_ownership(_broker_id integer, _stock_id integer, _amount integer) RETURNS integer AS $$
    DECLARE
	_current_amount integer;
    BEGIN
	_current_amount := (SELECT o.amount FROM ownerships o WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id);
 
        IF _amount <= 0 THEN
	    RAISE EXCEPTION 'Amount must be a positive number!';
	END IF;

	IF _current_amount IS NULL THEN 
	    _current_amount = 0; 
	    INSERT INTO ownerships (broker_id, stock_id, amount) VALUES (_broker_id, _stock_id, _amount);
	ELSE
	    UPDATE ownerships o SET amount = (amount + _amount) WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id;
	END IF;

	RETURN _current_amount + _amount;
    END;
$$ LANGUAGE plpgsql;

-- Decreases ownership of specified amount of shares.
CREATE OR REPLACE FUNCTION decrease_ownership(_broker_id integer, _stock_id integer, _amount integer) RETURNS integer AS $$
    DECLARE
	_current_amount integer;
    BEGIN
	_current_amount := (SELECT o.amount FROM ownerships o WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id);

        IF _amount <= 0 THEN
	    RAISE EXCEPTION 'Amount must be a positive number!';
	END IF;
 
	IF _current_amount = _amount THEN 
	    DELETE FROM ownerships o WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id;
	ELSIF _current_amount > _amount THEN 
	    UPDATE ownerships o SET amount = (amount - _amount) WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id;
	ELSE
	    RAISE EXCEPTION 'Ownership must be a positive number!';
	END IF;

	RETURN _current_amount - _amount;
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION owned_amount(_broker_id integer, _stock_id integer) RETURNS integer AS $$
    SELECT COALESCE(max(o.amount), 0) FROM ownerships o WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_ownership(_broker_id integer, _stock_id integer) RETURNS ownerships AS $$
    SELECT * FROM ownerships o WHERE o.broker_id = _broker_id AND o.stock_id = _stock_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_ownerships(_broker_id integer) RETURNS SETOF ownerships AS $$
    SELECT * FROM ownerships o WHERE o.broker_id = _broker_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_ownerships() RETURNS SETOF ownerships AS $$
    SELECT * FROM ownerships;
$$ LANGUAGE sql;


-- TRADE STATISTICS --

-- Calculates trade statistics for the specified stock and interval.
CREATE OR REPLACE FUNCTION calculate_statistics(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS void AS $$ 
    DECLARE
	_last_execution timestamp with time zone;
	_last_price numeric(10, 3);
	_amount integer;
	_volume numeric(16, 3);
    BEGIN
	_last_execution := (SELECT max(t.executed) FROM trades t WHERE t.stock_id = _stock_id AND t.executed < _to);
	_last_price := (SELECT t.price FROM trades t WHERE t.stock_id = _stock_id AND t.executed = _last_execution GROUP BY t.price);
	_amount := (SELECT sum(t.amount) FROM trades t WHERE t.stock_id = _stock_id AND t.executed BETWEEN _from AND _to);
	_volume := (SELECT sum(t.price * t.amount) FROM trades t WHERE t.stock_id = _stock_id AND t.executed BETWEEN _from AND _to);

	IF _amount IS NULL THEN 
	    _amount = 0; 
	END IF;
	
	IF _volume IS NULL THEN 
	    _volume = 0; 
	END IF;
	
	INSERT INTO trade_statistics (stock_id, interval_from, interval_to, price, amount, volume)
	    VALUES (_stock_id, _from, _to, _last_price, _amount, _volume);
    END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_statistics(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trade_statistics AS $$
    SELECT * FROM trade_statistics ts
	WHERE ts.stock_id = _stock_id AND ts.interval_from >= _from AND ts.interval_to <= _to;
$$ LANGUAGE sql;


-- STRIKERS --

CREATE OR REPLACE FUNCTION register_striker(_ip_address inet, _port integer) RETURNS void AS $$ 
    INSERT INTO strikers (ip_address, port) SELECT _ip_address, _port
	WHERE NOT EXISTS (SELECT 1 FROM strikers s WHERE s.ip_address = _ip_address AND s.port = _port);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION unregister_striker(_ip_address inet, _port integer) RETURNS void AS $$ 
    DELETE FROM strikers s WHERE s.ip_address = _ip_address AND s.port = _port;
$$ LANGUAGE sql;


CREATE OR REPLACE FUNCTION get_strikers() RETURNS SETOF strikers AS $$ 
    SELECT * FROM strikers;
$$ LANGUAGE sql;
