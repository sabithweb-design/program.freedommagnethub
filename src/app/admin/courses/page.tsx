'use client';

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  MoreVertical, 
  LayoutDashboard, 
  Compass, 
  Video, 
  BookOpen, 
  MessageCircle,
  Bell, 
  ChevronDown,
  Edit2,
  Grid
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
 * High-fidelity implementation based on TagMango design.
 */
export default function CourseManagementPage() {
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState<'by-me' | 'purchased'>('by-me');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch courses from Firestore
  const coursesQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'courses')) : null, 
  [firestore]);
  
  const { data: courses, loading } = useCollection<any>(coursesQuery);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-2xl tracking-tight text-slate-800">tag<span className="text-orange-600">mango</span></span>
          </div>

          {/* Centered Menu */}
          <nav className="hidden lg:flex items-center gap-10">
            <NavItem icon={<LayoutDashboard size={20} />} label="DASHBOARD" />
            <NavItem icon={<Compass size={20} />} label="FEED" />
            <NavItem icon={<Video size={20} />} label="WORKSHOPS" />
            <NavItem icon={<BookOpen size={20} />} label="COURSES" active />
            <NavItem icon={<MessageCircle size={20} />} label="MESSAGES" />
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Grid size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white">3</span>
            </Button>
            <Avatar className="h-9 w-9 border cursor-pointer">
              <AvatarImage src="https://picsum.photos/seed/admin/100" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
        {/* Sub-Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-slate-900">Courses</h1>
          <div className="flex items-center gap-6">
            <button className="text-primary font-semibold text-sm hover:underline">
              Comments
            </button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-6 h-10 flex gap-2 font-bold shadow-sm">
              <Plus size={18} /> Create
            </Button>
          </div>
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
              placeholder="search by course title or description" 
              className="pl-12 h-12 rounded-lg border-slate-200 bg-white placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 rounded-lg border-slate-200 px-6 flex gap-10 bg-white justify-between min-w-[140px] text-slate-700 font-medium">
                Course <ChevronDown size={16} className="text-slate-400" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-[400px] animate-pulse border shadow-sm" />
            ))
          ) : (
            courses?.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
          
          {/* Default Empty State / Static Card for UI demo if no DB data */}
          {(!courses || courses.length === 0) && !loading && (
             <CourseCard course={{
               title: "magnetic digital marketing formula",
               sections: 6,
               lectures: 7,
               imageUrl: "https://picsum.photos/seed/mango/600/400"
             }} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 cursor-pointer group relative pt-2`}>
      <div className={`flex flex-col items-center gap-1.5 transition-colors ${active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"}`}>
        {icon}
        <span className="text-[11px] font-bold tracking-wider">{label}</span>
      </div>
      {active && (
        <div className="absolute -bottom-[22px] left-0 right-0 h-1 bg-primary rounded-t-full" />
      )}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all ${
        active 
          ? "bg-rose-50 text-primary border border-rose-100" 
          : "bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function CourseCard({ course }: { course: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
      {/* Course Image */}
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        <Image 
          src={course.imageUrl || 'https://picsum.photos/seed/course/600/400'} 
          alt={course.title}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <div className="inline-flex">
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none rounded-full px-3 py-0.5 text-[9px] font-bold tracking-wider mb-1">
              PUBLISHED
            </Badge>
          </div>
          <h3 className="text-xl font-bold text-slate-800 capitalize leading-tight">
            {course.title || "magnetic digital marketing formula"}
          </h3>
          <p className="text-sm text-slate-400 font-medium">
            {course.sections || 6} sections • {course.lectures || 7} lectures
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <Button variant="ghost" className="flex-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 h-10 text-sm font-bold border border-transparent hover:border-slate-200">
            Edit course
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg text-slate-400 ml-2">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
