'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  BarChart, 
  Calendar, 
  Dumbbell, 
  Flame, 
  Heart, 
  Info, 
  List, 
  Salad, 
  Scale, 
  Trophy,
  User
} from 'lucide-react';

// Import shared components
import { 
  ProgressBar, 
  ProgressRing,
  StatCard,
  StatusBadge,
  DateNavigator,
  FilterBar,
  StreakIndicator,
  SearchInput,
  TimeBlockContainer
} from '@/components/shared';

export default function DashboardPage() {
  // State for interactive components
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Example filter options
  const filterOptions = [
    { id: 'completed', label: 'Completed', group: 'status' },
    { id: 'incomplete', label: 'Incomplete', group: 'status' },
    { id: 'high', label: 'High Priority', group: 'priority' },
    { id: 'medium', label: 'Medium Priority', group: 'priority' },
    { id: 'low', label: 'Low Priority', group: 'priority' },
    { id: 'nous', label: 'Nous', group: 'category' },
    { id: 'soma', label: 'Soma', group: 'category' },
    { id: 'trophe', label: 'Trophe', group: 'category' },
  ];

  // Example search categories
  const searchCategories = [
    { id: 'exercises', label: 'Exercises', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'meals', label: 'Meals', icon: <Salad className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <List className="w-4 h-4" /> },
  ];

  // Example search suggestions
  const searchSuggestions = [
    { id: '1', label: 'Push-up', description: 'Beginner push exercise', category: 'Push', icon: <Dumbbell className="w-4 h-4" /> },
    { id: '2', label: 'Hollow hold', description: 'Core exercise', category: 'Core', icon: <Dumbbell className="w-4 h-4" /> },
    { id: '3', label: 'Protein shake', description: '25g protein, 2g fat', category: 'Nutrition', icon: <Salad className="w-4 h-4" /> },
  ];

  // Handler for filter changes
  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
    console.log('Filters changed:', filters);
  };

  return (
    <div className="min-h-screen bg-[#F7F3F0] p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Kalos Shared Components</h1>
      
      {/* DateNavigator Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Date Navigation</h2>
        <DateNavigator
          date={selectedDate}
          onDateChange={setSelectedDate}
          showToday={true}
          useRelativeDates={true}
        />
      </section>

      {/* Progress Indicators Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Progress Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-base font-medium">ProgressBar</h3>
            
            <div className="space-y-4">
              <ProgressBar value={75} showPercentage={true} label="Overall Progress" />
              <ProgressBar value={45} variant="success" size="sm" />
              <ProgressBar value={65} variant="warning" size="md" />
              <ProgressBar value={25} variant="danger" size="lg" label="Danger Zone" labelInside={true} />
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-base font-medium">ProgressRing</h3>
            
            <div className="flex flex-wrap gap-4 items-center justify-center">
              <ProgressRing value={75} showPercentage={true} />
              <ProgressRing value={45} variant="success" size={80} thickness={8} />
              <ProgressRing value={65} variant="warning" size={50} label={<Heart className="w-5 h-5 text-[#A4907C]" />} />
              <ProgressRing value={25} variant="danger" size={100} thickness={12} label="25%" labelSize="lg" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Stat Cards Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Stat Cards</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard 
            title="Total XP" 
            value="1,250" 
            previousValue="980" 
            icon={<Trophy className="w-5 h-5" />} 
          />
          
          <StatCard 
            title="Weight" 
            value="75.5" 
            unit="kg" 
            previousValue="77.2" 
            changeFormat="absolute" 
            icon={<Scale className="w-5 h-5" />} 
          />
          
          <StatCard 
            title="Daily Tasks" 
            value="8/12" 
            previousValue="6/12" 
            changeFormat="percentage" 
            icon={<List className="w-5 h-5" />} 
            variant="outline"
          />
          
          <StatCard 
            title="Workout Streak" 
            value="14" 
            unit="days" 
            previousValue="7" 
            icon={<Flame className="w-5 h-5" />} 
            size="lg"
          />
          
          <StatCard 
            title="Activity Level" 
            value="Medium" 
            previousValue="Low" 
            changeFormat="none" 
            icon={<Activity className="w-5 h-5" />} 
            variant="filled"
          />
          
          <StatCard 
            title="Protein Intake" 
            value="85%" 
            previousValue="72%" 
            icon={<Salad className="w-5 h-5" />} 
            size="sm"
          />
        </div>
      </section>
      
      {/* Status Badges Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Status Badges</h2>
        
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="success" text="Completed" />
            <StatusBadge status="error" text="Failed" />
            <StatusBadge status="warning" text="Needs Attention" />
            <StatusBadge status="pending" text="In Progress" />
            <StatusBadge status="neutral" text="Neutral" />
            <StatusBadge status="active" text="Active" />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="success" variant="outline" />
            <StatusBadge status="error" variant="outline" />
            <StatusBadge status="warning" variant="outline" />
            <StatusBadge status="pending" variant="outline" />
            <StatusBadge status="neutral" variant="outline" />
            <StatusBadge status="active" variant="outline" />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="success" iconOnly={true} size="lg" />
            <StatusBadge status="error" iconOnly={true} size="lg" />
            <StatusBadge status="warning" iconOnly={true} size="lg" />
            <StatusBadge status="pending" iconOnly={true} size="lg" pulse={true} />
            <StatusBadge status="active" iconOnly={true} size="lg" pulse={true} />
          </div>
        </div>
      </section>
      
      {/* Streak Indicator Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Streak Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Short streak:</span>
              <StreakIndicator count={2} maxStreak={14} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Medium streak:</span>
              <StreakIndicator count={7} maxStreak={14} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Long streak:</span>
              <StreakIndicator count={14} maxStreak={14} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Epic streak:</span>
              <StreakIndicator count={30} maxStreak={30} />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Minimal variant:</span>
              <StreakIndicator count={7} variant="minimal" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Badge variant:</span>
              <StreakIndicator count={14} variant="badge" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">No flames:</span>
              <StreakIndicator count={21} showFlames={false} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Large size:</span>
              <StreakIndicator count={30} size="lg" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Search & Filter Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Search & Filter</h2>
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-base font-medium">SearchInput</h3>
            
            <SearchInput 
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search exercises, meals, tasks..."
              categories={searchCategories}
              suggestions={searchSuggestions}
              onSearch={(value, category) => console.log('Search:', value, category)}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <SearchInput 
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Outline variant"
                variant="outline"
                size="sm"
              />
              
              <SearchInput 
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Minimal variant"
                variant="minimal"
                size="lg"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-base font-medium">FilterBar</h3>
            
            <FilterBar 
              options={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              showSelectedPills={true}
              label="Filters"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <FilterBar 
                options={filterOptions.filter(f => f.group === 'priority')}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                label="Priority"
                variant="outline"
                showSelectedPills={false}
              />
              
              <FilterBar 
                options={filterOptions.filter(f => f.group === 'status')}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                label="Status"
                variant="minimal"
                showSelectedPills={false}
              />
              
              <FilterBar 
                options={filterOptions.filter(f => f.group === 'category')}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                label="Category"
                showSelectedPills={false}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Time Block Section */}
      <section className="mb-12 p-6 border border-[#E5E0DC] rounded-lg">
        <h2 className="text-xl font-medium mb-4">Time Blocks</h2>
        
        <div className="space-y-2">
          <TimeBlockContainer 
            title="Morning" 
            timeRange="6:00 - 12:00" 
            showAddButton={true}
            onAdd={() => console.log('Add morning item')}
          >
            <div className="p-4 border border-[#E5E0DC] rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Morning Meditation</h4>
                <StreakIndicator count={7} variant="minimal" size="sm" />
              </div>
              <p className="text-sm text-[#6B6B6B]">10 minutes mindfulness practice</p>
            </div>
            
            <div className="p-4 border border-[#E5E0DC] rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Strength Training</h4>
                <StatusBadge status="pending" size="sm" />
              </div>
              <p className="text-sm text-[#6B6B6B]">Upper body focus</p>
            </div>
          </TimeBlockContainer>
          
          <TimeBlockContainer 
            title="Afternoon" 
            timeRange="12:00 - 18:00" 
            showAddButton={true}
            onAdd={() => console.log('Add afternoon item')}
          >
            <div className="p-4 border border-[#E5E0DC] rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Healthy Lunch</h4>
                <StatusBadge status="success" size="sm" />
              </div>
              <p className="text-sm text-[#6B6B6B]">Balanced macros with protein focus</p>
            </div>
          </TimeBlockContainer>
          
          <TimeBlockContainer 
            title="Evening"
            timeRange="18:00 - 23:00"
            showAddButton={true}
            onAdd={() => console.log('Add evening item')}
            isEmpty={true}
            emptyContent={<div className="text-center">
              <Info className="w-8 h-8 text-[#6B6B6B] mx-auto mb-2" />
              <p className="text-sm text-[#6B6B6B]">Nothing planned for the evening</p>
              <button className="mt-2 text-[#1A1A1A] underline text-sm">Add evening activity</button>
            </div>} children={undefined}          />
        </div>
      </section>
    </div>
  );
}