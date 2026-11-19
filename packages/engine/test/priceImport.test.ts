import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS, importPrices, parseMoney } from '../src';

describe('supplier price list import', () => {
  it('reads Serbian and English money formats', () => {
    expect([parseMoney('6.500,00'), parseMoney('6500'), parseMoney('6,500.00'), parseMoney('1 250 din'), parseMoney('6.500'), parseMoney('89,5'), parseMoney(110), parseMoney('—')])
      .toEqual([650000, 650000, 650000, 125000, 650000, 8950, 11000, null]);
  });
  it('matches boards by decor + thickness, HDF, edging, services and hardware; reports the rest', () => {
    const r = importPrices([
      ['Šifra', 'Naziv artikla', 'JM', 'Cena (RSD)'],
      ['W980', 'Iverica Egger 18 mm bela', 'kom', '6.200,00'],
      ['U708 ST9', 'Iverica 18mm svetlo siva', 'kom', '8.400,00'],
      ['', 'Iverica 16 mm W980', 'kom', '5.500'],
      ['', 'HDF 3 mm beli', 'kom', '2300'],
      ['', 'ABS kant 0,8 mm W980', 'm', '100'],
      ['', 'ABS kant 2 mm U708', 'm', '180'],
      ['', 'Sečenje ploče', 'm', '80'],
      ['', 'Radna ploča 38 mm hrast 4100×600', 'kom', '15.700'],
      ['', 'Dostava', '', '0'],
      ['', 'Šarka Blum clip top + pločica', 'kpl', '420'],
      ['', 'Iverica 18 hrast H1145', 'kom', '7.900'],
    ], DEFAULT_MATERIALS);
    expect(r.sheets).toEqual({ 'iv18-w980': 620000, 'iv18-u708': 840000, 'iv16-w980': 550000, hdf3: 230000 });
    expect(r.edgingPerM).toEqual({ '0.8': 10000, '2': 18000 });
    expect(r.items).toEqual({ cuttingPerM: 8000, worktopPiece: 1570000, delivery: 0, hingeSet: 42000 });
    expect(r.unknown).toEqual(['Iverica 18 hrast H1145 kom']);
  });
  it('without a header the price is the last numeric column', () => {
    expect(importPrices([['Iverica 18 W980', 6500]], DEFAULT_MATERIALS).sheets).toEqual({ 'iv18-w980': 650000 });
  });
});
