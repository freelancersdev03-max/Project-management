import React from "react";
import { Globe, Sun, Share2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white pt-16 pb-8 border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Column 1: Brand */}
          <div>
            <img src="/logo/1500x1500.jpg.svg" alt="Kayaara Logo" className="h-8 md:h-9 w-auto mb-4" />
            <p className="text-slate-500 text-sm font-light leading-relaxed max-w-xs">
              Engineering the future of collaborative productivity for modern enterprises.
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">Features</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">API Documentation</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">Security</a></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">Terms of Service</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-light">Contact Support</a></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="text-slate-500 text-sm font-light">info@kayaara.com</li>
              <li className="text-slate-500 text-sm font-light">Ahmedabad, Gujarat, India.</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-xs font-light">
            © {new Date().getFullYear()} Kayaara Innovation Pvt Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <Globe size={16} className="cursor-pointer hover:text-slate-900 transition-colors" />
            <Sun size={16} className="cursor-pointer hover:text-slate-900 transition-colors" />
            <Share2 size={16} className="cursor-pointer hover:text-slate-900 transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;