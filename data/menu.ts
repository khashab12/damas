import type { MenuItem } from "@/components/ui/menu-card";

// Menu pages. Prices are in SAR, calories per serving.
export const boxItems: MenuItem[] = [
  { name: "علبة فول كلاسك صغير", price: "2.5", calories: "220" },
  { name: "علبة فول كلاسك وسط", price: "4", calories: "250" },
  { name: "علبة فول كلاسك كبير", price: "6", calories: "280" },
  { name: "علبة عجين فلافل صغير", price: "3", calories: "210" },
  { name: "علبة عجين فلافل كبير", price: "6", calories: "250" },
  { name: "علبة بطاطس مهروسة صغير", price: "2.5", calories: "120" },
  { name: "علبة بطاطس مهروسة وسط", price: "4", calories: "180" },
  { name: "علبة بطاطس مهروسة كبير", price: "6", calories: "200" },
  { name: "علبة سلطة جبنة صغير", price: "3", calories: "180" },
  { name: "علبة سلطة جبنة وسط", price: "4", calories: "200" },
  { name: "علبة سلطة جبنة كبير", price: "6", calories: "220" },
];

export const dishItems: MenuItem[] = [
  { name: "فلافل 2 حبة", price: "1", calories: "120" },
  { name: "حبة بيض مسلوق", price: "1.5", calories: "50" },
  { name: "طبق بيض اومليت وسط", price: "4", calories: "100" },
  { name: "طبق بيض اومليت كبير", price: "6", calories: "200" },
  { name: "بطاطس شبتي / أو صوابع صغير", price: "3", calories: "250" },
  { name: "بطاطس شبتي / أو صوابع كبير", price: "6", calories: "300" },
  { name: "بطاطس شبتي بالجبن", price: "3", calories: "250" },
];

export const platterItems: MenuItem[] = [
  { name: "علبة بابا غنوج صغير", price: "2.5", calories: "120" },
  { name: "علبة بابا غنوج وسط", price: "4", calories: "160" },
  { name: "علبة بابا غنوج كبير", price: "6", calories: "200" },
  { name: "علبة مسقعة صغير", price: "2.5", calories: "130" },
  { name: "علبة مسقعة وسط", price: "4", calories: "170" },
  { name: "علبة مسقعة كبير", price: "6", calories: "250" },
  { name: "علبة باذنجان حار صغير", price: "2.5", calories: "120" },
  { name: "علبة باذنجان حار وسط", price: "4", calories: "180" },
  { name: "علبة باذنجان حار كبير", price: "6", calories: "260" },
];

export const mainItems: MenuItem[] = [
  { name: "طبق مشكل مقالي كبير", price: "15", calories: "300" },
  { name: "طبق مشكل صغير", price: "10", calories: "250" },
  { name: "طبق ايدام صغير", price: "3", calories: "180" },
  { name: "طبق ايدام وسط", price: "5", calories: "200" },
  { name: "طبق ايدام كبير", price: "7", calories: "220" },
];

// Long item names here; rows are allowed to wrap to two or three lines.
export const mealItems: MenuItem[] = [
  {
    name: "نص دجاج مقلي مع نفر رز وخضار وسلطة وشورية",
    price: "26",
    calories: "1060",
  },
  {
    name: "ربع دجاج مقلي مع نفر رز وخضار وسلطة وشورية",
    price: "15",
    calories: "710",
  },
  {
    name: "ربع دجاج فرن مع بطاطس ونفر رز وسلطة وشورية",
    price: "26",
    calories: "1100",
  },
  {
    name: "نص دجاج فرن مع بطاطس ونفر رز وسلطة وشورية",
    price: "15",
    calories: "820",
  },
  {
    name: "طاجن بطاطس باللحم مع نفر رز وسلطة وشورية",
    price: "25",
    calories: "780",
  },
];

// Sandwiches. `subtitle` carries the ingredients line; the last four items on
// page two deliberately have none.
export const sandwichItemsA: MenuItem[] = [
  {
    name: "ساندوتش فول كلاسك",
    subtitle: "(فول + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش فول بالبيض",
    subtitle: "(فول + بيض + سلطة)",
    price: "3",
    calories: "335",
  },
  {
    name: "ساندوتش فلافل كلاسك",
    subtitle: "(فلافل + سلطة)",
    price: "2",
    calories: "280",
  },
  {
    name: "ساندوتش مشكل فلافل",
    subtitle: "(فلافل + سلطة + بطاطس + باذنجان)",
    price: "3",
    calories: "400",
  },
  {
    name: "ساندوتش مشكل فلافل بالبيض",
    subtitle: "(فلافل + سلطة)",
    price: "4",
    calories: "470",
  },
  {
    name: "ساندوتش مشكل صبة",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع)",
    price: "5",
    calories: "660",
  },
  {
    name: "ساندوتش مشكل (ديناميت)",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع + بيض)",
    price: "6",
    calories: "740",
  },
  {
    name: "ساندوتش بطاطس صوابع",
    subtitle: "(بطاطس صوابع + سلطة)",
    price: "3",
    calories: "280",
  },
  {
    name: "ساندوتش بطاطس شيبسي",
    subtitle: "(بطاطس شيبسي + سلطة)",
    price: "3",
    calories: "250",
  },
];

export const sandwichItemsB: MenuItem[] = [
  {
    name: "ساندوتش بيض مسلوق",
    subtitle: "(بيض مسلوق + سلطة)",
    price: "5",
    calories: "330",
  },
  {
    name: "ساندوتش بيض اوملیت",
    subtitle: "(بيض اومليت + سلطة)",
    price: "4",
    calories: "230",
  },
  {
    name: "ساندوتش جبنة بالسلطة",
    subtitle: "(جبنة + سلطة)",
    price: "3",
    calories: "220",
  },
  {
    name: "ساندوتش بابا غنوج",
    subtitle: "(بابا غنوج + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش زهرة",
    subtitle: "(زهرة + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش عجة",
    subtitle: "(عجة بالبيض + سلطة)",
    price: "5",
    calories: "350",
  },
  { name: "ساندوتش جبنة بالسلطة بالبيض", price: "4", calories: "300" },
  { name: "ساندوتش بطاطس صوابع بالبيض", price: "5", calories: "350" },
  { name: "ساندوتش بطاطس شيبسي بالبيض", price: "5", calories: "350" },
  { name: "ساندوتش بتنجان مقلي مع سلطة وطحينة", price: "2", calories: "230" },
  { name: "ساندوتش بطاطس بانية مع سلطة وطحينة", price: "3", calories: "300" },
];

// Notes shown under the rows of their respective menu pages.
export const MAINS_NOTE =
  "يوجد كل يوم ثلاثة أصناف إضافية متنوعة حسب أسبقية الحجز";
export const MEALS_NOTE = "(بامية أو خضار مشكل أو بازلا حسب الطلب)";
export const SANDWICH_TAGLINE = "فول وفلافل ولاد البلد على اصوله";
