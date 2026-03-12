'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Play, BookOpen, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  videos: string; // e.g. "4/6"
  progress: number; // e.g. 60
  imageUrl: string;
  isLatestLearned?: boolean;
}

const CATEGORIES = ["Coding", "Design", "Development", "Writing", "Business"];

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const [activeCategory, setActiveCategory] = useState("Coding");

  const coursesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "courses"));
  }, [firestore]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => c.category === activeCategory);
  }, [courses, activeCategory]);

  const latestLearned = useMemo(() => {
    return courses?.find((c) => c.isLatestLearned) || courses?.[0];
  }, [courses]);

  const defaultPlaceholder = PlaceHolderImages.find(img => img.id === 'course-default')?.imageUrl || '';
  const latestPlaceholder = PlaceHolderImages.find(img => img.id === 'latest-lesson')?.imageUrl || '';

  if (authLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C7F]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-slate-800 pb-10 font-body">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between sticky top-0 bg-[#FFFBF5]/80 backdrop-blur-md z-30">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -ml-2">
          <ChevronLeft className="h-6 w-6 text-slate-700" />
        </Button>
        <h1 className="text-xl font-bold text-slate-800 text-center flex-1">My Courses</h1>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 -mr-2">
          <Search className="h-6 w-6 text-slate-700" />
        </Button>
      </header>

      <main className="px-6 space-y-8 max-w-xl mx-auto pt-4">
        {/* Category Tabs */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 py-2">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn(
                  "px-6 py-2.5 cursor-pointer transition-all rounded-full border-none font-semibold text-sm",
                  activeCategory === cat 
                    ? "bg-[#F28C7F] text-white shadow-lg shadow-[#F28C7F]/30" 
                    : "bg-white text-slate-400 hover:bg-slate-50 shadow-sm"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {/* Featured Card Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Latest Learned</h2>
          {latestLearned ? (
            <Card 
              className="overflow-hidden border-none shadow-xl rounded-[2.5rem] relative group bg-white cursor-pointer"
              onClick={() => router.push(`/lesson/1`)}
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={latestLearned.imageUrl || latestPlaceholder}
                  alt={latestLearned.title || "Latest Lesson"}
                  fill
                  className="object-cover"
                  data-ai-hint="learning course"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                
                {/* Play Button Overlay */}
                <div className="absolute right-6 bottom-6">
                  <div className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-[#F28C7F] fill-[#F28C7F]" />
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 text-white space-y-1">
                  <h3 className="text-2xl font-bold">{latestLearned.title}</h3>
                  <p className="text-sm opacity-90 font-medium">Continue where you left off</p>
                </div>
              </div>
            </Card>
          ) : (
             <div className="h-48 rounded-[2.5rem] bg-slate-100 animate-pulse" />
          )}
        </section>

        {/* Course List Section */}
        <div className="space-y-4 pb-12">
          {filteredCourses.length > 0 ? (
            <div className="grid gap-4">
              {filteredCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/lesson/1`)}
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                      <Image
                        src={course.imageUrl || defaultPlaceholder}
                        alt={course.title || "Course Thumbnail"}
                        fill
                        className="object-cover"
                        data-ai-hint="course thumbnail"
                      />
                    </div>
                    {/* Course Details */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{course.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Author by {course.author}
                        </p>
                      </div>
                      {/* Progress Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#76C8B2]">
                            {course.videos} Video
                          </span>
                          <span className="text-[10px] font-bold text-slate-300">
                            {course.progress}%
                          </span>
                        </div>
                        <Progress
                          value={course.progress}
                          className="h-1.5 bg-slate-100 progress-bar-teal"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="bg-slate-50 p-6 rounded-full text-slate-300">
                <BookOpen size={40} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">No courses in {activeCategory}</h3>
                <p className="text-xs text-slate-400 max-w-[200px] mt-1 mx-auto">
                  Courses for this category will appear here once added.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
