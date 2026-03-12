
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Search, 
  Play, 
  BookOpen, 
  Clock, 
  MoreVertical,
  Bell,
  Grid as GridIcon
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  videos: string; // e.g., "4/6"
  progress: number; // Percentage
  imageUrl: string;
  isLatestLearned?: boolean;
  userId: string;
  lectures?: number;
  sections?: number;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  // Fetch only courses assigned to/purchased by this user
  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "courses"), where("userId", "==", user.uid));
  }, [firestore, user]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  const defaultPlaceholder = PlaceHolderImages.find(img => img.id === 'course-default')?.imageUrl || 'https://picsum.photos/seed/course/600/400';

  if (authLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C7F]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-slate-800 pb-20 font-body">
      {/* Top Navbar - Standard TagMango Style */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-1 group">
            <span className="font-bold text-2xl tracking-tight text-slate-800">
              freedom<span className="text-[#F28C7F]">magnet</span>
            </span>
          </Link>

          {/* Centered Menu */}
          <nav className="hidden lg:flex items-center gap-10 h-full">
            <NavItem label="DASHBOARD" href="/dashboard" />
            <NavItem label="FEED" href="#" />
            <NavItem label="WORKSHOPS" href="#" />
            <NavItem label="MY COURSES" href="/my-courses" active />
            <NavItem label="RESOURCES" href="#" />
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <GridIcon size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white">2</span>
            </Button>
            <Avatar className="h-9 w-9 border cursor-pointer">
              <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/user-avatar/100"} />
              <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || 'FM'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Learning</h1>
            <p className="text-slate-500 font-medium">Pick up where you left off and complete your journey.</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#F28C7F]/10 text-[#F28C7F] border border-[#F28C7F]/20 transition-all hover:bg-[#F28C7F]/20">
              Active Courses
            </button>
            <button className="px-6 py-2.5 rounded-full text-sm font-bold bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all">
              Completed
            </button>
          </div>
        </div>

        {/* Course Grid - 2 bundles per row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-20">
          {courses && courses.length > 0 ? (
            courses.map((course) => (
              <CourseBundleCard key={course.id} course={course} onClick={() => router.push(`/lesson/1`)} />
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
               <div className="bg-slate-50 p-8 rounded-full text-slate-200">
                 <BookOpen size={64} />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-slate-800">No active bundles</h3>
                 <p className="text-slate-400 max-w-xs mt-2 mx-auto font-medium">
                   You haven&apos;t enrolled in any courses yet. Visit the dashboard to explore our training programs.
                 </p>
               </div>
               <Button 
                className="bg-[#F28C7F] hover:bg-[#E07A6D] text-white rounded-full px-10 h-12 font-black shadow-lg shadow-[#F28C7F]/20"
                onClick={() => router.push('/dashboard')}
               >
                 Explore Programs
               </Button>
             </div>
          )}
        </section>
      </main>
    </div>
  );
}

function NavItem({ label, href, active = false }: { label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 cursor-pointer group relative pt-4 h-full`}>
      <div className={`flex flex-col items-center gap-1.5 transition-colors ${active ? "text-[#F28C7F]" : "text-slate-400 group-hover:text-slate-600"}`}>
        <span className="text-[11px] font-black tracking-wider">{label}</span>
      </div>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#F28C7F] rounded-t-full" />
      )}
    </Link>
  );
}

function CourseBundleCard({ course, onClick }: { course: Course, onClick: () => void }) {
  const defaultPlaceholder = PlaceHolderImages.find(img => img.id === 'course-default')?.imageUrl || 'https://picsum.photos/seed/course/600/400';

  return (
    <Card 
      className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group cursor-pointer flex flex-col h-full hover:-translate-y-2"
      onClick={onClick}
    >
      {/* Bundle Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image 
          src={course.imageUrl || defaultPlaceholder} 
          alt={course.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          data-ai-hint="learning bundle"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute right-6 bottom-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <div className="bg-white/90 backdrop-blur p-4 rounded-full shadow-2xl">
            <Play className="h-6 w-6 text-[#F28C7F] fill-[#F28C7F]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6 flex flex-col flex-1">
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg px-3 py-1 text-[10px] font-black tracking-widest shadow-sm">
              ENROLLED
            </Badge>
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
              {course.category || 'ACADEMY'}
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-800 capitalize leading-tight line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-slate-400 font-bold tracking-tight">
            by {course.author || 'Freedom Magnet'} • {course.videos || "0/0"} Lessons
          </p>
        </div>

        {/* Progress Section */}
        <div className="space-y-3 pt-6 border-t border-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F28C7F] animate-pulse" />
              <span className="text-[11px] font-black text-[#F28C7F] tracking-widest uppercase">
                YOUR PROGRESS
              </span>
            </div>
            <span className="text-sm font-black text-slate-800">{course.progress || 0}%</span>
          </div>
          <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-[#F28C7F] transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${course.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <Button variant="outline" className="flex-1 rounded-2xl h-14 text-sm font-black border-slate-200 hover:border-[#F28C7F] hover:text-[#F28C7F] hover:bg-[#F28C7F]/5 transition-all">
            Go to Course
          </Button>
          <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
