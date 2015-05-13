//=================================
// include guard
#ifndef __ORDER_TYPE_H_INCLUDED__
#define __ORDER_TYPE_H_INCLUDED__
//=================================

#ifdef __STD_C_PLUS_PLUS_11__
enum class OrderType { BuyOrder, SellOrder };
#else 
enum OrderType { BuyOrder, SellOrder };
#endif 

#endif // __ORDER_TYPE_H_INCLUDED__ 
