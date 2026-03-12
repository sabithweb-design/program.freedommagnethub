
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, Star, ShieldCheck, Lock, Grid } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLogo } from '@/components/BrandLogo';

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  originalPrice?: number;
  imageUrl: string;
  isBestseller?: boolean;
  isLocked?: boolean;
  studentIds?: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const firestore = useFirestore();

  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Admins see all for monitoring. Students only see enrolled programs.
    if (isAdmin) {
      return query(collection(firestore, "courses"));
    }
    return query(collection(firestore, "courses"), where("studentIds", "array-contains", user.uid));
  }, [firestore, user, isAdmin]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  if (authLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-body transition-colors">
      {/* Header */}
      <header className="px-6 sm:px-12 md:px-20 h-20 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b transition-colors">
        {/* Brand Name (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <h1 className="text-base sm:text-xl font-black tracking-tighter text-foreground">
            freedom<span className="text-primary">magnethub</span>
          </h1>
        </div>
        
        {/* Right Section: Actions & Logo at the end */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-1 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-slate-400 dark:text-slate-500 h-9 w-9 sm:h-10 sm:w-10">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="flex rounded-full border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold gap-1 sm:gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95 h-9 sm:h-10 px-3 sm:px-5 shadow-sm"
            >
              <Link href="/admin">
                <Grid size={14} className="sm:size-4" />
                <span className="text-[10px] sm:text-xs">Admin Panel</span>
              </Link>
            </Button>
          )}

          <BrandLogo className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Category Header */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">My Training Tracks</h2>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {courses && courses.length > 0 ? (
              courses.map((course) => (
                <CourseUdemyCard 
                  key={course.id} 
                  course={course} 
                  onClick={() => !course.isLocked && router.push(`/lesson/1`)} 
                />
              ))
            ) : (
               <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem]">
                <p className="text-slate-400 font-bold px-4">
                  {isAdmin 
                    ? "No programs found in the database. Use the Admin Panel to create one." 
                    : "You aren't enrolled in any program sessions yet. Please contact your instructor."}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function CourseUdemyCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const thumbnailSrc = course.imageUrl && (course.imageUrl.startsWith('http') || course.imageUrl.startsWith('https'))
    ? course.imageUrl 
    : "https://picsum.photos/seed/course/800/450";

  const ratingValue = course.rating || 4.5;
  const reviewCountValue = course.reviewCount || 0;

  return (
    <div 
      className={`group flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${course.isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      onClick={onClick}
    >
      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
        <Image
          src={thumbnailSrc}
          alt={course.title || "Program thumbnail"}
          fill
          className={`object-cover transition-transform duration-500 ${!course.isLocked && 'group-hover:scale-105'}`}
          data-ai-hint="course thumbnail"
        />
        {course.isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white/90 p-2 sm:p-3 rounded-full shadow-lg">
              <Lock size={20} className="text-slate-900 sm:size-6" />
            </div>
          </div>
        )}
        {course.isBestseller && !course.isLocked && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#e1f7f1] dark:bg-[#064e3b] text-[#1c1d1f] dark:text-emerald-100 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-1 rounded-sm border border-[#acd2cc] dark:border-emerald-800 shadow-sm">
            Bestseller
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#1c1d1f] dark:text-slate-100 text-sm sm:text-base leading-snug line-clamp-2">
            {course.title || "Untitled Program"}
          </h3>
          {course.isLocked && <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none shrink-0 font-black text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0">Locked</Badge>}
        </div>
        <p className="text-[10px] sm:text-11px] text-[#6a6f73] dark:text-slate-400 line-clamp-1">
          {course.author || "Freedom Magnet Hub"}
        </p>
        
        {/* Rating Stars */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] sm:text-xs font-bold text-[#b4690e] dark:text-amber-500">{ratingValue.toFixed(1)}</span>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={8} 
                className={i < Math.floor(ratingValue) ? "fill-[#b4690e] dark:fill-amber-500 text-[#b4690e] dark:text-amber-500 sm:size-[10px]" : "text-slate-200 dark:text-slate-700 sm:size-[10px]"} 
              />
            ))}
          </div>
          {reviewCountValue > 0 && <span className="text-[9px] sm:text-[10px] text-[#6a6f73] dark:text-slate-500">({reviewCountValue.toLocaleString()})</span>}
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-[#5022c3] dark:bg-[#4338ca] hover:bg-[#5022c3] text-white text-[9px] sm:text-[10px] font-bold h-5 px-1.5 sm:px-2 rounded-sm gap-1 flex items-center border-none">
            <ShieldCheck size={10} /> Premium
          </Badge>
        </div>

        {(course.price !== undefined && course.price > 0) && !course.isLocked ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-bold text-base sm:text-lg text-[#1c1d1f] dark:text-slate-100">₹{course.price.toLocaleString()}</span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-xs sm:text-sm text-[#6a6f73] dark:text-slate-500 line-through">₹{course.originalPrice.toLocaleString()}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
