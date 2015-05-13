#include "Decimal.h"

DecimalContext Context;

DecimalContext::DecimalContext()
{
  decContextDefault(&set, DEC_INIT_DECDOUBLE);
}

decContext* DecimalContext::Get()
{
  return &set;
}


Decimal::Decimal()
{
  decDoubleZero(&number);
}

Decimal::Decimal(int value)
{
  decDoubleFromInt32(&number, value);
}

Decimal::Decimal(const string value)
{
  decDoubleFromString(&number, (char*)value.c_str(), Context.Get()); 
}

Decimal& Decimal::operator=(const Decimal& rhs)
{
  decDoubleCopy(&number, &(rhs.number));
  return *this;
}

Decimal& Decimal::operator=(const int rhs)
{
  decDoubleFromInt32(&number, rhs);
  return *this;
}

Decimal& Decimal::operator=(const string rhs)
{
  decDoubleFromString(&number, (char*)rhs.c_str(), Context.Get()); 
  return *this;
}

Decimal& Decimal::operator+=(const Decimal& rhs)
{
  decDoubleAdd(&number, &number, &(rhs.number), Context.Get());           
  return *this;
}

Decimal& Decimal::operator-=(const Decimal& rhs)
{
  decDoubleSubtract(&number, &number, &(rhs.number), Context.Get());           
  return *this;
}

Decimal& Decimal::operator*=(const Decimal& rhs)
{
  decDoubleMultiply(&number, &number, &(rhs.number), Context.Get());           
  return *this;
}

Decimal& Decimal::operator*=(const int rhs)
{
  const Decimal rhsDecimal(rhs);
  return operator*=(rhsDecimal);
}

Decimal& Decimal::operator/=(const Decimal& rhs)
{
  decDoubleDivide(&number, &number, &(rhs.number), Context.Get());           
  return *this;
}

Decimal& Decimal::operator/=(const int rhs)
{
  const Decimal rhsDecimal(rhs);
  return operator/=(rhsDecimal);
}

Decimal& Decimal::operator%=(const Decimal& rhs)
{
  decDoubleRemainder(&number, &number, &(rhs.number), Context.Get());           
  return *this;
}

Decimal& Decimal::operator%=(const int rhs)
{
  const Decimal rhsDecimal(rhs);
  return operator%=(rhsDecimal);
}

Decimal operator+(const Decimal& lhs, const Decimal& rhs)
{
  Decimal temp = lhs;
  return temp += rhs;
}

Decimal operator-(const Decimal& lhs, const Decimal& rhs)
{
  Decimal temp = lhs;
  return temp -= rhs;
}

Decimal operator*(const Decimal& lhs, const Decimal& rhs)
{
  Decimal temp = lhs;
  return temp *= rhs;
}

Decimal operator*(Decimal lhs, const int rhs)
{
  return operator*(lhs, Decimal(rhs));
}

Decimal operator*(const int lhs, Decimal& rhs)
{
  return operator*(rhs, lhs);
}

Decimal operator/(const Decimal& lhs, const Decimal& rhs)
{
  Decimal temp = lhs;
  return temp /= rhs;
}

Decimal operator/(Decimal lhs, const int rhs)
{
  return operator/(lhs, Decimal(rhs));
}

Decimal operator/(const int lhs, Decimal& rhs)
{
  return operator/(Decimal(lhs), rhs);
}

Decimal operator%(const Decimal& lhs, const Decimal& rhs)
{
  Decimal temp = lhs;
  return temp %= rhs;
}

Decimal operator%(Decimal lhs, const int rhs)
{
  return operator%(lhs, Decimal(rhs));
}

bool operator==(const Decimal& lhs, const Decimal& rhs)
{ 
  decDouble comparison;
  decDoubleCompare(&comparison, &(lhs.number), &(rhs.number), Context.Get());
  return decDoubleIsZero(&comparison);
}

bool operator!=(const Decimal& lhs, const Decimal& rhs)
{
  return !operator==(lhs, rhs);
}

bool operator<(const Decimal& lhs, const Decimal& rhs)
{ 
  decDouble comparison;
  decDoubleCompare(&comparison, &(lhs.number), &(rhs.number), Context.Get());
  return decDoubleIsNegative(&comparison);
}

bool operator>(const Decimal& lhs, const Decimal& rhs)
{
  return operator<(rhs, lhs);
}

bool operator<=(const Decimal& lhs, const Decimal& rhs)
{
  return !operator>(lhs, rhs);
}

bool operator>=(const Decimal& lhs, const Decimal& rhs)
{
  return !operator<(lhs, rhs);
}

const string Decimal::toString() const
{ 
  char result[DECQUAD_String];
  decDoubleToString(&number, result);
  return result;
}

ostream& operator<<(ostream& os, const Decimal& obj)
{
  return os << obj.toString();
}

istream& operator>>(istream& is, Decimal& obj)
{
  string s;
  is >> s;
  obj = s;
  return is;
}

Decimal Decimal::round(const Decimal& value)
{
  Decimal result;
  decDoubleToIntegralValue(&(result.number), &(value.number), Context.Get(), DEC_ROUND_HALF_UP);
  return result;
}

Decimal Decimal::floor(const Decimal& value)
{
  Decimal result;
  decDoubleToIntegralValue(&(result.number), &(value.number), Context.Get(), DEC_ROUND_FLOOR);
  return result;
}

Decimal Decimal::ceiling(const Decimal& value)
{
  Decimal result;
  decDoubleToIntegralValue(&(result.number), &(value.number), Context.Get(), DEC_ROUND_CEILING);
  return result;
}

Decimal Decimal::abs(const Decimal& value)
{
  Decimal result;
  decDoubleAbs(&(result.number), &(value.number), Context.Get());
  return result;
}
