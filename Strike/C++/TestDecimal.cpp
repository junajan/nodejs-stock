#include <iostream>
#include "Decimal.h"

using namespace std;

int main()
{
  Decimal a1, a2, a3, a4;
  Decimal b(10);
  Decimal c("12.35");
  Decimal d("-0.0310552");

  a1 = b;
  a2 = 11;
  a3 = "14.789";
  a4 = "-0.0057804";

  string a1s = a1.toString();
  cout << "a1 = " << a1s << endl;
  cout << "a2 = " << a2.toString() << endl;
  cout << "a3 = " << a3.toString() << endl;
  cout << "a4 = " << a4.toString() << endl;
  cout << "b = " << b.toString() << endl;
  cout << "c = " << c.toString() << endl;
  cout << "d = " << d.toString() << endl;

  a2 += b;
  cout << "a2 += b; a2 = 21: " << a2.toString() << endl;
  a1 += 10;
  cout << "a1 += 10; a1 = 20: " << a1.toString() << endl;
  a1 -= 10;
  cout << "a1 -= 10; a1 = 10: " << a1.toString() << endl;
  a2 -= b;
  cout << "a2 -= b; a2 = 11: " << a2.toString() << endl;
  a2 += a3;
  cout << "a2 += a3; a2 = 25.789: " << a2.toString() << endl;

  a1 *= b;
  cout << "a1 *= b; a1 = 100: " << a1.toString() << endl;
  a2 *= 100;
  cout << "a2 *= 100; a2 = 2578.9: " << a2.toString() << endl;
  a3 *= 100;
  cout << "a3 *= 100; a3 = 1478.9: " << a3.toString() << endl;
  a1 /= 20;
  cout << "a1 /= 20; a1 = 5: " << a1.toString() << endl;
  a3 /= a2;
  cout << "a3 /= a2; a3 = 0.5734616: " << a3.toString() << endl;
  a1 %= 3;
  cout << "a1 %= 3; a1 = 2: " << a1.toString() << endl;
  a2 %= 200;
  cout << "a2 %= 200; a2 = 178.9: " << a2.toString() << endl;
  a2 %= a1;
  cout << "a2 %= a1; a2 = 0.9: " << a2.toString() << endl;

  Decimal e = b + c;
  cout << "e = b + c; e = 22.35: " << e.toString() << endl;
  e = b - c;
  cout << "e = b - c; e = -2.35: " << e.toString() << endl;
  e = b * c;
  cout << "e = b * c; e = 123.5: " << e.toString() << endl;
  e = c / b;
  cout << "e = c / b; e = 1.235: " << e.toString() << endl;
  e = c % b;
  cout << "e = c % b; e = 2.35: " << e.toString() << endl;
  e = b % c;
  cout << "e = b % c; e = 10: " << e.toString() << endl;

  e = c  * 10;
  cout << "e = c * 10; e = 123.5: " << e.toString() << endl;
  e = 100 * c;
  cout << "e = 10 * c; e = 1235: " << e.toString() << endl;
  e = c  / 10;
  cout << "e = c / 10; e = 1.235: " << e.toString() << endl;
  e = 100 / c;
  cout << "e = 100 / c; e = 8.097166: " << e.toString() << endl;
  e = c  % 10;
  cout << "e = c % 10; e = 2.35: " << e.toString() << endl;

  
  Decimal i("123.4");
  Decimal j("123.4");
  Decimal k("123.40");
  Decimal l("-123.4");
  Decimal m("125.404");
  Decimal n("12.8044");
  Decimal o("8.5");

  if (i == j) 
    cout << i << " == " << j << " (i == j)" << endl;
  if (i != j) 
    cout << i << " != " << j << " (ERROR)" << endl;
  if (i == k) 
    cout << i << " == " << k << " (i == k)" << endl;
  if (i != k) 
    cout << i << " != " << k << " (ERROR)" << endl;
  if (i != l) 
    cout << i << " != " << l << " (i != l)" << endl;
  if (i == l) 
    cout << i << " == " << l << " (ERROR)" << endl;

  if (i >= m) 
    cout << i << " >= " << m << " (ERROR)" << endl;
  if (i <= m) 
    cout << i << " <= " << m << " (i <= m)" << endl;
  if (i >= n) 
    cout << i << " >= " << n << " (i >= n)" << endl;
  if (i <= n) 
    cout << i << " <= " << n << " (ERROR)" << endl;
  if (i >= j) 
    cout << i << " >= " << j << " (i >= j)" << endl;
  if (i <= j) 
    cout << i << " <= " << j << " (i <= j)" << endl;

  if (i > m) 
    cout << i << " > " << m << " (ERROR)" << endl;
  if (i < m) 
    cout << i << " < " << m << " (i < m)" << endl;
  if (i > n) 
    cout << i << " > " << n << " (i > n)" << endl;
  if (i < n) 
    cout << i << " < " << n << " (ERROR)" << endl;
  if (i > j) 
    cout << i << " > " << j << " (ERROR)" << endl;
  if (i < j) 
    cout << i << " < " << j << " (ERROR)" << endl;

  cout << endl << "b = " << b << ", c = " << c << endl;
  cout << "a1 = " << a1 << ", a2 = " << a2 << ", a3 = " << a3 << ", a4 = " << a4 << endl;

  cout << "round(" << i << ") = " << Decimal::round(i) << endl;
  cout << "round(" << l << ") = " << Decimal::round(l) << endl;
  cout << "round(" << o << ") = " << Decimal::round(o) << endl;
  cout << "round(" << n << ") = " << Decimal::round(n) << endl;

  cout << "floor(" << i << ") = " << Decimal::floor(i) << endl;
  cout << "floor(" << l << ") = " << Decimal::floor(l) << endl;
  cout << "floor(" << o << ") = " << Decimal::floor(o) << endl;
  cout << "floor(" << n << ") = " << Decimal::floor(n) << endl;

  cout << "ceiling(" << i << ") = " << Decimal::ceiling(i) << endl;
  cout << "ceiling(" << l << ") = " << Decimal::ceiling(l) << endl;
  cout << "ceiling(" << o << ") = " << Decimal::ceiling(o) << endl;
  cout << "ceiling(" << n << ") = " << Decimal::ceiling(n) << endl;

  cout << "abs(" << i << ") = " << Decimal::abs(i) << endl;
  cout << "abs(" << l << ") = " << Decimal::abs(l) << endl;
  cout << "abs(" << o << ") = " << Decimal::abs(o) << endl;
  cout << "abs(" << n << ") = " << Decimal::abs(n) << endl;

  return 0;
}