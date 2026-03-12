'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, PlayCircle, ShieldCheck, Grid, Bell, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandLogo } from '@/components/BrandLogo';

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  imageUrl: string;
  progress?: number;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "courses"), where("userId", "==", user.uid));
  }, [firestore, user]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  if (authLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-slate-900 pb-20 font-body">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 group">
            <span className="font-bold text-2xl tracking-tighter text-slate-900">
              freedom<span className="text-primary">magnet</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10 h-full">
            <NavItem label="DASHBOARD" href="/dashboard" />
            <NavItem label="MY COURSES" href="/my-courses" active />
            <NavItem label="WORKSHOPS" href="#" />
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Bell size={20} />
              </Button>
              <Avatar className="h-9 w-9 border cursor-pointer">
                <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/user-avatar/100"} />
                <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || 'FM'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="h-8 w-px bg-slate-100 hidden sm:block" />
            <BrandLogo className="h-10 w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Learning</h1>
          <p className="text-slate-500 font-medium">Continue your professional development journey.</p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {courses && courses.length > 0 ? (
            courses.map((course) => (
              <EnrolledUdemyCard key={course.id} course={course} onClick={() => router.push(`/lesson/1`)} />
            ))
          ) : (
            // Demo data if empty
            <>
              <EnrolledUdemyCard 
                course={{
                  id: '1',
                  title: "Complete AI Automation And Agentic AI Bootcamp With n8n",
                  author: "KRISHAI Technologies Private Limited, Mayank Aggarwal",
                  category: "AI",
                  rating: 4.4,
                  imageUrl: "https://picsum.photos/seed/ai-bootcamp/800/450",
                  progress: 45
                }} 
                onClick={() => router.push(`/lesson/1`)}
              />
              <EnrolledUdemyCard 
                course={{
                  id: '2',
                  title: "Intro to AI Agents and Agentic AI",
                  author: "365 Careers",
                  category: "AI",
                  rating: 4.5,
                  imageUrl: "https://picsum.photos/seed/ai-agents/800/450",
                  progress: 10
                }} 
                onClick={() => router.push(`/lesson/1`)}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function NavItem({ label, href, active = false }: { label: string; href: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 cursor-pointer group relative pt-4 h-full`}>
      <span className={`text-[11px] font-black tracking-wider transition-colors ${active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"}`}>
        {label}
      </span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
      )}
    </Link>
  );
}

function EnrolledUdemyCard({ course, onClick }: { course: Course; onClick: () => void }) {
  // Ensure we don't pass an empty string to next/image src
  const thumbnailSrc = course.imageUrl && course.imageUrl.trim() !== "" 
    ? course.imageUrl 
    : "https://picsum.photos/seed/course/800/450";

  return (
    <Card 
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <Image 
          src={thumbnailSrc} 
          alt={course.title || "Enrolled course thumbnail"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircle size={48} className="text-white fill-white/20" />
        </div>
      </div>

      <div className="p-6 space-y-4 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <h3 className="text-lg font-black text-slate-800 leading-tight line-clamp-2">
            {course.title || "Untitled Course"}
          </h3>
          <p className="text-xs text-slate-400 font-bold">
            {course.author || "Freedom Magnet Hub"}
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-slate-400">
            <span>PROGRESS</span>
            <span className="text-primary">{course.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${course.progress || 0}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
