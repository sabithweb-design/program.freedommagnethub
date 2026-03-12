'use client';

import React from 'react';

export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Magnet Body */}
        <path 
          d="M20 30V55C20 71.5685 33.4315 85 50 85C66.5685 85 80 71.5685 80 55V30H60V55C60 60.5228 55.5228 65 50 65C44.4772 65 40 60.5228 40 55V30H20Z" 
          fill="#333333"
        />
        {/* Blue Tip */}
        <rect x="20" y="15" width="20" height="15" fill="#2E3192" />
        {/* Red Tip */}
        <rect x="60" y="15" width="20" height="15" fill="#ED1C24" />
        {/* Center Person Dot */}
        <circle cx="50" cy="45" r="8" fill="#333333" />
        {/* Stylized Waves/Swooshes */}
        <path 
          d="M25 50C25 50 35 70 50 70C65 70 75 50 75 50C75 50 65 60 50 60C35 60 25 50 25 50Z" 
          fill="#4D4D4D" 
          opacity="0.5" 
        />
      </svg>
    </div>
  );
}
