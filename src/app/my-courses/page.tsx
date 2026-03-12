
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useCollection, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, Search, Play, BookOpen, User } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  thumbnailUrl: string;
  isLatestLearned?: boolean;
  userId: string;
}

const CATEGORIES = ["Coding", "Design", "Development", "Business", "Marketing"];

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const [activeCategory, setActiveCategory] = useState("Coding");
  const [searchQuery, setSearchQuery] = useState("");

  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "courses"), where("userId", "==", user.uid));
  }, [firestore, user]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => {
      const matchesCategory = c.category === activeCategory;
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [courses, activeCategory, searchQuery]);

  const latestLearned = useMemo(() => {
    return courses?.find((c) => c.isLatestLearned) || courses?.[0];
  }, [courses]);

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
      <header className="px-4 h-16 flex items-center justify-between sticky top-0 bg-[#FFFBF5]/80 backdrop-blur-md z-30">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">My Courses</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="h-5 w-5" />
        </Button>
      </header>

      <main className="px-4 space-y-8 max-w-md mx-auto">
        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 py-2">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                className={cn(
                  "px-4 py-2 cursor-pointer transition-all rounded-full border-primary/20",
                  activeCategory === cat ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-white text-muted-foreground hover:bg-primary/10"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Featured Card */}
        {latestLearned && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Latest Learned</h2>
            <Card className="overflow-hidden border-none shadow-xl rounded-3xl relative group">
              <div className="relative aspect-[16/10]">
                <Image
                  src={latestLearned.thumbnailUrl}
                  alt={latestLearned.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  data-ai-hint="coding computer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <h3 className="text-xl font-bold">{latestLearned.title}</h3>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <User className="h-4 w-4" />
                    <span>{latestLearned.author}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{Math.round((latestLearned.lessonsCompleted / latestLearned.lessonsTotal) * 100)}% Complete</span>
                      <span>{latestLearned.lessonsCompleted}/{latestLearned.lessonsTotal} Lessons</span>
                    </div>
                    <Progress value={(latestLearned.lessonsCompleted / latestLearned.lessonsTotal) * 100} className="h-1.5 bg-white/20" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Course List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">{activeCategory} Courses</h2>
            <span className="text-xs text-muted-foreground">{filteredCourses.length} Total</span>
          </div>

          {filteredCourses.length > 0 ? (
            <div className="grid gap-4">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden p-3">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0">
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        className="object-cover"
                        data-ai-hint="course thumbnail"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-sm line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {course.author}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded w-fit mt-1">
                        <BookOpen className="h-3 w-3" />
                        {course.lessonsCompleted}/{course.lessonsTotal} Video
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 px-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span className="font-bold text-primary">
                        {Math.round((course.lessonsCompleted / course.lessonsTotal) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(course.lessonsCompleted / course.lessonsTotal) * 100}
                      className="h-1.5 bg-secondary"
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-dashed border-primary/20">
              <div className="bg-secondary p-4 rounded-full text-primary">
                <BookOpen size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg">No courses found</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Start learning something new in the {activeCategory} category.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
