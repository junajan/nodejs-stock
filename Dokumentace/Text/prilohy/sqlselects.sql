-- příkaz zavolá proceduru expire_order s parametrem 123
-- a výsledek volání bere jako elementární datový typ
SELECT expire_order(123) as expired;

-- druhá procedura get_unnotified_trades vrací strukturovaná
-- tabulková data a je proto volána jako při čtení z tabulky
SELECT * FROM get_unnotified_trades();



