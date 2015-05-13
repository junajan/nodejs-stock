create_company(_name varchar) RETURNS integer
-- Vytvoří společnost, která na burze může mít akcie

create_stock(_company_id integer, _issued date, _shares integer, _ticker varchar, _name varchar, _price numeric) RETURNS integer
-- Vytvoří záznam o akciích pro danou společnost

emit(_stock_id integer, _amount integer , _price numeric) RETURNS void
-- Emituje akcie

emitor_id() RETURNS integer
-- Vrací ID emitujícího brokera - v současné verzi je emitentem pouze jeden pevně stanovený broker

create_broker(_name varchar, _token varchar) RETURNS integer
-- Vytvoří brokera

get_brokers() RETURNS SETOF brokers
-- Vrátí seznam všech brokerů

buy_type_id() RETURNS integer
-- Vrací id typu pro nákupní příkaz

sell_type_id() RETURNS integer
-- Vrací id typu pro prodejní příkaz

insert_order(_type_id integer, _broker_id integer, _stock_id integer, _amount integer, _price numeric) 
-- Vloží do systému nový obchodní příkaz

bid(_broker_id integer, _stock_id integer, _amount integer, _price numeric) RETURNS bigint
-- Vloží do systému nový nákupní příkaz

ask(_broker_id integer, _stock_id integer, _amount integer, _price numeric) RETURNS bigint
-- Vloží do systému nový prodejní příkaz

min_sell_price(_stock_id integer) RETURNS numeric
-- Vrací minimální nabízenou cenu za prodej pro danou akcii

max_buy_price(_stock_id integer) RETURNS numeric
-- Vrací maximální nabízenou cenu za nákup pro danou akcii

get_crossed_buy_orders(_stock_id integer) RETURNS SETOF live_orders
-- Vrací nákupní příkazy, které se cenou překrývají s prodejními

get_crossed_sell_orders(_stock_id integer) RETURNS SETOF live_orders
-- Vrací prodejní příkazy, které se cenou překrývají s nákupními

process_trades(_trade_array  t_trade[]) RETURNS timestamp with time zone 
-- Zpracuje zobchodované příkazy

update_order(_order_id bigint, _amount integer, _now timestamp with time zone) RETURNS void 
-- Upravý obchodní příkaz

calculate_statistics(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS void 
-- Spočítá statistická data

get_stock(_id integer) RETURNS stocks
-- Vrátí akcii podle její ID

get_stock_price(_id integer) RETURNS numeric
-- Vrátí cenu akcie podle její ID

get_stocks() RETURNS SETOF stocks
-- Vrátí seznam všech akcií

get_stocks_id() RETURNS SETOF integer
-- Vrátí ID všech akcií

get_active_order(_id integer) RETURNS live_orders
-- Vrací obchodní příkaz pro danou akcii, který nebyl ještě vyřízen

get_active_orders() RETURNS SETOF live_orders
-- Vrátí seznam všech obchodních příkazů, které nebyly ještě vyřízené

get_active_orders(_stock_id integer) RETURNS SETOF live_orders
-- Vrací obchodní příkazy pro danou akcii, které nebyly ještě vyřízené

get_active_buy_orders(_stock_id integer) RETURNS SETOF live_orders
-- Vrací nákupní obchodní příkazy pro danou akcii, které nebyly ještě vyřízené

get_active_sell_orders(_stock_id integer) RETURNS SETOF live_orders
-- Vrací prodejní obchodní příkazy pro danou akcii, které nebyly ještě vyřízené

get_old_active_orders(_seconds integer) RETURNS SETOF live_orders
-- Vrací obchodní příkazy, které byly zadané před X sekundami

get_all_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders
-- Vrací seznam všech obchodních příkazů pro danou akcii v zadaném časovém horizontu

get_rejected_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders
-- Vrací seznam všech zamítnutých obchodních příkazů pro danou akcii v zadaném časovém horizontu

get_canceled_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders
-- Vrací seznam všech zrušených obchodních příkazů pro danou akcii v zadaném časovém horizontu

get_expired_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders
-- Vrací seznam všech expirovaných obchodních příkazů pro danou akcii v zadaném časovém horizontu

get_executed_orders(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF archived_orders
-- Vrací seznam všech zpracovaných obchodních příkazů pro danou akcii v zadaném časovém horizontu

get_uncanceled_orders() RETURNS SETOF archived_orders
-- Vrací seznam všech nezrušených obchodních příkazů

get_unnotified_receiving_orders() RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných přijatých obchodních příkazů

get_unnotified_canceled_orders() RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných zrušených obchodních příkazů

get_unnotified_expired_orders() RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných expirovaných obchodních příkazů

get_unnotified_rejected_orders() RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných zamítnutých obchodních příkazů

get_uncanceled_orders(_broker_id int) RETURNS SETOF archived_orders
-- Vrací seznam všech nezrušených obchodních příkazů pro daného brokera

get_unnotified_receiving_orders(_broker_id int) RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných přijatých obchodních příkazů pro daného brokera

get_unnotified_canceled_orders(_broker_id int) RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných zrušených obchodních příkazů pro daného brokera

get_unnotified_expired_orders(_broker_id int) RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných expirovaných obchodních příkazů pro daného brokera

get_unnotified_rejected_orders(_broker_id int) RETURNS SETOF archived_orders
-- Vrací seznam všech nenotifikovaných zamítnutých obchodních příkazů pro daného brokera

get_unnotified_trades() RETURNS SETOF trades
-- Vrátí nenotifikované obchody, u kterých nebyla upozorněna alespoň jedna strana (seller/buyer)

set_order_receiving_notified(_order_id bigint) RETURNS void
-- Nastavý přijetí obchodního příkazu za notifikované brokerovi

set_order_completion_notified(_order_id bigint) RETURNS void
-- Nastavý dokončení obchodního příkazu za notifikované brokerovi

set_cancel_order_received(_order_id bigint) RETURNS integer
-- Přidá k obchodnímu příkazu příznak na zrušení

cancel_order(_order_id bigint) RETURNS integer
-- Označí obchodní příkaz za zrušený - vymaže ho z live orders

reject_order(_order_id bigint) RETURNS integer
-- Zamítne obchodní příkaz - vymaže ho z live orders

expire_order(_order_id bigint) RETURNS integer
-- Vyexpiruje obchodní příkaz - vymaže ho z live orders

get_trades(_stock_id integer) RETURNS SETOF trades
-- Vrátí seznam provedených obchodů pro danou akcii

get_trades(_stock_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trades
-- Vrátí seznam provedených obchodů pro danou akcii v daném časovém horizontu

get_broker_trades(_broker_id integer) RETURNS SETOF trades
-- Vrátí seznam provedených obchodů pro daného brokera

get_broker_trades(_broker_id integer, _from timestamp with time zone, _to timestamp with time zone) RETURNS SETOF trades
-- Vrátí seznam provedených obchodů pro daného brokera v daném časovém horizontu

set_trade_buyer_notified(_trade_id bigint) RETURNS void
-- Označí upozornění kupujícího brokera v tomto tradu za vyřízené

set_trade_seller_notified(_trade_id bigint) RETURNS void
-- Označí upozornění prodávajícího brokera v tomto tradu za vyřízené
