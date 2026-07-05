import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    /* Using 'antialiased' for sharper text rendering on light backgrounds. Switched to system sans-serif for professional look. */
    <div className="font-sans text-slate-900 bg-white antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Navigation */}
      <Navbar />

      <main>
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Features Grid */}
        <Features />

        {/* 4. Call to Action */}
        <CTA />
      </main>

      {/* 5. Footer */}
      <Footer />

    </div>
  );
};

export default HomePage;