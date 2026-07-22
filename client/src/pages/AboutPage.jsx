import React from "react";
import Navbar from "../components/Navbar";
import {
  TechzaAboutOverview,
  TechzaFunFacts,
  TechzaWhyChooseUs,
  TechzaWorkProcess,
  TechzaFAQSection
} from "../components/AboutSection";
import Footer from "../components/Footer";

const AboutPage = () => {
  return (
    <div className="antialiased" style={{ color: "var(--k-ink)", background: "var(--k-white)" }}>
      <Navbar />
      <main className="k-bands">
        <TechzaAboutOverview />
        <TechzaFunFacts />
        <TechzaWhyChooseUs />
        <TechzaWorkProcess />
        <TechzaFAQSection />
        <Footer />
      </main>
    </div>
  );
};

export default AboutPage;
