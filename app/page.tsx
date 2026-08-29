import MenuBook from "@/components/menu-book";
import { CartProvider } from "@/components/cart/cart-context";
import { CartBar } from "@/components/cart/cart-bar";

export default function Home() {
  return (
    <CartProvider>
      <main className="book-stage">
        <MenuBook />
      </main>
      {/* Siblings of the book: react-pageflip never owns these nodes, so the
          page's overflow:hidden cannot clip the sheet. */}
      <CartBar />
    </CartProvider>
  );
}
