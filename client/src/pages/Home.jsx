import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import SocialProof from '../components/SocialProof';
import Features from '../components/Features';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    /* Using 'antialiased' for sharper text rendering on light backgrounds */
    <div className="font-['Sora'] text-slate-900 bg-slate-50 antialiased">

      {/* 1. Header & Navigation: High-contrast logo and orange pill bar */}
      <Navbar />

      {/* 2. Main Content Wrapper */}
      <main>
        {/* Hero: Large typography and expanded dashboard visual */}
        <Hero />

        {/* Social Proof: Metric boxes with dark border (border-t-2 border-slate-300) */}
        <SocialProof />

        {/* Features: Value propositions with matching box styling */}
        <Features />
      </main>

      {/* 3. Footer: Organized solutions, contact, and social links */}
      <Footer />

    </div>
  );
};

export default HomePage;