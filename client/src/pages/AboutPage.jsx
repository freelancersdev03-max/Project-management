import React from "react";
import Navbar from "../components/Navbar";
import AboutSection from "../components/AboutSection";
import Footer from "../components/Footer";

const AboutPage = () => {
  return (
    <div className="antialiased" style={{ color: "var(--k-ink)", background: "var(--k-white)" }}>
      <Navbar />
      <main className="k-bands">
        <AboutSection />
        <Footer />
      </main>
    </div>
  );
};

export default AboutPage;
