import React from "react";
import Navbar from "../components/Navbar";
import Products from "../components/Products";
import Footer from "../components/Footer";

const ProductsPage = () => {
  return (
    <div className="antialiased" style={{ color: "var(--k-ink)", background: "var(--k-white)" }}>
      <Navbar />
      <main className="k-bands">
        <Products />
        <Footer />
      </main>
    </div>
  );
};

export default ProductsPage;
