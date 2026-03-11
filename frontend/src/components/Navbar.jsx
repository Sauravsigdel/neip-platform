import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="bg-emerald-700 text-white shadow-md fixed top-0 w-full z-50 h-16 flex items-center">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="text-xl font-bold tracking-wider">
          <Link to="/">NEIP</Link>
        </div>
        <nav className="flex space-x-6 font-medium">
          <Link to="/" className="hover:text-amber-300 transition-colors">Home</Link>
          <Link to="/map" className="hover:text-amber-300 transition-colors">Map</Link>
          <Link to="/dashboard" className="hover:text-amber-300 transition-colors">Analytics</Link>
          <Link to="/advisory" className="hover:text-amber-300 transition-colors">AI Advisory</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
