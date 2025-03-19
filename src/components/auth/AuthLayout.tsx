import React from 'react';
import Link from 'next/link';
import { colors } from '@/lib/colors';

interface AuthLayoutProps {
  /** Main content */
  children: React.ReactNode;
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Background image URL (optional) */
  backgroundImage?: string;
}

/**
 * AuthLayout component - Provides consistent layout for authentication pages
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  backgroundImage
}) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-kalos-bg">
      {/* Left side - Logo & branding on mobile, logo & image on desktop */}
      <div className="md:w-5/12 lg:w-6/12 relative">
        <div 
          className={`h-full w-full bg-cover bg-center hidden md:block`}
          style={{
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
            backgroundColor: backgroundImage ? 'transparent' : '#1A1A1A'
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-8 left-8">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl tracking-wide font-heading text-white">
                kalos
              </h1>
            </Link>
          </div>
        </div>
        
        {/* Mobile header */}
        <div className="p-6 flex items-center justify-center md:hidden">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl tracking-wide font-heading text-kalos-text">
              kalos
            </h1>
          </Link>
        </div>
      </div>
      
      {/* Right side - Auth form content */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 md:max-w-md lg:max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium text-kalos-text">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-sm text-kalos-muted">{subtitle}</p>
          )}
        </div>
        
        <div className="w-full">
          {children}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-kalos-muted">
          <p>&copy; {new Date().getFullYear()} Kalos. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;