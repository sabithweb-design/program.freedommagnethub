'use client';

import React, { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Star, ShieldCheck, ChevronLeft, ShoppingCart, Search, Settings, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Course {
  id: string;
  title: string;
  author: string;
  instructor?: string;
  category: string;
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
  price?: number;
  oldPrice?: number;
  originalPrice?: number;
  imageUrl: string;
  isBestseller?: boolean;
}

export default function CoursesPage() {
  const { isAdmin } = useAuth();
  const firestore = useFirestore();

  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "courses"));
  }, [firestore]);

  const { data: courses, loading } = useCollection<Course>(coursesQuery);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-body transition-colors">
      {/* Header */}
      <header className="px-4 sm:px-8 md:px-20 h-20 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b transition-colors">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
          </Button>
          <h1 className="text-sm md:text-xl font-black tracking-tighter text-foreground uppercase hidden sm:block">
            MARKETPLACE
          </h1>
        </div>
        
        <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-4 lg:mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search for anything" 
              className="pl-10 h-10 rounded-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-8">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="flex rounded-full border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold gap-1 sm:gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95 px-3 sm:px-4 h-9 sm:h-10"
            >
              <Link href="/admin">
                <ExternalLink size={14} />
                <span className="text-[10px] sm:text-xs">Admin Panel</span>
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full text-slate-600 dark:text-slate-400 h-9 w-9 sm:h-10 sm:w-10">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block mx-1" />
          <BrandLogo className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Expand your horizon</h2>
        </div>

        {/* Course Stack */}
        <div className="flex flex-col gap-8">
          {courses && courses.length > 0 ? (
            courses.map((course) => (
              <MarketplaceCard key={course.id} course={course} />
            ))
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem]">
              <p className="text-slate-400 font-bold px-4">No programs available in the marketplace yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MarketplaceCard({ course }: { course: Course }) {
  const thumbnailSrc = course.imageUrl && (course.imageUrl.startsWith('http') || course.imageUrl.startsWith('https'))
    ? course.imageUrl 
    : "https://picsum.photos/seed/course/800/450";

  const instructorName = course.instructor || course.author || "Freedom Magnet Hub";
  const displayRating = course.rating || 4.7;
  const displayRatingCount = course.ratingCount || course.reviewCount || 0;
  const displayPrice = course.price || 0;
  const displayOldPrice = course.originalPrice || 0;

  return (
    <div className="bg-card text-card-foreground rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl dark:hover:shadow-primary/5 transition-all duration-500 group">
      {/* Image Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        <Image
          src={thumbnailSrc}
          alt={course.title || "Course thumbnail"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-1000"
          data-ai-hint="course thumbnail"
        />
        {course.isBestseller !== false && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#e1f7f1] dark:bg-[#064e3b] text-[#1c1d1f] dark:text-emerald-100 text-[10px] sm:text-[11px] font-black px-2 sm:px-3 py-1 rounded-md border border-[#acd2cc] dark:border-emerald-800 shadow-sm uppercase tracking-wider">
            Bestseller
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 sm:p-7 space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-black text-foreground text-lg sm:text-xl leading-[1.2] line-clamp-2 hover:text-primary transition-colors cursor-pointer">
            {course.title || "Untitled Course"}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold line-clamp-1">
            {instructorName}
          </p>
        </div>

        {/* Rating Row */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#b4690e] dark:text-amber-500">{displayRating.toFixed(1)}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={i < Math.floor(displayRating) ? "fill-[#b4690e] dark:fill-amber-500 text-[#b4690e] dark:text-amber-500" : "text-slate-200 dark:text-slate-700"} 
                />
              ))}
            </div>
          </div>
          {displayRatingCount > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-black">
                {displayRatingCount.toLocaleString()} reviews
              </span>
            </div>
          )}
          <Badge className="bg-[#5022c3] dark:bg-[#4338ca] hover:bg-[#5022c3] text-white text-[9px] sm:text-[10px] font-black h-5 px-2 rounded-sm gap-1 flex items-center border-none">
            <ShieldCheck size={10} /> PREMIUM
          </Badge>
        </div>

        {/* Price Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="font-black text-xl sm:text-2xl text-foreground">₹{displayPrice.toLocaleString()}</span>
            {displayOldPrice > displayPrice && (
              <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 line-through font-bold">
                ₹{displayOldPrice.toLocaleString()}
              </span>
            )}
          </div>
          <Button className="w-full sm:w-auto rounded-xl px-8 h-12 font-black text-sm uppercase tracking-widest bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
            Enroll Now
          </Button>
        </div>
      </div>
    </div>
  );
}
