
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/logo-icon.jpg" 
                alt="LearnGen Logo" 
                className="w-9 h-9 rounded-xl object-cover shadow-glow" 
              />
              <span className="text-xl font-extrabold text-white">
                Learn<span className="text-primary-light">Gen</span>
              </span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed">
              Premium online education platform empowering students and professionals with expert-led courses, live classes, and AI-powered learning.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link to="/courses" className="text-text-muted hover:text-primary-light text-sm transition">Browse Courses</Link></li>
              <li><Link to="/register" className="text-text-muted hover:text-primary-light text-sm transition">Get Started</Link></li>
              <li><Link to="/login" className="text-text-muted hover:text-primary-light text-sm transition">Sign In</Link></li>
              <li><Link to="/dashboard" className="text-text-muted hover:text-primary-light text-sm transition">Dashboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2.5">
              <li><span className="text-text-muted text-sm">Live Classes</span></li>
              <li><span className="text-text-muted text-sm">AI Doubt Solver</span></li>
              <li><span className="text-text-muted text-sm">Assignments</span></li>
              <li><span className="text-text-muted text-sm">Study Materials</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2.5">
              <li className="text-text-muted text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@learngen.com</span>
              </li>
              <li className="text-text-muted text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-xs">
            © {new Date().getFullYear()} LearnGen. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="text-text-muted text-xs hover:text-slate-300 transition cursor-pointer">Privacy Policy</span>
            <span className="text-text-muted text-xs hover:text-slate-300 transition cursor-pointer">Terms of Service</span>
            <span className="text-text-muted text-xs hover:text-slate-300 transition cursor-pointer">Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
