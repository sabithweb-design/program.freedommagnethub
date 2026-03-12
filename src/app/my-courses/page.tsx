'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  Search, 
  Play, 
  BookOpen, 
  Clock, 
  MoreVertical 
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  // Fetch only courses assigned to/purchased by this user
  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "courses"), where("userId", "==", user.uid));
  }, [firestore, user]);

  const { data: courses, loading: coursesLoading } = useCollection<Course>(coursesQuery);

  const latestLearned = useMemo(() => {
    return courses?.find((c) => c.isLatestLearned) || courses?.[0];
  }, [courses]);

  const defaultPlaceholder = PlaceHolderImages.find(img => img.id === 'course-default')?.imageUrl || 'https://picsum.photos/seed/course/600/400';
  const latestPlaceholder = PlaceHolderImages.find(img => img.id === 'latest-lesson')?.imageUrl || 'https://picsum.photos/seed/latest/800/400';

  if (authLoading || coursesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C7F]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-slate-800 pb-20 font-body">
      {/* Top Header Navigation - High Fidelity */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={() => router.back()} 
               className="rounded-full hover:bg-slate-50"
             >
               <ChevronLeft className="h-6 w-6 text-slate-600" />
             </Button>
             <span className="font-bold text-2xl tracking-tight text-slate-800">
               freedom<span className="text-[#F28C7F]">magnet</span>
             </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button className="text-[11px] font-black tracking-widest text-slate-400 hover:text-slate-600">DASHBOARD</button>
            <button className="text-[11px] font-black tracking-widest text-[#F28C7F] border-b-2 border-[#F28C7F] pb-1">MY COURSES</button>
            <button className="text-[11px] font-black tracking-widest text-slate-400 hover:text-slate-600">RESOURCES</button>
          </nav>

          <Button variant="ghost" size="icon" className="text-slate-400">
            <Search size={22} />
          </Button>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-10 space-y-12">
        {/* Featured Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Latest Activity</h2>
            <button className="text-[#F28C7F] text-sm font-bold hover:underline">View History</button>
          </div>
          
          {latestLearned ? (
            <Card 
              className="overflow-hidden border-none shadow-2xl rounded-[3rem] relative group bg-white cursor-pointer transition-transform hover:scale-[1.01]"
              onClick={() => router.push(`/lesson/1`)}
            >
              <div className="relative aspect-[21/9] w-full">
                <Image
                  src={latestLearned.imageUrl || latestPlaceholder}
                  alt={latestLearned.title || "Featured Course"}
                  fill
                  className="object-cover"
                  data-ai-hint="online learning"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Play Button Overlay */}
                <div className="absolute right-10 bottom-10">
                  <div className="bg-white p-6 rounded-full shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-[#F28C7F] fill-[#F28C7F]" />
                  </div>
                </div>

                <div className="absolute bottom-10 left-10 text-white space-y-2 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F28C7F] rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
                    RESUME LEARNING
                  </div>
                  <h3 className="text-4xl font-black leading-tight">{latestLearned.title}</h3>
                  <div className="flex items-center gap-4 text-sm font-medium opacity-80">
                    <span className="flex items-center gap-1.5"><Clock size={16} /> 24m remaining</span>
                    <span className="flex items-center gap-1.5"><BookOpen size={16} /> Module 4</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
             <div className="h-64 rounded-[3rem] bg-white flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 shadow-inner">
               <BookOpen size={48} className="mb-4 opacity-20" />
               <p className="font-bold">No active enrollments found</p>
               <Button 
                variant="link" 
                className="text-[#F28C7F] mt-2"
                onClick={() => router.push('/dashboard')}
               >
                 Browse courses to get started
               </Button>
             </div>
          )}
        </section>

        {/* Course List Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Enrollments</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {courses && courses.map((course) => (
              <Card 
                key={course.id} 
                className="border border-slate-100 shadow-sm rounded-[2.5rem] bg-white overflow-hidden p-6 hover:shadow-xl transition-all group cursor-pointer"
                onClick={() => router.push(`/lesson/1`)}
              >
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  <div className="relative h-28 w-28 rounded-[2rem] overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                    <Image
                      src={course.imageUrl || defaultPlaceholder}
                      alt={course.title || "Course Thumbnail"}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      data-ai-hint="course thumbnail"
                    />
                  </div>
                  
                  {/* Course Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-[#F28C7F] uppercase tracking-widest">
                           {course.category || 'TRAINING'}
                         </span>
                         <button className="text-slate-300 hover:text-slate-600 transition-colors">
                           <MoreVertical size={18} />
                         </button>
                      </div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold">
                        by {course.author || 'Freedom Magnet'}
                      </p>
                    </div>

                    {/* Progress Info */}
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400">
                          {course.videos || "0/0"} VIDEOS
                        </span>
                        <span className="text-[11px] font-black text-[#F28C7F]">
                          {course.progress || 0}%
                        </span>
                      </div>
                      <Progress
                        value={course.progress || 0}
                        className="h-2 bg-slate-100 progress-bar-coral rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
