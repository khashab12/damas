import MenuBook from "@/components/menu-book";
import { CartBar } from "@/components/cart/cart-bar";

export default function Home() {
  return (
    <>
      <main className="book-stage">
        <MenuBook />
      </main>
      {/* Sibling of the book: react-pageflip never owns these nodes, so the
          page's overflow:hidden cannot clip the sheet. */}
      <CartBar />
    </>
  );
}
