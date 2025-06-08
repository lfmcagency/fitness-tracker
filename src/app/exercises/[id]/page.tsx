'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  BarChart, 
  Calendar as CalendarIcon, 
  Check,
  ChevronRight,
  Dumbbell, 
  File,
  Flame, 
  Heart, 
  Info, 
  LineChart,
  List, 
  Mail,
  Pencil,
  PieChart,
  Plus,
  Salad, 
  Scale, 
  Search,
  Settings,
  Smartphone,
  Trophy,
  User
} from 'lucide-react';

// Import AppLayout
import AppLayout from "@/components/layout/AppLayout";

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
  TimeBlockContainer,
  CategoryPills,
  DetailExpander,
  MetricChart
} from '@/components/shared';

// Import UI components
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Flex } from '@/components/ui/flex';
import { Grid } from '@/components/ui/grid';
import { Input } from '@/components/ui/input';
import { Container, Section } from '@/components/ui/layout';
import Modal from '@/components/ui/Modal';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { TabGroup } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function DashboardPage() {
  // State for interactive components
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
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

  // Tab options
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'workouts', label: 'Workouts', badge: 3 },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'tasks', label: 'Tasks', badge: 8 },
  ];

  // Category options for CategoryPills
  const categoryOptions = [
    { id: 'all', label: 'All Categories' },
    { id: 'core', label: 'Core', badgeCount: 8 },
    { id: 'push', label: 'Push', badgeCount: 12 },
    { id: 'pull', label: 'Pull', badgeCount: 10 },
    { id: 'legs', label: 'Legs', badgeCount: 6 },
    { id: 'mobility', label: 'Mobility', badgeCount: 4 },
    { id: 'cardio', label: 'Cardio', badgeCount: 5 },
    { id: 'recovery', label: 'Recovery', badgeCount: 3 },
  ];

  // Example data for MetricChart
  const weightData = [
    { label: 'Jan', value: 78 },
    { label: 'Feb', value: 77.2 },
    { label: 'Mar', value: 76.5 },
    { label: 'Apr', value: 75.8 },
    { label: 'May', value: 75.5 },
    { label: 'Jun', value: 75.2 },
    { label: 'Jul', value: 74.8 },
  ];

  const categoryData = [
    { label: 'Core', value: 75 },
    { label: 'Push', value: 60 },
    { label: 'Pull', value: 45 },
    { label: 'Legs', value: 30 },
    { label: 'Mobility', value: 15 },
  ];

  // Handler for filter changes
  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
    console.log('Filters changed:', filters);
  };

  // Handler for category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    console.log('Category selected:', categoryId);
  };

  return (
    <AppLayout title="Component Library" requireAuth={false}>
      <div className="mt-4 mb-20">
        <h1 className="text-xl font-medium mb-6">Kalos Component Library</h1>
        
        {/* DateNavigator Section */}
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Date Navigation</h2>
          <DateNavigator
            date={selectedDate}
            onDateChange={setSelectedDate}
            showToday={true}
            useRelativeDates={true}
          />
        </section>

        {/* New Components Section */}
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">New Components</h2>
          
          <div className="space-y-6">
            {/* CategoryPills */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">CategoryPills</h3>
              <div className="space-y-4">
                <CategoryPills 
                  categories={categoryOptions} 
                  selected={selectedCategory}
                  onSelect={handleCategorySelect}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Outline Variant</h4>
                    <CategoryPills 
                      categories={categoryOptions.slice(0, 4)} 
                      selected={selectedCategory}
                      onSelect={handleCategorySelect}
                      variant="outline"
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Minimal Variant</h4>
                    <CategoryPills 
                      categories={categoryOptions.slice(0, 4)} 
                      selected={selectedCategory}
                      onSelect={handleCategorySelect}
                      variant="minimal"
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Multi-Select (future)</h4>
                    <CategoryPills 
                      categories={categoryOptions.slice(0, 4)} 
                      selected={[categoryOptions[1].id, categoryOptions[3].id]}
                      onSelect={handleCategorySelect}
                      multiSelect={true}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* DetailExpander */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">DetailExpander</h3>
              <div className="space-y-4">
                <DetailExpander 
                  title="Default Expander"
                  defaultExpanded={true}
                >
                  <div className="space-y-2">
                    <p>This is the expanded content of the detail expander. It can contain any elements like text, images, or other components.</p>
                    <p>The content is only visible when the expander is in the expanded state.</p>
                  </div>
                </DetailExpander>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailExpander 
                    title="With Description"
                    description="This expander includes a description under the title"
                    icon={<Dumbbell className="w-5 h-5 text-[#6B6B6B]" />}
                    variant="outline"
                  >
                    <p>Content with icon and description.</p>
                  </DetailExpander>
                  
                  <DetailExpander 
                    title="Filled Variant"
                    variant="filled"
                    size="sm"
                  >
                    <p>Small size with filled background styling.</p>
                  </DetailExpander>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium mb-2">Group Behavior (only one open at a time)</h4>
                  <DetailExpander 
                    title="Group Item 1"
                    groupId="expander-group"
                    variant="minimal"
                  >
                    <p>Content for group item 1.</p>
                  </DetailExpander>
                  
                  <DetailExpander 
                    title="Group Item 2"
                    groupId="expander-group"
                    variant="minimal"
                  >
                    <p>Content for group item 2.</p>
                  </DetailExpander>
                  
                  <DetailExpander 
                    title="Group Item 3"
                    groupId="expander-group"
                    variant="minimal"
                  >
                    <p>Content for group item 3.</p>
                  </DetailExpander>
                </div>
              </div>
            </div>
            
            {/* MetricChart */}
            <div className="space-y-3">
              <h3 className="text-base font-medium">MetricChart</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricChart 
                    title="Weight History"
                    subtitle="Last 7 months"
                    chartType="line"
                    data={weightData}
                    xAxisLabel="Month"
                    yAxisLabel="Weight (kg)"
                    height={180}
                  />
                  
                  <MetricChart 
                    title="Category Progress"
                    subtitle="XP distribution by category"
                    chartType="pie"
                    data={categoryData}
                    height={180}
                  />
                </div>
                
                <MetricChart 
                  title="Monthly Performance"
                  subtitle="Exercises completed by category"
                  chartType="bar"
                  data={categoryData}
                  xAxisLabel="Category"
                  yAxisLabel="Exercises"
                  height={200}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricChart 
                    title="Empty Chart Example"
                    data={[]}
                    height={150}
                    showEmptyState={true}
                  />
                  
                  <MetricChart 
                    title="Loading Chart Example"
                    data={categoryData}
                    height={150}
                    loading={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Progress Indicators Section */}
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Progress Indicators</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-base font-medium">ProgressBar</h3>
              
              <div className="space-y-3">
                <ProgressBar value={75} showPercentage={true} label="Overall Progress" />
                <ProgressBar value={45} variant="success" size="sm" />
                <ProgressBar value={65} variant="warning" size="md" />
                <ProgressBar value={25} variant="danger" size="lg" label="Danger Zone" labelInside={true} />
              </div>
            </div>
            
            <div className="space-y-4">
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
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Stat Cards</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Status Badges</h2>
          
          <div className="space-y-4">
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
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Streak Indicators</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
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
            
            <div className="space-y-3">
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
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Search & Filter</h2>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-medium">SearchInput</h3>
              
              <SearchInput 
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search exercises, meals, tasks..."
                categories={searchCategories}
                suggestions={searchSuggestions}
                onSearch={(value, category) => console.log('Search:', value, category)}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            
            <div className="space-y-3">
              <h3 className="text-base font-medium">FilterBar</h3>
              
              <FilterBar 
                options={filterOptions}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                showSelectedPills={true}
                label="Filters"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-4">Time Blocks</h2>
          
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
              </div>} children={undefined}            />
          </div>
        </section>

        {/* UI Components Section */}
        <section className="mb-8 p-4 border border-[#E5E0DC] rounded-lg">
          <h2 className="text-lg font-medium mb-6">UI Components</h2>
          
          {/* Buttons */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button size="icon"><Settings className="h-4 w-4" /></Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          
          {/* Inputs */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Form Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Input</label>
                <Input placeholder="Enter text..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Textarea</label>
                <Textarea placeholder="Enter multiple lines..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Cards */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description or subtitle</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>This is the main content of the card. It can contain any elements.</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost">Cancel</Button>
                  <Button>Submit</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#E5E0DC] w-12 h-12 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <h3 className="font-medium">Simple Card</h3>
                      <p className="text-sm text-[#6B6B6B]">Without header and footer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Navigation</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Tabs</h4>
                <TabGroup 
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>
            </div>
          </div>
          
          {/* Alerts */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Alerts</h3>
            
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational alert to notify you about something.
                </AlertDescription>
              </Alert>
              
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Something went wrong. Please try again later.
                </AlertDescription>
              </Alert>
            </div>
          </div>
          
          {/* Dialogs & Modals */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-3">Dialogs & Modals</h3>
            
            <div className="flex gap-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      This is a description of the dialog and what it's used for.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Dialog content goes here. This can include forms, information, or other interactive elements.</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsDialogOpen(false)}>Continue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
              <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Example Modal">
                <div className="space-y-4">
                  <p>This is a simple modal dialog using the Modal component.</p>
                  <div className="flex justify-end">
                    <Button onClick={() => setIsModalOpen(false)}>Close</Button>
                  </div>
                </div>
              </Modal>
            </div>
          </div>
          
          {/* Popovers */}
          <div>
            <h3 className="text-base font-medium mb-3">Popovers</h3>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" /> 
                  Show Popover
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <h4 className="font-medium">Popover Title</h4>
                  <p className="text-sm">This is a popover with some content.</p>
                  <div className="pt-2">
                    <Button size="sm">Action</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}