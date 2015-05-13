DELETE FROM trades;
DELETE FROM live_orders;
DELETE FROM archived_orders;
DELETE FROM ownerships;
DELETE FROM brokers WHERE id > 1;
DELETE FROM stocks;
DELETE FROM companies;

ALTER SEQUENCE trades_id_seq RESTART;
ALTER SEQUENCE archived_orders_id_seq RESTART;
ALTER SEQUENCE brokers_id_seq RESTART WITH 2;
ALTER SEQUENCE stocks_id_seq RESTART;
ALTER SEQUENCE companies_id_seq RESTART;


SELECT create_company('Vercotti Inc');

SELECT create_stock(1, '1.1.2014', 1000000, 'VRCT', 'Vercotti A', 100);
SELECT create_stock(1, '1.1.2014', 1000000, 'STO2', 'Stock2', 100);
SELECT create_stock(1, '1.1.2014', 1000000, 'STO3', 'Stock3', 100);
SELECT create_stock(1, '1.1.2014', 1000000, 'STO4', 'Stock4', 100);

SELECT create_broker('Brokerage', 'IUWHDJLEKUFLkkuegLH2IZ8HH8iHkuLIEHFGe');
SELECT create_broker('Broker2', 'blablablablablablablablablablablablaa');

SELECT ask(1, 1, 25, 100); --1
SELECT bid(2, 1, 20, 90);  --2
SELECT ask(1, 1, 10, 92);  --3
SELECT bid(2, 1, 10, 95);  --4
SELECT bid(2, 1, 20, 98);  --5
SELECT ask(1, 1, 15, 98);  --6
SELECT bid(2, 1, 2, 95);   --7

SELECT ask(1, 2, 25, 100); --8
SELECT bid(2, 2, 20, 90);  --9
SELECT ask(1, 2, 10, 92); --10
SELECT bid(2, 2, 10, 95); --11
SELECT bid(2, 2, 20, 98); --12
SELECT ask(1, 2, 15, 98); --13
SELECT bid(2, 2, 2, 95);  --14
SELECT ask(1, 2, 10, 95); --15

SELECT ask(1, 3, 25, 100);--16
SELECT bid(2, 3, 20, 90); --17
SELECT ask(1, 3, 10, 92); --18
SELECT bid(2, 3, 15, 95); --19
SELECT bid(2, 3, 15, 98); --20
SELECT ask(1, 3, 15, 98); --21
SELECT bid(2, 3, 2, 95);  --22
SELECT ask(1, 3, 10, 92); --23

SELECT ask(1, 4, 25, 100);--24
SELECT bid(2, 4, 20, 90); --25
SELECT ask(1, 4, 10, 92); --26
SELECT bid(2, 4, 15, 95); --27
SELECT bid(2, 4, 20, 98); --28
SELECT ask(1, 4, 15, 98); --29
SELECT ask(1, 4, 10, 95); --30

