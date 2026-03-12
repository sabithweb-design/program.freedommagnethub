"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen, Clock, PlayCircle, GraduationCap } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface LessonData {
  title: string;
  description: string;
  youtubeVideoId: string;
  dayNumber: number;
}

const STARTER_LESSONS: Record<number, LessonData> = {
  1: {
    dayNumber: 1,
    title: "Welcome to the 90-Day Training",
    description: "Welcome to your first day of transformation. In this introductory module, we explore the core principles of the Freedom Magnet methodology. We'll discuss how to shift your mindset from a standard educator to a high-impact mentor, setting the foundation for the next three months of growth.\n\nToday's objectives:\n1. Understand the 'Freedom Magnet' framework.\n2. Set your personal goals for the 90-day journey.\n3. Complete the initial self-assessment worksheet.",
    youtubeVideoId: "LXb3EKWsInQ",
  }
};

export default function LessonPage() {
  const { dayNumber } = useParams();
  const day = parseInt(dayNumber as string);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const fetchLesson = async () => {
        try {
          const q = query(collection(db, "lessons"), where("dayNumber", "==", day));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            setLesson(querySnapshot.docs[0].data() as LessonData);
          } else if (STARTER_LESSONS[day]) {
            setLesson(STARTER_LESSONS[day]);
          } else {
            setLesson(null);
          }
        } catch (error) {
          console.error("Error fetching lesson:", error);
        } finally {
          setFetching(false);
        }
      };
      fetchLesson();
    }
  }, [user, loading, day, router]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C7F]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-20 font-body">
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="rounded-full">
              <Link href="/dashboard">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#F28C7F]" />
              Day {day}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" asChild disabled={day <= 1} className="rounded-full">
                <Link href={day > 1 ? `/lesson/${day - 1}` : "#"}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild disabled={day >= 90} className="rounded-full">
                <Link href={day < 90 ? `/lesson/${day + 1}` : "#"}>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="h-8 w-px bg-slate-100 hidden sm:block" />
            <BrandLogo className="h-8 w-8" />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {lesson ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Advance Branding-Free Video Player */}
            <div className="video-container shadow-2xl ring-8 ring-white/50 relative">
              {lesson.youtubeVideoId ? (
                <>
                  <iframe 
                    src={`https://www.youtube.com/embed/${lesson.youtubeVideoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&autohide=1`}
                    className="video-iframe border-none" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={lesson.title}
                  />
                  {/* Branding Protection Overlays */}
                  <div className="absolute top-0 left-0 w-full h-24 bg-transparent z-10 pointer-events-none" /> 
                  <div className="absolute bottom-0 right-0 w-48 h-16 bg-transparent z-10 pointer-events-none" />
                  
                  {/* Custom Mask for 'Watch on YouTube' button */}
                  <div className="absolute bottom-4 left-4 w-40 h-8 bg-black/40 rounded-md backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
                     <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Freedom Magnet Player</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/30 bg-slate-800">
                  <PlayCircle size={64} className="mb-4 animate-pulse" />
                  <p className="font-medium">Video content pending</p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">{lesson.title}</h1>
                  <div className="flex gap-4 mt-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#F28C7F] uppercase tracking-wider">
                      <BookOpen size={14} /> Module {Math.floor((day - 1) / 30) + 1}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <Clock size={14} /> 15 MIN READ
                    </span>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                    {lesson.description}
                  </p>
                </div>
              </div>

              <div className="md:w-72 shrink-0 space-y-4">
                <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-[#F28C7F] rounded-full" />
                    Action Plan
                  </h3>
                  <ul className="space-y-4">
                    {[
                      "Watch video lesson",
                      "Download day worksheet",
                      "Join the peer discussion"
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 group">
                        <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-[#F28C7F] group-hover:text-white transition-colors shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-slate-500 font-medium group-hover:text-slate-800 transition-colors">{step}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <div className="bg-[#FFFBF5] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <Clock size={40} className="text-[#F28C7F]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Lesson Coming Soon</h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto">This module is currently being finalized by your mentors.</p>
            <Button asChild variant="outline" className="rounded-full px-8">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
