﻿-- 1
SELECT process_trades((ARRAY[$$(5, 3, 1, 2, 1, 10, 98.000)$$, $$(5, 6, 1, 2, 1, 10, 98.000)$$])::t_trade[]);

-- 2
SELECT process_trades((ARRAY[$$(12, 10, 2, 2, 1, 10, 95.000)$$, $$(12, 15, 2, 2, 1, 10, 95.000)$$])::t_trade[]);

-- 3
SELECT process_trades((ARRAY[$$(20, 18, 3, 2, 1, 10, 95.000)$$, $$(20, 23, 3, 2, 1, 5, 95.000)$$, $$(19, 23, 3, 2, 1, 5, 95.000)$$])::t_trade[]); 

-- 4
SELECT process_trades((ARRAY[$$(28, 26, 4, 2, 1, 10, 96.500)$$, $$(28, 30, 4, 2, 1, 10, 96.500)$$])::t_trade[]);

