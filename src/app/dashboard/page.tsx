
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, Star, ShieldCheck, Lock } from 'lucide-react';
import Image from 'next/image';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

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
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "courses"));
  }, [firestore]);

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
      <header className="px-6 h-20 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b transition-colors">
        <h1 className="text-xl font-black tracking-tighter text-foreground">
          freedom<span className="text-primary">magnet</span>
        </h1>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 dark:text-slate-500">
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block" />
          <BrandLogo className="h-10 w-10" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">From critical skills to technical topics, Freedom Magnet supports your professional development.</p>
        </div>

        {/* Category Header */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <h2 className="text-xl font-bold text-foreground">Featured Programs</h2>
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
              // Hardcoded placeholder for demo purposes if DB is empty
              <>
                <CourseUdemyCard 
                  course={{
                    id: '1',
                    title: "Complete AI Automation And Agentic AI Bootcamp With n8n",
                    author: "KRISHAI Technologies Private Limited, Mayank Aggarwal",
                    category: "AI",
                    rating: 4.4,
                    reviewCount: 595,
                    imageUrl: "https://picsum.photos/seed/ai-bootcamp/800/450",
                    isBestseller: true
                  }} 
                  onClick={() => router.push(`/lesson/1`)}
                />
                <CourseUdemyCard 
                  course={{
                    id: '2',
                    title: "Intro to AI Agents and Agentic AI",
                    author: "365 Careers",
                    category: "AI",
                    rating: 4.5,
                    reviewCount: 40800,
                    imageUrl: "https://picsum.photos/seed/ai-agents/800/450",
                    isBestseller: true
                  }} 
                  onClick={() => router.push(`/lesson/1`)}
                />
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function CourseUdemyCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const isValidImageUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith('http') && !url.includes('freepik.com/free-photos-vectors');
  };

  const thumbnailSrc = isValidImageUrl(course.imageUrl)
    ? course.imageUrl 
    : "https://picsum.photos/seed/program/800/450";

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
        />
        {course.isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white/90 p-3 rounded-full">
              <Lock size={24} className="text-slate-900" />
            </div>
          </div>
        )}
        {course.isBestseller && !course.isLocked && (
          <div className="absolute top-3 left-3 bg-[#e1f7f1] dark:bg-[#064e3b] text-[#1c1d1f] dark:text-emerald-100 text-[10px] font-bold px-2 py-1 rounded-sm border border-[#acd2cc] dark:border-emerald-800 shadow-sm">
            Bestseller
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#1c1d1f] dark:text-slate-100 text-base leading-snug line-clamp-2">
            {course.title || "Untitled Program"}
          </h3>
          {course.isLocked && <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none shrink-0 font-black text-[9px] uppercase tracking-widest">Locked</Badge>}
        </div>
        <p className="text-[11px] text-[#6a6f73] dark:text-slate-400 line-clamp-1">
          {course.author || "Freedom Magnet Hub"}
        </p>
        
        {!course.isLocked && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#b4690e] dark:text-amber-500">{ratingValue}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={i < Math.floor(ratingValue) ? "fill-[#b4690e] dark:fill-amber-500 text-[#b4690e] dark:text-amber-500" : "text-slate-200 dark:text-slate-700"} 
                />
              ))}
            </div>
            {reviewCountValue > 0 && <span className="text-[10px] text-[#6a6f73] dark:text-slate-500">({reviewCountValue.toLocaleString()})</span>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge className="bg-[#5022c3] dark:bg-[#4338ca] hover:bg-[#5022c3] text-white text-[10px] font-bold h-5 px-2 rounded-sm gap-1 flex items-center border-none">
            <ShieldCheck size={10} /> Premium
          </Badge>
        </div>

        {course.price && course.price > 0 && !course.isLocked ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-bold text-lg text-[#1c1d1f] dark:text-slate-100">₹{course.price}</span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-sm text-[#6a6f73] dark:text-slate-500 line-through">₹{course.originalPrice}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
