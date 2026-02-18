import React from "react";
import { Linkedin, Youtube, Instagram, Facebook, Phone, MapPin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t-2 border-blue-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Column 1: Brand & Address */}
          <div className="space-y-6">
            <h4 className="text-xl font-black tracking-tighter text-slate-900">
              <img src="HqeplLOGO.png" alt="Here Quality Excellence" className="h-12 w-auto object-contain mb-2 h-20 w-3xl" />
            </h4>
            <div className="flex gap-3 text-slate-500">
              <MapPin size={24} className="text-blue-600 shrink-0" />
              <p className=" leading-relaxed font-light text-[20px]">
                401, Sahyog Elina, Above Reliance Digital, VIP Road, Karelibaugh, Vadodara - 390018, Gujarat
              </p>
            </div>
          </div>

          {/* Column 2: Key Solutions */}
          <div className="space-y-6">
            <h4 className="text-[22px] font-bold uppercase tracking-[0.2em] text-slate-900">Solutions</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-light">
              <li className="hover:text-blue-700 transition-colors text-[18px] cursor-pointer">Business Automation</li>
              <li className="hover:text-blue-700 transition-colors text-[18px] cursor-pointer">Advanced Sales Projects</li>
              <li className="hover:text-blue-700 transition-colors text-[18px] cursor-pointer">Theory of Constraints (TOC)</li>
              <li className="hover:text-blue-700 transition-colors text-[18px] cursor-pointer">Lean Six Sigma & ISO</li>
              <li className="hover:text-blue-700 transition-colors text-[18px] cursor-pointer">Sustainability (ESG)</li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-6">
            <h4 className="text-[22px] font-bold uppercase tracking-[0.2em] text-slate-900">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-blue-600 " />
                <span className="text-[18px]">+91 98240 11121</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-blue-600" />
                <span className="text-[18px]">info@hqepl.com</span>
              </div>
            </div>
          </div>

          {/* Column 4: Social Links */}
          <div className="space-y-6">
            <h4 className="text-[22px] font-bold uppercase tracking-[0.2em] text-slate-900">Follow Us</h4>
            <div className="flex gap-4">
              {[
                { icon: <Linkedin size={20} />, link: "https://www.linkedin.com/company/here-quality-excellence-pvt-ltd/" },
                { icon: <Youtube size={20} />, link: "https://www.youtube.com/@businessherequality4476" },
                { icon: <Instagram size={20} />, link: "https://www.instagram.com/herequality/?igshid=YmMyMTA2M2Y%3D" },
                { icon: <Facebook size={20} />, link: "https://www.facebook.com/herequalitymanagementconsulting?mibextid=LQQJ4d" }
              ].map((social, i) => (
                <a key={i} href={social.link} className="w-10 h-10 rounded-full border border-blue-100 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-blue-100 flex flex-col md:row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2026 HQEPL Solutions. Built for Excellence.
          </p>
          <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;