import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import {
  TechzaAboutOverview,
  TechzaFunFacts,
  TechzaWhyChooseUs,
  TechzaWorkProcess,
  TechzaFAQSection
} from '../components/AboutSection';
import SocialProof from '../components/SocialProof';
import Features from '../components/Features';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="antialiased" style={{ color: 'var(--k-ink)', background: 'var(--k-white)' }}>

      {/* Sticky navbar — Techza header style */}
      <Navbar />

      {/* Full Techza Homepage Flow */}
      <main className="k-bands">
        {/* 1. Hero Banner */}
        <Hero />

        {/* 2. About Our Company Overview Section */}
        <TechzaAboutOverview />

        {/* 3. Industry Expertise Cards (SocialProof) */}
        <SocialProof />

        {/* 4. Fun Facts / Success Counters Section (Dark Navy) */}
        <TechzaFunFacts />

        {/* 5. System Capabilities Sandbox (Features) */}
        <Features />

        {/* 6. Why Choose Us / Outstanding Features */}
        <TechzaWhyChooseUs />

        {/* 7. Work Process Section (01 -> 04 Steps) */}
        <TechzaWorkProcess />

        {/* 8. Frequently Asked Questions (FAQ Accordion) */}
        <TechzaFAQSection />

        {/* 9. Footer with Newsletter & CTA */}
        <Footer />
      </main>

    </div>
  );
};

export default HomePage;