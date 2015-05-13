using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace StockMarketSimulator
{
  public abstract class PriceCalculator
  {
    private const bool Debug = true;

    protected decimal tickSize;

    protected decimal lastPrice;

    public decimal GetPrice(Order[] buyList, Order[] sellList, decimal tickSize, decimal lastPrice)
    {
      this.tickSize = tickSize;
      this.lastPrice = lastPrice;

      if (buyList.Length == 0 || sellList.Length == 0)
      {
        Recorder.Instance.WriteLine("No buy or sell orders. Current price is equal to the last price.");
        return lastPrice;
      }

      /// Výpočet protnutí nabídky a poptávky jsem přesunul na databázi. 
      Order[] filteredBuyList = buyList;
      Order[] filteredSellList = sellList;

      PriceCalculationRow[] table = CreateTable(filteredBuyList, filteredSellList);

      return GetPriceByMaximumTradeableVolume(table);
    }

    /// <summary>
    /// První kritérium pro výpočet ceny. Pro všechny ceny v tabulce spočítá objem, který by za 
    /// danou cenu mohl být zobchodován, a vybere cenu, pro niž je zobchodovatelný objem největší.
    /// Pokud je taková cena jedinečná, vrátí ji jako výsledek, v opačném případě předá vhodné 
    /// kandidáty metodě <code>GetPriceByNormalOrderImbalance</code> hodnotící druhé kritérium.
    /// </summary>
    /// <param name="table"></param>
    /// <returns></returns>
    private decimal GetPriceByMaximumTradeableVolume(PriceCalculationRow[] table)
    {
      PriceCalculationRow[] maxVolumeRows = GetMaximumVolumeRows(table);

      if (Debug)
      {
        Recorder.Instance.WriteLine("\r\nChecking MaximumTradeableVolume Criterion...");
        Recorder.Instance.Print(table);
      }

      switch (maxVolumeRows.Length)
      {
        case 0: throw new NullReferenceException("maxVolumeRows.Length == 0");
        case 1: return maxVolumeRows[0].Price;
        default: return GetPriceByNormalOrderImbalance(maxVolumeRows);
      }
    }

    /// <summary>
    /// Druhé kritérium pro výpočet ceny. Pro všechny ceny v (sub)tabulce spočítá nezobchodovatelný
    /// objem odpovídající dané ceně, a vybere cenu, pro niž je tato hodnota nejmenší.
    /// Pokud je taková cena jedinečná, vrátí ji jako výsledek, v opačném případě předá vhodné 
    /// kandidáty metodě <code>GetPriceByOrderImbalanceDirection</code> hodnotící třetí kritérium.
    /// </summary>
    /// <param name="table"></param>
    /// <returns></returns>
    private decimal GetPriceByNormalOrderImbalance(PriceCalculationRow[] table)
    {
      PriceCalculationRow[] minImbalanceRows = GetMinimumOrderImbalanceRows(table);

      if (Debug)
      {
        Recorder.Instance.WriteLine("\r\nChecking NormalOrderImbalance Criterion...");
        Recorder.Instance.Print(table);
      }

      switch (minImbalanceRows.Length)
      {
        case 0: throw new NullReferenceException("minImbalanceRows.Length == 0");
        case 1: return minImbalanceRows[0].Price;
        default: return GetPriceByOrderImbalanceDirection(minImbalanceRows);
      }
    }

    /// <summary>
    /// Třetí kritérium pro výpočet ceny. Pro všechny ceny v (sub)tabulce zkontroluje, zda převažuje
    /// nabídka nad poptávkou, nebo naopak. Pokud ve všech případech převažuje poptávka, vybere 
    /// z možných cen největší. Pokud ve všech případech převažuje nabídka, vybere nejnižší cenu.
    /// Ve zbývajících případech (TEMP!) spočítá cenu jako průměr ze zvažovaných cen.
    /// </summary>
    /// <param name="table"></param>
    /// <returns></returns>
    private decimal GetPriceByOrderImbalanceDirection(PriceCalculationRow[] table)
    {
      if (Debug)
      {
        Recorder.Instance.WriteLine("\r\nChecking OrderImbalanceDirection Criterion...");
        Recorder.Instance.Print(table);
      }

      if (table.All(r => r.AggregateBuyQuantity > r.AggregateSellQuantity))
        return table.Max(r => r.Price);

      if (table.All(r => r.AggregateBuyQuantity < r.AggregateSellQuantity))
        return table.Min(r => r.Price);

      return GetPriceByAverage(table);
    }

    /// <summary>
    /// Čtvrté a páté kritérium pro výpočet ceny. Spočítá průmernou cenu ze (sub)tabulky; pokud je 
    /// násobkem základní jednotky tickSize, vrátí ji jako výsledek.
    /// V opačném případě se rozhoduje podle předchozí ceny: pokud byla vyšší než nyní spočítaná
    /// průměrná cena, zaokrouhlí se průměrná cena na nejbližší základní jednotku směrem nahoru, 
    /// v opačném případě směrem dolů.
    /// </summary>
    /// <param name="table"></param>
    /// <returns></returns>
    private decimal GetPriceByAverage(PriceCalculationRow[] table)
    {
      if (Debug)
      {
        Recorder.Instance.WriteLine("\r\nChecking Average Criterion...");
        Recorder.Instance.Print(table);
      }

      decimal averagePrice = table.Average(r => r.Price);

      if (averagePrice % tickSize == 0)
        return averagePrice;

      if (lastPrice > averagePrice)
        return tickSize * Math.Ceiling(averagePrice / tickSize);

      return tickSize * Math.Floor(averagePrice / tickSize);
    }

    protected abstract PriceCalculationRow[] CreateTable(Order[] buyList, Order[] sellList);

    protected abstract PriceCalculationRow[] GetMaximumQuantityRows(PriceCalculationRow[] table);

    protected abstract PriceCalculationRow[] GetMaximumVolumeRows(PriceCalculationRow[] table);

    protected abstract PriceCalculationRow[] GetMinimumOrderImbalanceRows(PriceCalculationRow[] table);
  }
}
