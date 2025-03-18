import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { colors } from '@/lib/colors';

export interface SearchCategory {
  /** Unique identifier for the category */
  id: string;
  /** Display name for the category */
  label: string;
  /** Icon to display (optional) */
  icon?: React.ReactNode;
}

export interface SearchOption {
  /** Unique identifier for the suggestion */
  id: string;
  /** Primary text to display */
  label: string;
  /** Secondary text for additional context */
  description?: string;
  /** Category this option belongs to */
  category?: string;
  /** Icon to display (optional) */
  icon?: React.ReactNode;
}

export interface SearchInputProps {
  /** Value of the search input */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when search is submitted */
  onSearch?: (value: string, category?: string) => void;
  /** Callback when a suggestion is selected */
  onOptionSelect?: (option: SearchOption) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Available search categories */
  categories?: SearchCategory[];
  /** Initial category ID */
  initialCategory?: string;
  /** Search suggestions */
  suggestions?: SearchOption[];
  /** Whether to show the clear button */
  showClear?: boolean;
  /** Visual variant */
  variant?: 'default' | 'outline' | 'minimal';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Automatically focus the input on mount */
  autoFocus?: boolean;
}

/**
 * SearchInput component for search functionality with suggestions
 */
export function SearchInput({
  value,
  onChange,
  onSearch,
  onOptionSelect,
  placeholder = 'Search...',
  categories = [],
  initialCategory,
  suggestions = [],
  showClear = true,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  autoFocus = false,
}: SearchInputProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Show suggestions when input is focused and there is input value
  useEffect(() => {
    setShowSuggestions(isFocused && value.length > 0 && suggestions.length > 0);
  }, [isFocused, value, suggestions]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value, selectedCategory);
    }
    setShowSuggestions(false);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (option: SearchOption) => {
    if (onOptionSelect) {
      onOptionSelect(option);
    }
    setShowSuggestions(false);
  };

  // Clear the input
  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Get the selected category object
  const getSelectedCategory = () => {
    return categories.find(category => category.id === selectedCategory);
  };

  // Determine size classes
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  // Determine variant classes
  const variantClasses = {
    default: `bg-${colors.kalosBg} border border-${colors.kalosBorder} focus-within:border-${colors.kalosText}`,
    outline: `bg-transparent border border-${colors.kalosText}`,
    minimal: `bg-transparent border-b border-${colors.kalosBorder} rounded-none focus-within:border-${colors.kalosText}`,
  };

  const selectedCat = getSelectedCategory();

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={cn(
            'flex items-center rounded-md transition-colors overflow-hidden',
            variantClasses[variant],
            sizeClasses[size],
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {/* Search icon */}
          <div className="flex items-center justify-center pl-3">
            <Search className={`w-4 h-4 text-${colors.kalosMuted}`} />
          </div>
          
          {/* Category selector (if categories provided) */}
          {categories.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className={cn(
                    "flex items-center h-full px-2 text-sm",
                    selectedCat ? `text-${colors.kalosText}` : `text-${colors.kalosMuted}`
                  )}
                  disabled={disabled}
                >
                  {selectedCat?.icon}
                  <span className="mx-1">{selectedCat?.label || 'All'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className={`w-48 p-1 bg-${colors.kalosBg} border-${colors.kalosBorder}`}>
                <div className="space-y-1">
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded text-sm hover:bg-${colors.kalosBorder} transition-colors",
                      !selectedCategory && `bg-${colors.kalosBorder} font-medium`
                    )}
                    onClick={() => handleCategorySelect('')}
                  >
                    All Categories
                  </button>
                  
                  {categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded text-sm hover:bg-${colors.kalosBorder} transition-colors flex items-center",
                        selectedCategory === category.id && `bg-${colors.kalosBorder} font-medium`
                      )}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      {category.icon && (
                        <span className="mr-2">{category.icon}</span>
                      )}
                      {category.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Divider between category and input (if categories) */}
          {categories.length > 0 && (
            <div className={`w-px h-5 bg-${colors.kalosBorder}`} />
          )}
          
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            className={cn(
              "flex-1 bg-transparent border-none outline-none px-3 py-2",
              disabled && "cursor-not-allowed"
            )}
            disabled={disabled}
          />
          
          {/* Clear button */}
          {showClear && value && (
            <button
              type="button"
              onClick={handleClear}
              className={`px-2 text-${colors.kalosMuted} hover:text-${colors.kalosText} transition-colors`}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions popover */}
        {showSuggestions && (
          <div className={`absolute z-10 w-full mt-1 border border-${colors.kalosBorder} rounded-md bg-${colors.kalosBg} shadow-sm max-h-60 overflow-auto`}>
            <div className="p-1">
              {suggestions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-${colors.kalosBorder} rounded transition-colors flex items-center`}
                  onClick={() => handleSuggestionClick(option)}
                >
                  {option.icon && (
                    <span className="mr-2">{option.icon}</span>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className={`text-xs text-${colors.kalosMuted}`}>{option.description}</div>
                    )}
                  </div>
                  {option.category && (
                    <div className={`text-xs text-${colors.kalosMuted} ml-2`}>{option.category}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default SearchInput;