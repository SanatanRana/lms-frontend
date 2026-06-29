
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl glow-teal animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl glow-amber animate-float" style={{ animationDelay: '-3s' }}></div>

      <div className="relative z-10 space-y-6 max-w-lg">
        {/* Animated 404 text */}
        <h1 className="text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-primary-600 to-accent-500 drop-shadow-md select-none animate-pulse">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Lost in Space?
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            The learning path you are looking for doesn't exist or has been moved. Let's get you back on track!
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold px-8 py-3.5 rounded-xl transition duration-300 shadow-lg shadow-primary-900/30 hover:shadow-primary-800/40 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
