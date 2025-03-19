'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { colors } from '@/lib/colors';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectPath = '/dashboard',
}) => {
  const router = useRouter();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Validation state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  // Check password strength
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };
  
  // Check if passwords match
  const checkPasswordsMatch = () => {
    if (confirmPassword === '') {
      setPasswordsMatch(true);
      return;
    }
    
    setPasswordsMatch(password === confirmPassword);
  };
  
  // Update password and check strength
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
    
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    }
  };
  
  // Update confirm password and check if matches
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordsMatch(password === newConfirmPassword);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 2) {
      setError('Please use a stronger password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the register API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Handle successful registration
      setSuccess('Registration successful! Redirecting...');
      
      // Give user time to see success message before redirecting
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectPath);
        }
      }, 1500);
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  // Get color for password strength indicator
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return colors.statusDanger;
    if (passwordStrength === 1) return colors.statusDanger;
    if (passwordStrength === 2) return colors.statusWarning;
    if (passwordStrength === 3) return colors.statusInfo;
    return colors.statusSuccess;
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-500">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-kalos-text block">
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            disabled={isLoading}
            className="w-full border-kalos-border focus-visible:ring-kalos-text"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-kalos-text block">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className="w-full border-kalos-border focus-visible:ring-kalos-text"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-kalos-text block">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={checkPasswordsMatch}
              placeholder="Create a password"
              disabled={isLoading}
              className="w-full border-kalos-border focus-visible:ring-kalos-text pr-10"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-kalos-muted hover:text-kalos-text"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-kalos-muted">Password strength</span>
                <span className="text-xs font-medium">
                  {passwordStrength === 0 && 'Very Weak'}
                  {passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Medium'}
                  {passwordStrength === 3 && 'Strong'}
                  {passwordStrength === 4 && 'Very Strong'}
                </span>
              </div>
              <div className="w-full h-1 bg-kalos-border rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(passwordStrength / 4) * 100}%`,
                    backgroundColor: getPasswordStrengthColor(),
                  }}
                />
              </div>
              <p className="text-xs text-kalos-muted mt-1">
                Use at least 8 characters with uppercase letters, numbers & symbols
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-kalos-text block">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onBlur={checkPasswordsMatch}
              placeholder="Confirm your password"
              disabled={isLoading}
              className={`w-full border-kalos-border focus-visible:ring-kalos-text pr-10 ${
                confirmPassword && !passwordsMatch ? 'border-red-500' : ''
              }`}
              required
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-kalos-muted hover:text-kalos-text"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isLoading || (confirmPassword !== '' && !passwordsMatch)}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-kalos-text hover:bg-kalos-darkText focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kalos-text ${
              isLoading || (confirmPassword !== '' && !passwordsMatch)
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-kalos-muted">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-kalos-text font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;