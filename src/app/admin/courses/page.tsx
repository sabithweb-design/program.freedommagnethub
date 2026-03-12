'use client';

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  MoreVertical, 
  LayoutDashboard, 
  Rss, 
  Tent, 
  BookOpen, 
  Mail, 
  Bell, 
  ChevronDown,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore } from '@/firebase';
import { query, collection } from 'firebase/firestore';
import Image from 'next/image';

/**
 * Course Management Page
 * Inspired by TagMango design for Freedom Magnet Hub.
 */
export default function CourseManagementPage() {
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState<'by-me' | 'purchased'>('by-me');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real courses from Firestore
  const coursesQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'courses')) : null, 
  [firestore]);
  
  const { data: courses, loading } = useCollection<any>(coursesQuery);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="font-bold text-lg hidden md:block">Freedom Hub</span>
          </div>

          {/* Centered Menu */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-500">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavItem icon={<Rss size={18} />} label="Feed" />
            <NavItem icon={<Tent size={18} />} label="Workshops" />
            <NavItem icon={<BookOpen size={18} />} label="Courses" active />
            <NavItem icon={<MessageSquare size={18} />} label="Messages" />
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Bell size={20} />
            </Button>
            <Avatar className="h-8 w-8 border">
              <AvatarImage src="https://picsum.photos/seed/admin/100" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Sub-Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Courses</h1>
            <Button variant="link" className="text-slate-400 font-semibold p-0 h-auto flex gap-2">
              <MessageSquare size={16} /> Comments
            </Button>
          </div>
          <Button className="bg-[#F28C7F] hover:bg-[#F28C7F]/90 text-white rounded-full px-6 flex gap-2">
            <Plus size={18} /> Create
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          <TabButton 
            active={activeTab === 'by-me'} 
            onClick={() => setActiveTab('by-me')}
            label="Courses by me" 
          />
          <TabButton 
            active={activeTab === 'purchased'} 
            onClick={() => setActiveTab('purchased')}
            label="Purchased courses" 
          />
        </div>

        {/* Search Section */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search for courses..." 
              className="pl-12 h-12 rounded-full border-slate-200 bg-white shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 rounded-full border-slate-200 px-6 flex gap-2 bg-white">
                Course <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Workshop</DropdownMenuItem>
              <DropdownMenuItem>Course</DropdownMenuItem>
              <DropdownMenuItem>Drip Content</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border shadow-sm" />
            ))
          ) : (
            courses?.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 cursor-pointer transition-colors ${active ? "text-primary border-b-2 border-primary pb-5 mt-5" : "hover:text-slate-900 pb-5 mt-5 border-b-2 border-transparent"}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
        active 
          ? "bg-[#F28C7F]/10 text-[#F28C7F] ring-1 ring-[#F28C7F]/20" 
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function CourseCard({ course }: { course: any }) {
  return (
    <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Course Image */}
      <div className="relative aspect-video">
        <Image 
          src={course.imageUrl || 'https://picsum.photos/seed/course/600/400'} 
          alt={course.title}
          fill
          className="object-cover"
        />
        <Badge className="absolute top-4 left-4 bg-emerald-500 hover:bg-emerald-500 text-white border-none rounded-full px-3 py-1 text-[10px] font-bold">
          PUBLISHED
        </Badge>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">
            {course.title || "Magnetic Digital Marketing Formula"}
          </h3>
          <p className="text-sm text-slate-400 font-medium mt-1">
            {course.sections || 6} sections • {course.lectures || 7} lectures
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-10 px-6 text-sm font-bold gap-2">
            <Edit2 size={14} /> Edit course
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
