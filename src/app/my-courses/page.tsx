"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useCollection, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, Search, Play, BookOpen } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  imageUrl: string;
  isLatestLearned?: boolean;
  userId: string;
}

const CATEGORIES = ["Coding", "Design", "Development", "Writing", "Business"];

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const [activeCategory, setActiveCategory] = useState("Coding");

  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "courses"), where("userId", "==", user.uid));
  }, [firestore, user]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-foreground pb-10">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between sticky top-0 bg-[#FFFBF5]/80 backdrop-blur-md z-30">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-black/5">
          <ChevronLeft className="h-6 w-6 text-slate-700" />
        </Button>
        <h1 className="text-xl font-bold text-slate-800">My Courses</h1>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5">
          <Search className="h-6 w-6 text-slate-700" />
        </Button>
      </header>

      <main className="px-6 space-y-8 max-w-md mx-auto">
        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
          <div className="flex gap-3 py-2">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn(
                  "px-6 py-2.5 cursor-pointer transition-all rounded-full border-none font-semibold text-sm",
                  activeCategory === cat 
                    ? "bg-[#F28C7F] text-white shadow-lg shadow-[#F28C7F]/30" 
                    : "bg-white text-slate-400 hover:bg-slate-50"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {/* Featured Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Latest Learned</h2>
          {latestLearned ? (
            <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] relative group bg-white">
              <div className="relative aspect-[16/9]">
                <Image
                  src={latestLearned.imageUrl || latestPlaceholder}
                  alt={latestLearned.title || "Featured Course"}
                  fill
                  className="object-cover"
                  data-ai-hint="learning illustration"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Play Button Overlay */}
                <div className="absolute right-6 bottom-6">
                  <div className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-[#F28C7F] fill-[#F28C7F]" />
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 text-white space-y-1">
                  <h3 className="text-xl font-bold">{latestLearned.title}</h3>
                  <p className="text-xs opacity-90 font-medium">Part 1 • 24 Minutes</p>
                </div>
              </div>
            </Card>
          ) : (
             <div className="h-48 rounded-[2.5rem] bg-slate-100 animate-pulse" />
          )}
        </section>

        {/* Course List */}
        <div className="space-y-4 pb-12">
          {filteredCourses.length > 0 ? (
            <div className="grid gap-4">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden p-4">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 bg-[#E8F5F1]">
                      <Image
                        src={course.imageUrl || defaultPlaceholder}
                        alt={course.title || "Course Thumbnail"}
                        fill
                        className="object-cover"
                        data-ai-hint="course icon"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{course.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Author by {course.author}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-[#76C8B2]">
                          {course.lessonsCompleted}/{course.lessonsTotal} Video
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">
                          {course.lessonsTotal > 0 ? Math.round((course.lessonsCompleted / course.lessonsTotal) * 100) : 0}%
                        </span>
                      </div>
                      <Progress
                        value={course.lessonsTotal > 0 ? (course.lessonsCompleted / course.lessonsTotal) * 100 : 0}
                        className="h-1.5 bg-slate-100 mt-1"
                      />
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
                <h3 className="font-bold text-slate-800">No courses yet</h3>
                <p className="text-xs text-slate-400 max-w-[200px] mt-1 mx-auto">
                  Courses in the {activeCategory} category will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
