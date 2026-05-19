// =====================================================================
// frontend/src/pages/NotFoundPage.jsx
// =====================================================================
import { Link } from 'react-router-dom';
import { Home, Printer } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="text-center animate-scale-in">
        <div className="text-8xl mb-4">🖨️</div>
        <h1 className="text-6xl font-display font-bold gradient-text mb-2">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-gray-400 mb-8">This page got lost in the print queue...</p>
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
