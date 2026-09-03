import type { MenuItem } from "@/components/ui/menu-card";

// Menu pages. Prices are in SAR, calories per serving.
export const boxItems: MenuItem[] = [
  { id: "box-01", name: "علبة فول كلاسك صغير", price: "2.5", calories: "220" },
  { id: "box-02", name: "علبة فول كلاسك وسط", price: "4", calories: "250" },
  { id: "box-03", name: "علبة فول كلاسك كبير", price: "6", calories: "280" },
  { id: "box-04", name: "علبة عجين فلافل صغير", price: "3", calories: "210" },
  { id: "box-05", name: "علبة عجين فلافل كبير", price: "6", calories: "250" },
  {
    id: "box-06",
    name: "علبة بطاطس مهروسة صغير",
    price: "2.5",
    calories: "120",
  },
  { id: "box-07", name: "علبة بطاطس مهروسة وسط", price: "4", calories: "180" },
  { id: "box-08", name: "علبة بطاطس مهروسة كبير", price: "6", calories: "200" },
  { id: "box-09", name: "علبة سلطة جبنة صغير", price: "3", calories: "180" },
  { id: "box-10", name: "علبة سلطة جبنة وسط", price: "4", calories: "200" },
  { id: "box-11", name: "علبة سلطة جبنة كبير", price: "6", calories: "220" },
];

export const dishItems: MenuItem[] = [
  { id: "dish-01", name: "فلافل 2 حبة", price: "1", calories: "120" },
  { id: "dish-02", name: "حبة بيض مسلوق", price: "1.5", calories: "50" },
  { id: "dish-03", name: "طبق بيض اومليت وسط", price: "4", calories: "100" },
  { id: "dish-04", name: "طبق بيض اومليت كبير", price: "6", calories: "200" },
  {
    id: "dish-05",
    name: "بطاطس شيبسي / أو صوابع صغير",
    price: "3",
    calories: "250",
  },
  {
    id: "dish-06",
    name: "بطاطس شيبسي / أو صوابع كبير",
    price: "6",
    calories: "300",
  },
  { id: "dish-07", name: "بطاطس شيبسي بالجبن", price: "3", calories: "250" },
];

export const platterItems: MenuItem[] = [
  { id: "plat-01", name: "علبة بابا غنوج صغير", price: "2.5", calories: "120" },
  { id: "plat-02", name: "علبة بابا غنوج وسط", price: "4", calories: "160" },
  { id: "plat-03", name: "علبة بابا غنوج كبير", price: "6", calories: "200" },
  { id: "plat-04", name: "علبة مسقعة صغير", price: "2.5", calories: "130" },
  { id: "plat-05", name: "علبة مسقعة وسط", price: "4", calories: "170" },
  { id: "plat-06", name: "علبة مسقعة كبير", price: "6", calories: "250" },
  {
    id: "plat-07",
    name: "علبة باذنجان حار صغير",
    price: "2.5",
    calories: "120",
  },
  { id: "plat-08", name: "علبة باذنجان حار وسط", price: "4", calories: "180" },
  { id: "plat-09", name: "علبة باذنجان حار كبير", price: "6", calories: "260" },
];

export const mainItems: MenuItem[] = [
  { id: "main-01", name: "طبق مشكل مقالي كبير", price: "15", calories: "300" },
  { id: "main-02", name: "طبق مشكل صغير", price: "10", calories: "250" },
  { id: "main-03", name: "طبق ايدام صغير", price: "3", calories: "180" },
  { id: "main-04", name: "طبق ايدام وسط", price: "5", calories: "200" },
  { id: "main-05", name: "طبق ايدام كبير", price: "7", calories: "220" },
];

// Long item names here; rows are allowed to wrap to two or three lines.
export const mealItems: MenuItem[] = [
  {
    id: "meal-01",
    name: "نص دجاج مقلي مع نفر رز وخضار وسلطة وشوربة",
    price: "26",
    calories: "1060",
  },
  {
    id: "meal-02",
    name: "ربع دجاج مقلي مع نفر رز وخضار وسلطة وشوربة",
    price: "15",
    calories: "710",
  },
  {
    id: "meal-03",
    name: "ربع دجاج فرن مع بطاطس ونفر رز وسلطة وشوربة",
    price: "26",
    calories: "1100",
  },
  {
    id: "meal-04",
    name: "نص دجاج فرن مع بطاطس ونفر رز وسلطة وشوربة",
    price: "15",
    calories: "820",
  },
  {
    id: "meal-05",
    name: "طاجن بطاطس باللحم مع نفر رز وسلطة وشوربة",
    price: "25",
    calories: "780",
  },
];

