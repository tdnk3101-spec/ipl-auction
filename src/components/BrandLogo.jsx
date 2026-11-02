import React from 'react';

export default function BrandLogo({ className = 'w-8 h-8', showText = false, textClassName = 'text-lg font-black' }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/logo.svg"
        alt="Crick Auction Logo"
        className={`${className} object-contain transition-transform hover:scale-105`}
      />
      {showText && (
        <span className={`tracking-tight uppercase bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent ${textClassName}`}>
          Crick Auction
        </span>
      )}
    </div>
  );
}

