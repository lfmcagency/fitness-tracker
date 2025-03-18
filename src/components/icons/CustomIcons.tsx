// src/components/icons/CustomIcons.tsx
import React from 'react';

// ARETE OPTIONS - Excellence, Achievement, Virtuous Growth

// Option 1: Summit/Peak with Star (Achievement & Excellence)
export const AreteIcon1 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L17 12H7L12 2Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 8L14 12H10L12 8Z" 
      fill="currentColor"
    />
    <path 
      d="M12 14L14.5 19L12 17.5L9.5 19L12 14Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Option 2: Laurel Wreath (Victory & Excellence in Greek tradition)
export const AreteIcon2 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle 
      cx="12" 
      cy="12" 
      r="3" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M12 5C10 5 6 7 6 12C6 13 6.5 15 8 17" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M12 5C14 5 18 7 18 12C18 13 17.5 15 16 17" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M12 19V21" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

// Option 3: Ascending Steps (Progressive Achievement)
export const AreteIcon3 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M4 20H8V16H12V12H16V8H20V4" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle 
      cx="20" 
      cy="4" 
      r="2" 
      stroke="currentColor" 
      strokeWidth="2"
    />
  </svg>
);

// SOMA OPTIONS - Physical Training, Body, Strength

// Option 1: Greek Athlete/Discus Thrower (Classical Body)
export const SomaIcon1 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle 
      cx="12" 
      cy="7" 
      r="3" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M8 22V13C8 11.8954 8.89543 11 10 11H14C15.1046 11 16 11.8954 16 13V22" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M5 15H8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M16 15H19" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

// Option 2: Spartan Shield/Helmet (Strength & Protection)
export const SomaIcon2 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path 
      d="M12 8V3" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Option 3: Pillars (Physical Structure & Support)
export const SomaIcon3 = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M6 4H10V20H6V4Z" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M14 4H18V20H14V4Z" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M4 4H20" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path 
      d="M4 20H20" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// The original improved icons (as alternatives)

// Improved Arete Icon - Mountain Peak/Steps of Achievement 
export const AreteIconImproved = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L20 18H4L12 2Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M8 10L12 6L16 10L12 14L8 10Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M8 18H16" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

// Improved Soma Icon - Body Strength/Movement
export const SomaIconImproved = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle 
      cx="12" 
      cy="6" 
      r="4" 
      stroke="currentColor" 
      strokeWidth="2" 
    />
    <path 
      d="M8 14L8 20" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M16 14L16 20" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M8 17H16" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M12 10L12 14" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
);

// Sisyphus Icon - Eternal Progress & Perseverance
export const SisyphusIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* The mountain/hill */}
      <path 
        d="M4 20L12 8L20 20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Sisyphus figure (simplified) */}
      <circle 
        cx="10" 
        cy="16" 
        r="1.5" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <path 
        d="M8.5 18L10 16.5L11.5 18" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M10 18V20" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      
      {/* The boulder */}
      <circle 
        cx="13" 
        cy="13" 
        r="2.5" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      
      {/* Push motion lines (optional) */}
      <path 
        d="M9 15.5L10 14.5" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  );
  
  // Alternative version with more details
  export const SisyphusIconDetailed = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* The mountain/hill */}
      <path 
        d="M3 20L12 6L21 20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Sisyphus figure (more detailed) */}
      <circle 
        cx="9.5" 
        cy="15.5" 
        r="1.5" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <path 
        d="M9.5 17L9.5 19" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M7.5 18L9.5 20L11.5 18" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M8 14.5L7 13" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M11 14.5L12.5 13" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      
      {/* The boulder */}
      <circle 
        cx="13.5" 
        cy="12" 
        r="3" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      
      {/* Path marks (showing progress) */}
      <path 
        d="M12 18L14 18" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeDasharray="1 2"
      />
      <path 
        d="M15 16L17 16" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeDasharray="1 2"
      />
    </svg>
  );
  // 1. Greek Phi Symbol - represents harmony and golden ratios
export const PhiMenuIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 3V21" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle 
      cx="12" 
      cy="12" 
      r="6" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M6 12H18" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

// 2. Greek Compass/Creation - represents design and perfect proportion
export const CompassMenuIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle 
      cx="12" 
      cy="12" 
      r="9" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M12 3V12" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M12 12L16.5 16.5" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle 
      cx="12" 
      cy="12" 
      r="1.5" 
      stroke="currentColor" 
      strokeWidth="1.5"
    />
  </svg>
);

// 3. Greek Key Pattern - classic meander pattern
export const GreekKeyMenuIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M5 8H12V12H19V16H12V12" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// 4. Spartan Shield - represents protection and strength
export const ShieldMenuIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 21C12 21 19 18 19 12V6L12 3L5 6V12C5 18 12 21 12 21Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 12H12.01" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round"
    />
  </svg>
);

// 5. Four Elements - representing the four domains in your app
export const FourElementsMenuIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect 
      x="3" 
      y="3" 
      width="8" 
      height="8" 
      rx="1" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <circle 
      cx="17" 
      cy="7" 
      r="4" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M13 17L21 17" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M17 13L17 21" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M3 17L11 21L3 21L3 17Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);