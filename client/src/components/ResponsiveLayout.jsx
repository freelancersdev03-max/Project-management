import React from 'react';
import Sidebar from './Sidebar';

/**
 * ResponsiveLayout Component
 * 
 * Provides a consistent layout wrapper for all authenticated pages.
 * - Mobile: Hamburger menu + full-width content
 * - Tablet/Laptop: Collapsible sidebar + responsive content
 * - Desktop (13"+ screens): Always-visible sidebar + optimized content
 * 
 * Usage:
 * <ResponsiveLayout>
 *   <YourPageContent />
 * </ResponsiveLayout>
 */
const ResponsiveLayout = ({ children, className = '' }) => {
  return (
    <div className="h-screen w-screen bg-white antialiased font-sans flex overflow-hidden">
      {/* Sidebar - Hidden on mobile (md:hidden), shown on desktop (md:flex) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className={`
        flex-1 
        overflow-y-auto 
        transition-all 
        duration-300 
        py-3 sm:py-4 md:py-4 
        space-y-4 sm:space-y-6 md:space-y-8
        animate-in 
        fade-in 
        duration-700
        ${className}
      `}>
        {/* Content Container with Responsive Padding */}
        <div className="max-w-full lg:max-w-[1400px] xl:max-w-[1600px] mx-auto px-2 sm:px-3 md:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveLayout;
