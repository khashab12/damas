"use client";

export type MenuItem = {
  /** اسم الصنف */
  name: string;
  /** المكونات - سطر صغير تحت الاسم، اختياري */
  subtitle?: string;
  /** السعر بالريال */
  price: string;
  /** السعرات الحرارية */
  calories: string;
};

interface MenuCardProps {
  title: string;
  items: MenuItem[];
  /** Optional small muted note rendered under the rows. */
  note?: string;
  className?: string;
}

/**
 * A printed-menu style card: gold header bar, then a right-to-left list of
 * rows split into name | price | calories.
 *
 * Colours and fonts come from the shared brand tokens defined in globals.css
 * (--brand-red, --brand-gold, --font-tajawal, --font-cairo); nothing is
 * hardcoded here.
 */
export function MenuCard({ title, items, note, className }: MenuCardProps) {
  return (
    <div className={`menu-card ${className ?? ""}`} dir="rtl">
      <div className="menu-card-head">{title}</div>

      <div className="menu-card-body">
        <div className="menu-row menu-row-head">
          <span className="menu-cell-name" />
          <span className="menu-cell-price">ريال SAR</span>
          <span className="menu-cell-cal">السعرات الحرارية</span>
        </div>

        {items.map((item) => (
          <div className="menu-row" key={item.name}>
            {/* The name cell is a column so an optional ingredients line can
                sit under the name without affecting the price/calorie
                columns; rows with and without a subtitle stay aligned. */}
            <span className="menu-cell-name">
              <span className="menu-name-text">{item.name}</span>
              {item.subtitle ? (
                <span className="menu-name-sub">{item.subtitle}</span>
              ) : null}
            </span>
            <span className="menu-cell-price">
              <span className="menu-price-value">{item.price}</span>
              <span className="menu-price-unit">SAR</span>
            </span>
            <span className="menu-cell-cal">{item.calories}</span>
          </div>
        ))}

        {note ? <p className="menu-note">{note}</p> : null}
      </div>
    </div>
  );
}

export default MenuCard;
