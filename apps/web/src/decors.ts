// Catalog of board decors stocked by saw shops / timber yards in Serbia (2026-11-20, from Agacija for EGGER and Tis /
// Drvo Promet Kula for Kronospan). The decors, names and images belong to their makers and are shown with their name
// ("© Kronospan", "© EGGER"); the workshop orders these boards from them (user 2026-11-20: show whose they are).
// Kronospan: decor scans from kronospan.com (public decor download), resized, in public/decors/kronospan (SOURCES.md there).
// EGGER: colour only (measured from the decor image) and generated grain for woods — EGGER's decor images are behind the
// myEGGER login; the workshop can upload them in Admin → Biblioteka → Materijali.
// shortcut: image real size assumed 1000 × 1500 mm (Kronospan does not state it); colours are averages, check on a sample.
import type { Material } from 'engine';

export interface Decor {
  maker: 'EGGER' | 'Kronospan'; code: string; surface: string; name: string;
  kind: 'uni' | 'wood' | 'stone'; color: string; img?: string;
}

export const DECORS: Decor[] = [
  { maker: 'EGGER', code: 'W980', surface: 'ST2', name: 'Platinasto bela', kind: 'uni', color: '#F5F5F1' },
  { maker: 'EGGER', code: 'W960', surface: 'ST7', name: 'Klasična bela', kind: 'uni', color: '#F4F5ED' },
  { maker: 'EGGER', code: 'W954', surface: 'SM', name: 'Bela front glatka', kind: 'uni', color: '#F6F6F6' },
  { maker: 'EGGER', code: 'U104', surface: 'ST9', name: 'Alabaster bela', kind: 'uni', color: '#FAF5E0' },
  { maker: 'EGGER', code: 'U113', surface: 'ST9', name: 'Perla', kind: 'uni', color: '#F3E5CB' },
  { maker: 'EGGER', code: 'U115', surface: 'ST9', name: 'Karat bež', kind: 'uni', color: '#EEE2C9' },
  { maker: 'EGGER', code: 'U156', surface: 'ST9', name: 'Bež pesak', kind: 'uni', color: '#DDCBB7' },
  { maker: 'EGGER', code: 'U201', surface: 'ST9', name: 'Šljunak siva', kind: 'uni', color: '#B4AD9D' },
  { maker: 'EGGER', code: 'U708', surface: 'ST9', name: 'Svetlo siva', kind: 'uni', color: '#D1CDCA' },
  { maker: 'EGGER', code: 'U750', surface: 'ST9', name: 'Siva', kind: 'uni', color: '#CDC2AF' },
  { maker: 'EGGER', code: 'U767', surface: 'ST9', name: 'Cubanit siva', kind: 'uni', color: '#897F75' },
  { maker: 'EGGER', code: 'U780', surface: 'ST9', name: 'Monument siva', kind: 'uni', color: '#74787C' },
  { maker: 'EGGER', code: 'U788', surface: 'ST9', name: 'Arktik siva', kind: 'uni', color: '#9B9693' },
  { maker: 'EGGER', code: 'U899', surface: 'ST9', name: 'Kosmos siva (soft crna)', kind: 'uni', color: '#3C3835' },
  { maker: 'EGGER', code: 'U960', surface: 'ST9', name: 'Oniks siva', kind: 'uni', color: '#5B5C5A' },
  { maker: 'EGGER', code: 'U961', surface: 'ST7', name: 'Grafit siva', kind: 'uni', color: '#413B3B' },
  { maker: 'EGGER', code: 'U968', surface: 'ST9', name: 'Carbon siva', kind: 'uni', color: '#2F3035' },
  { maker: 'EGGER', code: 'U999', surface: 'ST7', name: 'Crna', kind: 'uni', color: '#050505' },
  { maker: 'EGGER', code: 'U311', surface: 'ST9', name: 'Burgund crvena', kind: 'uni', color: '#791317' },
  { maker: 'EGGER', code: 'F765', surface: 'ST20', name: 'Četkano srebro', kind: 'uni', color: '#A8A5A0' },
  { maker: 'EGGER', code: 'H1145', surface: 'ST10', name: 'Hrast Bardolino natur', kind: 'wood', color: '#C6AB8D' },
  { maker: 'EGGER', code: 'H1113', surface: 'ST10', name: 'Hrast Kansas braon', kind: 'wood', color: '#9B7C61' },
  { maker: 'EGGER', code: 'H1199', surface: 'ST12', name: 'Termo hrast crno-braon', kind: 'wood', color: '#2E251E' },
  { maker: 'EGGER', code: 'H1277', surface: 'ST9', name: 'Lakeland bagrem svetli', kind: 'wood', color: '#D8C1A6' },
  { maker: 'EGGER', code: 'H1715', surface: 'ST12', name: 'Parona orah', kind: 'wood', color: '#C49875' },
  { maker: 'EGGER', code: 'H1732', surface: 'ST9', name: 'Breza pesak', kind: 'wood', color: '#E7CEB0' },
  { maker: 'EGGER', code: 'H1910', surface: 'ST9', name: 'Willow bukva', kind: 'wood', color: '#D4A874' },
  { maker: 'EGGER', code: 'H3043', surface: 'ST12', name: 'Eukaliptus tamno braon', kind: 'wood', color: '#251815' },
  { maker: 'EGGER', code: 'H3734', surface: 'ST9', name: 'Orah Dijon natur', kind: 'wood', color: '#85593B' },
  { maker: 'Kronospan', code: '0101', surface: 'PE', name: 'Bela', kind: 'uni', color: '#EDEFE6' },
  { maker: 'Kronospan', code: '0110', surface: 'SM', name: 'Bela korpus', kind: 'uni', color: '#EFEEEA' },
  { maker: 'Kronospan', code: '0112', surface: 'PE', name: 'Svetlo siva', kind: 'uni', color: '#C5CBCB' },
  { maker: 'Kronospan', code: '0162', surface: 'PE', name: 'Grafit siva', kind: 'uni', color: '#5B5959' },
  { maker: 'Kronospan', code: '0164', surface: 'PE', name: 'Antracit', kind: 'uni', color: '#393C3B' },
  { maker: 'Kronospan', code: '0171', surface: 'PE', name: 'Siva', kind: 'uni', color: '#848282' },
  { maker: 'Kronospan', code: '0190', surface: 'PR', name: 'Crna', kind: 'uni', color: '#121816' },
  { maker: 'Kronospan', code: '0191', surface: 'SU', name: 'Ledeno siva', kind: 'uni', color: '#D7DAD3' },
  { maker: 'Kronospan', code: '0197', surface: 'SU', name: 'Činčila siva', kind: 'uni', color: '#A2A39F' },
  { maker: 'Kronospan', code: '0515', surface: 'PE', name: 'Pesak bež', kind: 'uni', color: '#EFDCBE' },
  { maker: 'Kronospan', code: '0522', surface: 'PE', name: 'Bež', kind: 'uni', color: '#DFD1B6' },
  { maker: 'Kronospan', code: '0540', surface: 'PE', name: 'Manhattan siva', kind: 'uni', color: '#C1C2BF' },
  { maker: 'Kronospan', code: '1700', surface: 'PE', name: 'Čelik siva', kind: 'uni', color: '#B6BCBC' },
  { maker: 'Kronospan', code: '5981', surface: 'BS', name: 'Kašmir siva', kind: 'uni', color: '#CAC4B9' },
  { maker: 'Kronospan', code: '5982', surface: 'BS', name: 'Dagnja bež', kind: 'uni', color: '#DBD5BF' },
  { maker: 'Kronospan', code: '6299', surface: 'BS', name: 'Kobalt siva', kind: 'uni', color: '#5D5853' },
  { maker: 'Kronospan', code: '7181', surface: 'BS', name: 'Tamna čokolada', kind: 'uni', color: '#281811' },
  { maker: 'Kronospan', code: '8100', surface: 'SM', name: 'Biserno bela', kind: 'uni', color: '#FFFCF5' },
  { maker: 'Kronospan', code: '8681', surface: 'SU', name: 'Brilijant bela', kind: 'uni', color: '#F9F9F9' },
  { maker: 'Kronospan', code: '8685', surface: 'BS', name: 'Snežno bela', kind: 'uni', color: '#FEFEFE' },
  { maker: 'Kronospan', code: 'K001', surface: 'PW', name: 'Hrast Craft beli', kind: 'wood', color: '#E3DFD4', img: '/decors/kronospan/K001.jpg' },
  { maker: 'Kronospan', code: 'K002', surface: 'PW', name: 'Hrast Craft sivi', kind: 'wood', color: '#AD9D86', img: '/decors/kronospan/K002.jpg' },
  { maker: 'Kronospan', code: 'K003', surface: 'PW', name: 'Hrast Craft zlatni', kind: 'wood', color: '#C39A73', img: '/decors/kronospan/K003.jpg' },
  { maker: 'Kronospan', code: 'K004', surface: 'PW', name: 'Hrast Craft tobacco', kind: 'wood', color: '#9A775E', img: '/decors/kronospan/K004.jpg' },
  { maker: 'Kronospan', code: 'K006', surface: 'PW', name: 'Urban ćilibar hrast', kind: 'wood', color: '#BA997E', img: '/decors/kronospan/K006.jpg' },
  { maker: 'Kronospan', code: 'K007', surface: 'PW', name: 'Urban coffee hrast', kind: 'wood', color: '#866F5C', img: '/decors/kronospan/K007.jpg' },
  { maker: 'Kronospan', code: 'K008', surface: 'PW', name: 'Select orah svetli', kind: 'wood', color: '#AB8567', img: '/decors/kronospan/K008.jpg' },
  { maker: 'Kronospan', code: 'K009', surface: 'PW', name: 'Select orah tamni', kind: 'wood', color: '#8E6E55', img: '/decors/kronospan/K009.jpg' },
  { maker: 'Kronospan', code: 'K010', surface: 'SN', name: 'Beli bor', kind: 'wood', color: '#E6E3DE', img: '/decors/kronospan/K010.jpg' },
  { maker: 'Kronospan', code: 'K013', surface: 'SU', name: 'Pesak Artisan bukva', kind: 'wood', color: '#CAB398', img: '/decors/kronospan/K013.jpg' },
  { maker: 'Kronospan', code: 'K020', surface: 'PW', name: 'Fireside Select orah', kind: 'wood', color: '#6E4B39', img: '/decors/kronospan/K020.jpg' },
  { maker: 'Kronospan', code: 'K021', surface: 'SN', name: 'Ječam crno drvo', kind: 'wood', color: '#BD9876', img: '/decors/kronospan/K021.jpg' },
  { maker: 'Kronospan', code: 'K076', surface: 'PW', name: 'Pesak Expressive hrast', kind: 'wood', color: '#BC9E81', img: '/decors/kronospan/K076.jpg' },
  { maker: 'Kronospan', code: 'K080', surface: 'PW', name: 'Beli Clubhouse hrast', kind: 'wood', color: '#E2D8C7', img: '/decors/kronospan/K080.jpg' },
  { maker: 'Kronospan', code: 'K081', surface: 'PW', name: 'Saten Clubhouse hrast', kind: 'wood', color: '#B9A791', img: '/decors/kronospan/K081.jpg' },
  { maker: 'Kronospan', code: 'K082', surface: 'PW', name: 'Burbon hrast', kind: 'wood', color: '#563F29', img: '/decors/kronospan/K082.jpg' },
  { maker: 'Kronospan', code: 'K088', surface: 'PW', name: 'Belo nordijsko drvo', kind: 'wood', color: '#E1DCD0', img: '/decors/kronospan/K088.jpg' },
  { maker: 'Kronospan', code: 'K089', surface: 'PW', name: 'Sivo nordijsko drvo', kind: 'wood', color: '#968B80', img: '/decors/kronospan/K089.jpg' },
  { maker: 'Kronospan', code: 'K096', surface: 'SU', name: 'Siva šljaka', kind: 'stone', color: '#9E9185', img: '/decors/kronospan/K096.jpg' },
  { maker: 'Kronospan', code: 'K105', surface: 'PW', name: 'Tamni Endgrain hrast', kind: 'wood', color: '#9F8E7C', img: '/decors/kronospan/K105.jpg' },
  { maker: 'Kronospan', code: 'K107', surface: 'PW', name: 'Svetli Endgrain hrast', kind: 'wood', color: '#CEB69D', img: '/decors/kronospan/K107.jpg' },
  { maker: 'Kronospan', code: 'K354', surface: 'PW', name: 'Colonial Grange hrast', kind: 'wood', color: '#5F5448', img: '/decors/kronospan/K354.jpg' },
  { maker: 'Kronospan', code: 'K355', surface: 'PW', name: 'Platinum Grange hrast', kind: 'wood', color: '#A79D93', img: '/decors/kronospan/K355.jpg' },
  { maker: 'Kronospan', code: 'K356', surface: 'PW', name: 'Sand Grange hrast', kind: 'wood', color: '#92816E', img: '/decors/kronospan/K356.jpg' },
  { maker: 'Kronospan', code: 'K357', surface: 'PW', name: 'Greige Castello hrast', kind: 'wood', color: '#AC9F92', img: '/decors/kronospan/K357.jpg' },
  { maker: 'Kronospan', code: 'K358', surface: 'PW', name: 'Honey Castello hrast', kind: 'wood', color: '#BCA287', img: '/decors/kronospan/K358.jpg' },
  { maker: 'Kronospan', code: 'K359', surface: 'PW', name: 'Cognac Castello hrast', kind: 'wood', color: '#8C674C', img: '/decors/kronospan/K359.jpg' },
  { maker: 'Kronospan', code: 'K360', surface: 'PW', name: 'Vintage Harbor hrast', kind: 'wood', color: '#BAA48A', img: '/decors/kronospan/K360.jpg' },
  { maker: 'Kronospan', code: 'K361', surface: 'PW', name: 'Zlatni Harbor hrast', kind: 'wood', color: '#AC8F71', img: '/decors/kronospan/K361.jpg' },
  { maker: 'Kronospan', code: 'K365', surface: 'PW', name: 'Coast Evoke hrast', kind: 'wood', color: '#B08E67', img: '/decors/kronospan/K365.jpg' },
  { maker: 'Kronospan', code: 'K366', surface: 'PW', name: 'Fossil Evoke hrast', kind: 'wood', color: '#85766A', img: '/decors/kronospan/K366.jpg' },
  { maker: 'Kronospan', code: '1715', surface: 'BS', name: 'Breza snežna', kind: 'wood', color: '#E6CCAB', img: '/decors/kronospan/1715.jpg' },
  { maker: 'Kronospan', code: '3025', surface: 'SN', name: 'Sonoma hrast svetli', kind: 'wood', color: '#C1A78F', img: '/decors/kronospan/3025.jpg' },
  { maker: 'Kronospan', code: '5194', surface: 'SN', name: 'Oksid Vintage hrast', kind: 'wood', color: '#998372', img: '/decors/kronospan/5194.jpg' },
  { maker: 'Kronospan', code: '5501', surface: 'SN', name: 'Slavonski hrast', kind: 'wood', color: '#BC9674', img: '/decors/kronospan/5501.jpg' },
  { maker: 'Kronospan', code: '5527', surface: 'SN', name: 'Kameni hrast', kind: 'wood', color: '#AF8C64', img: '/decors/kronospan/5527.jpg' },
  { maker: 'Kronospan', code: '8431', surface: 'SN', name: 'Nagano hrast', kind: 'wood', color: '#D6B795', img: '/decors/kronospan/8431.jpg' },
  { maker: 'Kronospan', code: '8953', surface: 'SU', name: 'Orah Tiepolo', kind: 'wood', color: '#715645', img: '/decors/kronospan/8953.jpg' },
  { maker: 'Kronospan', code: '9614', surface: 'BS', name: 'Orah Lyon svetli', kind: 'wood', color: '#AA7F59', img: '/decors/kronospan/9614.jpg' },
];

/** Image size in mm (one image on the board). */
export const DECOR_IMG_MM = { w: 1000, h: 1500 };

/** Decor named in a material id or name ("iv18-k003", "Iverica 18 … K003"); EGGER codes win over Kronospan on a tie. */
export function decorOf(text?: string): Decor | undefined {
  if (!text) return;
  const words = text.toUpperCase().split(/[\s\-_·,()]+/);
  return DECORS.find(d => words.includes(d.code.toUpperCase()));
}

/** Board material for a decor (18 mm chipboard; the price list prices it by id). */
export const decorMaterial = (d: Decor): Omit<Material, 'sheet'> => ({
  id: `iv18-${d.code.toLowerCase()}`, name: `Iverica 18 ${d.name.toLowerCase()} ${d.code}`, thickness: 18, kind: 'chipboard', grain: d.kind === 'wood',
});

export const MAKER_NOTE = 'Dekori i slike: © EGGER, © Kronospan — vlasništvo proizvođača. Boja na ekranu je približna; proveri na uzorku.';
