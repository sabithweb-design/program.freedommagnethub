'use client';

import React, { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { Star, ShieldCheck, ChevronLeft, ShoppingCart, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  const firestore = useFirestore();

  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "courses"));
  }, [firestore]);

  const { data: courses, loading } = useCollection<Course>(coursesQuery);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-20 font-body">
      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-xl font-black tracking-tighter text-slate-900">
            MARKETPLACE
          </h1>
        </div>
        
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search for anything" 
              className="pl-10 h-10 rounded-full border-slate-200 bg-slate-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full text-slate-600">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <div className="font-bold text-slate-800 hidden sm:block">
            Freedom<span className="text-primary">Magnet</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Expand your horizon</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            The most comprehensive training curriculum for the modern educator.
          </p>
        </div>

        {/* Course Stack */}
        <div className="flex flex-col gap-8">
          {courses && courses.length > 0 ? (
            courses.map((course) => (
              <MarketplaceCard key={course.id} course={course} />
            ))
          ) : (
            // Fallback demo items if database is empty
            <>
              <MarketplaceCard 
                course={{
                  id: '1',
                  title: "Ultimate AWS Certified Solutions Architect Associate 2026",
                  author: "Stephane Maarek | AWS Certified Cloud Practitioner,Solutions...",
                  category: "Cloud",
                  rating: 4.7,
                  ratingCount: 284118,
                  price: 559,
                  oldPrice: 3379,
                  imageUrl: "https://picsum.photos/seed/aws/800/450",
                  isBestseller: true
                }}
              />
              <MarketplaceCard 
                course={{
                  id: '2',
                  title: "CompTIA Security+ (SY0-701) Complete Course & Practice Exam",
                  author: "Jason Dion • 2.8 Million+ Enrollments Worldwide, Dion Training...",
                  category: "Security",
                  rating: 4.7,
                  ratingCount: 115071,
                  price: 759,
                  oldPrice: 4559,
                  imageUrl: "https://picsum.photos/seed/security/800/450",
                  isBestseller: true
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MarketplaceCard({ course }: { course: Course }) {
  const thumbnailSrc = course.imageUrl && course.imageUrl.trim() !== "" 
    ? course.imageUrl 
    : "https://picsum.photos/seed/course/800/450";

  const instructorName = course.instructor || course.author || "Freedom Magnet Hub";
  const displayRating = course.rating || 4.7;
  const displayRatingCount = course.ratingCount || course.reviewCount || 1000;
  const displayPrice = course.price || 559;
  const displayOldPrice = course.oldPrice || course.originalPrice || 3379;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
      {/* Image Section */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={course.title || "Course thumbnail"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-1000"
        />
        {course.isBestseller !== false && (
          <div className="absolute top-4 left-4 bg-[#e1f7f1] text-[#1c1d1f] text-[11px] font-black px-3 py-1 rounded-md border border-[#acd2cc] shadow-sm uppercase tracking-wider">
            Bestseller
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-7 space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-black text-[#1c1d1f] text-xl leading-[1.2] line-clamp-2 hover:text-primary transition-colors cursor-pointer">
            {course.title || "Untitled Course"}
          </h3>
          <p className="text-[11px] text-[#6a6f73] font-bold line-clamp-1">
            {instructorName}
          </p>
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-black text-[#b4690e]">{displayRating.toFixed(1)}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={i < Math.floor(displayRating) ? "fill-[#b4690e] text-[#b4690e]" : "text-slate-200"} 
                />
              ))}
            </div>
          </div>
          <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            <span className="text-[10px] text-[#6a6f73] font-black">
              {displayRatingCount.toLocaleString()} ratings
            </span>
          </div>
          <Badge className="bg-[#5022c3] hover:bg-[#5022c3] text-white text-[10px] font-black h-5 px-2 rounded-sm gap-1 flex items-center border-none">
            <ShieldCheck size={10} /> PREMIUM
          </Badge>
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <span className="font-black text-2xl text-[#1c1d1f]">₹{displayPrice.toLocaleString()}</span>
            {displayOldPrice && (
              <span className="text-sm text-[#6a6f73] line-through font-bold">
                ₹{displayOldPrice.toLocaleString()}
              </span>
            )}
          </div>
          <Button className="rounded-xl px-8 h-12 font-black text-sm uppercase tracking-widest bg-slate-900 hover:bg-slate-800 transition-colors">
            Enroll Now
          </Button>
        </div>
      </div>
    </div>
  );
}
