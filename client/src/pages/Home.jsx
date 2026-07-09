import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AboutSection from '../components/AboutSection';
import SocialProof from '../components/SocialProof';
import Features from '../components/Features';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="antialiased" style={{ color: 'var(--k-ink)', background: 'var(--k-white)' }}>

      {/* Sticky navbar — always white */}
      <Navbar />

      {/* Alternating white / grey bands */}
      <main className="k-bands">
        {/* Band 1 · WHITE  — Hero headline + animated dashboard */}
        <Hero />

        {/* Band 2 · GREY   — About Kayaara Section */}
        <AboutSection />

        {/* Band 3 · WHITE  — Industry expertise cards */}
        <SocialProof />

        {/* Band 3 · WHITE  — Platform capabilities */}
        <Features />

        {/* Band 4 · GREY   — Footer */}
        <Footer />
      </main>

    </div>
  );
};

export default HomePage;