// Sandwiches. `subtitle` carries the ingredients line; the last four items on
// page two deliberately have none.
export const sandwichItemsA: MenuItem[] = [
  {
    id: "sndA-01",
    name: "ساندوتش فول كلاسك",
    subtitle: "(فول + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    id: "sndA-02",
    name: "ساندوتش فول بالبيض",
    subtitle: "(فول + بيض + سلطة)",
    price: "3",
    calories: "335",
  },
  {
    id: "sndA-03",
    name: "ساندوتش فلافل كلاسك",
    subtitle: "(فلافل + سلطة)",
    price: "2",
    calories: "280",
  },
  {
    id: "sndA-04",
    name: "ساندوتش مشكل فلافل",
    subtitle: "(فلافل + سلطة + بطاطس + باذنجان)",
    price: "3",
    calories: "400",
  },
  {
    id: "sndA-05",
    name: "ساندوتش مشكل فلافل بالبيض",
    subtitle: "(فلافل + سلطة)",
    price: "4",
    calories: "470",
  },
  {
    id: "sndA-06",
    name: "ساندوتش مشكل صبة",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع)",
    price: "5",
    calories: "660",
  },
  {
    id: "sndA-07",
    name: "ساندوتش مشكل (ديناميت)",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع + بيض)",
    price: "6",
    calories: "740",
  },
  {
    id: "sndA-08",
    name: "ساندوتش بطاطس صوابع",
    subtitle: "(بطاطس صوابع + سلطة)",
    price: "3",
    calories: "280",
  },
  {
    id: "sndA-09",
    name: "ساندوتش بطاطس شيبسي",
    subtitle: "(بطاطس شيبسي + سلطة)",
    price: "3",
    calories: "250",
  },
];

export const sandwichItemsB: MenuItem[] = [
  {
    id: "sndB-01",
    name: "ساندوتش بيض مسلوق",
    subtitle: "(بيض مسلوق + سلطة)",
    price: "5",
    calories: "330",
  },
  {
    id: "sndB-02",
    name: "ساندوتش بيض اوملیت",
    subtitle: "(بيض اومليت + سلطة)",
    price: "4",
    calories: "230",
  },
  {
    id: "sndB-03",
    name: "ساندوتش جبنة بالسلطة",
    subtitle: "(جبنة + سلطة)",
    price: "3",
    calories: "220",
  },
  {
    id: "sndB-04",
    name: "ساندوتش بابا غنوج",
    subtitle: "(بابا غنوج + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    id: "sndB-05",
    name: "ساندوتش زهرة",
    subtitle: "(زهرة + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    id: "sndB-06",
    name: "ساندوتش عجة",
    subtitle: "(عجة بالبيض + سلطة)",
    price: "5",
    calories: "350",
  },
  {
    id: "sndB-07",
    name: "ساندوتش جبنة بالسلطة بالبيض",
    price: "4",
    calories: "300",
  },
  {
    id: "sndB-08",
    name: "ساندوتش بطاطس صوابع بالبيض",
    price: "5",
    calories: "350",
  },
  {
    id: "sndB-09",
    name: "ساندوتش بطاطس شيبسي بالبيض",
    price: "5",
    calories: "350",
  },
  {
    id: "sndB-10",
    name: "ساندوتش بتنجان مقلي مع سلطة وطحينة",
    price: "2",
    calories: "230",
  },
  {
    id: "sndB-11",
    name: "ساندوتش بطاطس بانية مع سلطة وطحينة",
    price: "3",
    calories: "300",
  },
];

// Notes shown under the rows of their respective menu pages.
export const MAINS_NOTE =
  "يوجد كل يوم ثلاثة أصناف إضافية متنوعة حسب أسبقية الحجز";
export const MEALS_NOTE = "(بامية أو خضار مشكل أو بازلا حسب الطلب)";
export const SANDWICH_TAGLINE = "فول وفلافل ولاد البلد على اصوله";

/* ---------------------------------------------------------------------------
 * Server-side catalogue.
 *
 * The order API must NEVER trust a price sent by the client. It receives item
 * ids and quantities only, then prices them from this map.
 *
 * Money is held in halalas (1 SAR = 100 halalas) so totals are integer
 * arithmetic — no floating point drift on values like 2.5 SAR.
 * ------------------------------------------------------------------------- */

export type CatalogueEntry = {
  id: string;
  name: string;
  priceHalalas: number;
  calories: number;
  category: string;
};

const CATEGORIES: { label: string; items: MenuItem[] }[] = [
  { label: "علب الطعام", items: boxItems },
  { label: "الأطباق والوجبات", items: dishItems },
  { label: "أطباق وعلب", items: platterItems },
  { label: "الأطباق الرئيسية", items: mainItems },
  { label: "الوجبات والطواجن", items: mealItems },
  { label: "الساندوتشات ١", items: sandwichItemsA },
  { label: "الساندوتشات ٢", items: sandwichItemsB },
];

export const menuCatalogue: ReadonlyMap<string, CatalogueEntry> = new Map(
  CATEGORIES.flatMap(({ label, items }) =>
    items.map((item): [string, CatalogueEntry] => [
      item.id,
      {
        id: item.id,
        name: item.name,
        priceHalalas: Math.round(Number(item.price) * 100),
        calories: Number(item.calories),
        category: label,
      },
    ]),
  ),
);

export const menuItemIds: readonly string[] = [...menuCatalogue.keys()];
