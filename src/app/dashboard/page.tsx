"use client"

import { useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Container, Section } from "@/components/ui/layout"
import { TabGroup } from "@/components/ui/tabs"

import { Info, X, Check, ExternalLink, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react"

export default function ComponentsGallery() {
  // State for interactive components
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [selectValue, setSelectValue] = useState("")
  const [activeTab, setActiveTab] = useState("typography")
  
  const tabs = [
    { id: "typography", label: "Typography" },
    { id: "colors", label: "Colors" },
    { id: "layout", label: "Layout" },
    { id: "forms", label: "Forms" }
  ]

  return (
    <AppLayout title="Components" requireAuth={false}>
      <Container className="py-8">
        <h1 className="text-3xl font-light mb-8 tracking-wide">Kalos UI Components</h1>
        
        <p className="text-[#6B6B6B] mb-8">
          This gallery showcases the available UI components in the Kalos design system.
          Use this as a reference when building new features.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Left column */}
          <div className="space-y-10 md:col-span-2">
            {/* Typography */}
            <Section title="Typography" className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-3xl font-medium">Heading 1 (text-3xl)</h1>
                <h2 className="text-2xl font-medium">Heading 2 (text-2xl)</h2>
                <h3 className="text-xl font-medium">Heading 3 (text-xl)</h3>
                <h4 className="text-lg font-medium">Heading 4 (text-lg)</h4>
                <h5 className="text-base font-medium">Heading 5 (text-base)</h5>
                <h6 className="text-sm font-medium">Heading 6 (text-sm)</h6>
              </div>
              
              <div className="space-y-3">
                <p className="text-base">Regular paragraph text (text-base)</p>
                <p className="text-sm text-[#6B6B6B]">Small muted text (text-sm text-[#6B6B6B])</p>
                <p className="text-xs">Extra small text (text-xs)</p>
                <p><strong>Bold text</strong> and <em>italic text</em> examples</p>
              </div>
            </Section>
            
            {/* Buttons */}
            <Section title="Buttons" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-base font-medium mb-3">Button Variants</h4>
                  <div className="space-y-3">
                    <Button>Default Button</Button>
                    <Button variant="outline" className="block">Outline Button</Button>
                    <Button variant="secondary" className="block">Secondary Button</Button>
                    <Button variant="ghost" className="block">Ghost Button</Button>
                    <Button variant="link" className="block">Link Button</Button>
                    <Button variant="destructive" className="block">Destructive Button</Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-base font-medium mb-3">Button Sizes</h4>
                  <div className="space-y-3">
                    <Button size="sm">Small Button</Button>
                    <Button size="default" className="block">Default Button</Button>
                    <Button size="lg" className="block">Large Button</Button>
                    <Button size="icon" className="block"><Check className="h-4 w-4" /></Button>
                  </div>
                  
                  <h4 className="text-base font-medium mt-6 mb-3">Button States</h4>
                  <div className="space-y-3">
                    <Button disabled>Disabled Button</Button>
                    <Button className="block">
                      <Check className="mr-2 h-4 w-4" /> With Icon
                    </Button>
                  </div>
                </div>
              </div>
            </Section>
            
            {/* Forms */}
            <Section title="Form Controls" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="default-input" className="text-sm font-medium">
                      Default Input
                    </label>
                    <Input id="default-input" placeholder="Enter text..." />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="disabled-input" className="text-sm font-medium">
                      Disabled Input
                    </label>
                    <Input id="disabled-input" placeholder="Disabled input" disabled />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="textarea-example" className="text-sm font-medium">
                      Textarea
                    </label>
                    <Textarea id="textarea-example" placeholder="Enter longer text..." />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Input</label>
                    <Select value={selectValue} onValueChange={setSelectValue}>
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
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Picker</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {date ? date.toDateString() : "Pick a date"}
                          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </Section>
            
            {/* Cards */}
            <Section title="Cards" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Simple Card</CardTitle>
                    <CardDescription>Card with minimal content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>This is a basic card component example.</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Card with Footer</CardTitle>
                    <CardDescription>Includes actions in the footer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Cards can contain different types of content including text, images, and actions.</p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost">Cancel</Button>
                    <Button>Action</Button>
                  </CardFooter>
                </Card>
              </div>
            </Section>
            
            {/* Feedback */}
            <Section title="Feedback & Alerts" className="space-y-6">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This is an informational alert with neutral styling.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    This is a destructive alert for errors and warnings.
                  </AlertDescription>
                </Alert>
              </div>
            </Section>
          </div>
          
          {/* Right column */}
          <div className="space-y-10">
            {/* Colors */}
            <Section title="Color Palette" className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-[#1A1A1A] text-white rounded-md">
                  Primary - #1A1A1A
                </div>
                <div className="p-4 bg-[#F7F3F0] border border-[#E5E0DC] text-[#1A1A1A] rounded-md">
                  Background - #F7F3F0
                </div>
                <div className="p-4 bg-[#E5E0DC] text-[#1A1A1A] rounded-md">
                  Border - #E5E0DC
                </div>
                <div className="p-4 bg-white border border-[#E5E0DC] text-[#1A1A1A] rounded-md">
                  Card - White
                </div>
                <div className="p-4 bg-[#F7F3F0] text-[#6B6B6B] border border-[#E5E0DC] rounded-md">
                  Muted Text - #6B6B6B
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-base font-medium mb-2">Semantic Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-[#7D8F69] text-white rounded-md">
                    Success - #7D8F69
                  </div>
                  <div className="p-3 bg-[#A4907C] text-white rounded-md">
                    Warning - #A4907C
                  </div>
                  <div className="p-3 bg-[#B85C38] text-white rounded-md">
                    Error - #B85C38
                  </div>
                  <div className="p-3 bg-[#6B6B6B] text-white rounded-md">
                    Neutral - #6B6B6B
                  </div>
                </div>
              </div>
            </Section>
            
            {/* Dialogs & Popovers */}
            <Section title="Dialogs & Popovers" className="space-y-4">
              <div className="space-y-3">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC]">
                    <DialogHeader>
                      <DialogTitle>Dialog Title</DialogTitle>
                      <DialogDescription>
                        This is a description of the dialog content.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Dialog content goes here. This could be a form, information, or confirmation.</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>Continue</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <div className="mt-6">
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Open Popover</Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-[#F7F3F0] border-[#E5E0DC]">
                      <div className="space-y-2">
                        <h5 className="font-medium">Popover Title</h5>
                        <p className="text-sm">This is popover content that appears when triggered.</p>
                        <Button size="sm" className="w-full" onClick={() => setPopoverOpen(false)}>
                          Dismiss
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </Section>
            
            {/* Navigation */}
            <Section title="Navigation" className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-base font-medium mb-3">Tabs</h4>
                <TabGroup
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  className="mb-4 border-b border-[#E5E0DC]"
                />
                
                <div className="bg-white border border-[#E5E0DC] p-4 rounded-md mt-4">
                  <p className="text-center text-[#6B6B6B]">
                    Content for the "{activeTab}" tab would appear here
                  </p>
                </div>
                
                <h4 className="text-base font-medium mt-6 mb-3">Breadcrumbs</h4>
                <div className="flex items-center text-sm">
                  <a href="#" className="text-[#6B6B6B] hover:text-[#1A1A1A]">Home</a>
                  <ChevronRight className="w-4 h-4 mx-2 text-[#6B6B6B]" />
                  <a href="#" className="text-[#6B6B6B] hover:text-[#1A1A1A]">Components</a>
                  <ChevronRight className="w-4 h-4 mx-2 text-[#6B6B6B]" />
                  <span className="font-medium">Navigation</span>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </Container>
    </AppLayout>
  )
}