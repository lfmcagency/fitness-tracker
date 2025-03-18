// src/lib/colors.ts

/**
 * Global color definitions for Kalos
 * Use these constants instead of hardcoded color values
 */
export const colors = {
    // Status colors
    statusPrimary: '#1D3461',    // Dark blue
    statusSuccess: '#3F4531',    // Dark olive green
    statusInfo: '#7392B7',       // Steel blue
    statusWarning: '#CDC6AE',    // Light beige
    statusDanger: '#9D695A',     // Terracotta
    
    // Kalos base colors
    kalosBg: '#F7F3F0',
    kalosText: '#1A1A1A',
    kalosBorder: '#E5E0DC',
    kalosMuted: '#6B6B6B',
    kalosHighlight: '#E5E0DC',
    kalosDarkText: '#333333',
    
    // Time block colors
    timeBlockMorning: '#F9CF93',  // Soft orange/yellow
    timeBlockAfternoon: '#B5DEFF', // Light blue
    timeBlockEvening: '#D0A5C0',   // Muted purple
  
    // Streak colors
    streakBase: '#B85C38',      // Base orange
    streakLv1: '#A74A2A',       // Darker orange
    streakLv2: '#963B1D',       // Deep orange
    streakLv3: '#852C10',       // Very dark orange
    streakLv4: '#731D03',       // Almost red
  
    // Chart colors
    chartColors: ['#1A1A1A', '#7D8F69', '#A4907C', '#B85C38', '#6B6B6B'],
  };
  
  /**
   * Maps color constants to Tailwind CSS class names
   * Use this when you need a Tailwind class instead of a hex value
   */
  export const colorClasses = {
    // Status colors
    statusPrimary: 'status-primary',
    statusSuccess: 'status-success', 
    statusInfo: 'status-info',
    statusWarning: 'status-warning',
    statusDanger: 'status-danger',
    
    // Base colors
    bg: 'kalos-bg',
    text: 'kalos-text',
    border: 'kalos-border',
    muted: 'kalos-muted',
    highlight: 'kalos-highlight',
    
    // Time blocks
    morning: 'time-morning',
    afternoon: 'time-afternoon',
    evening: 'time-evening',
  };