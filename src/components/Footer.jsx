import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-surface-800 border-t border-surface-600 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
                A
              </div>
              <span className="text-xl font-extrabold text-white">AuraLMS</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Premium online education platform empowering students and professionals with expert-led courses, live classes, and AI-powered learning.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link to="/courses" className="text-slate-400 hover:text-primary-400 text-sm transition">Browse Courses</Link></li>
              <li><Link to="/register" className="text-slate-400 hover:text-primary-400 text-sm transition">Get Started</Link></li>
              <li><Link to="/login" className="text-slate-400 hover:text-primary-400 text-sm transition">Sign In</Link></li>
              <li><Link to="/dashboard" className="text-slate-400 hover:text-primary-400 text-sm transition">Dashboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2.5">
              <li><span className="text-slate-400 text-sm">Live Classes</span></li>
              <li><span className="text-slate-400 text-sm">AI Doubt Solver</span></li>
              <li><span className="text-slate-400 text-sm">Assignments</span></li>
              <li><span className="text-slate-400 text-sm">Study Materials</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2.5">
              <li className="text-slate-400 text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@auralms.com</span>
              </li>
              <li className="text-slate-400 text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-surface-600 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} AuraLMS. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="text-slate-500 text-xs hover:text-slate-300 transition cursor-pointer">Privacy Policy</span>
            <span className="text-slate-500 text-xs hover:text-slate-300 transition cursor-pointer">Terms of Service</span>
            <span className="text-slate-500 text-xs hover:text-slate-300 transition cursor-pointer">Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
