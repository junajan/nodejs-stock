//=================================
// include guard
#ifndef __DECIMAL_H_INCLUDED__
#define __DECIMAL_H_INCLUDED__
//=================================

#include <string>
#include "decNumber/decDouble.h"

using namespace std;


class DecimalContext
{
private:
  decContext set;

public:
  DecimalContext();
  decContext* Get();
};


class Decimal
{

private:
  decDouble number;

public:
  Decimal();
  Decimal(const int rhs);
  Decimal(const string rhs);

  Decimal& operator=(const Decimal& rhs);
  Decimal& operator=(const int rhs);
  Decimal& operator=(const string rhs);
  Decimal& operator+=(const Decimal& rhs);
  Decimal& operator-=(const Decimal& rhs);
  Decimal& operator*=(const Decimal& rhs);
  Decimal& operator*=(const int rhs);
  Decimal& operator/=(const Decimal& rhs);
  Decimal& operator/=(const int rhs);
  Decimal& operator%=(const Decimal& rhs);
  Decimal& operator%=(const int rhs);

  friend Decimal operator+(const Decimal& lhs, const Decimal& rhs);
  friend Decimal operator-(const Decimal& lhs, const Decimal& rhs);
  friend Decimal operator*(const Decimal& lhs, const Decimal& rhs);
  friend Decimal operator*(Decimal lhs, const int rhs);
  friend Decimal operator*(const int lhs, Decimal& rhs);
  friend Decimal operator/(const Decimal& lhs, const Decimal& rhs);
  friend Decimal operator/(Decimal lhs, const int rhs);
  friend Decimal operator/(const int lhs, Decimal& rhs);
  friend Decimal operator%(const Decimal& lhs, const Decimal& rhs);
  friend Decimal operator%(Decimal lhs, const int rhs);

  friend bool operator==(const Decimal& lhs, const Decimal& rhs);
  friend bool operator!=(const Decimal& lhs, const Decimal& rhs);
  friend bool operator<(const Decimal& lhs, const Decimal& rhs);
  friend bool operator>(const Decimal& lhs, const Decimal& rhs);
  friend bool operator<=(const Decimal& lhs, const Decimal& rhs);
  friend bool operator>=(const Decimal& lhs, const Decimal& rhs);

  const string toString() const;
  friend ostream& operator<<(ostream& os, const Decimal& obj);
  friend istream& operator>>(istream& is, const Decimal& obj);

  static Decimal round(const Decimal& value);
  static Decimal floor(const Decimal& value);
  static Decimal ceiling(const Decimal& value);
  static Decimal abs(const Decimal& value);
};

#endif // __DECIMAL_H_INCLUDED__ 
