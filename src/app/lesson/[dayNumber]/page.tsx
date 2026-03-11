
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";

interface LessonData {
  title: string;
  description: string;
  youtubeVideoId: string;
  dayNumber: number;
}

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="font-bold text-primary">Lesson Day {day}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild disabled={day === 1}>
              <Link href={day > 1 ? `/lesson/${day - 1}` : "#"}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild disabled={day === 90}>
              <Link href={day < 90 ? `/lesson/${day + 1}` : "#"}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {lesson ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Suppressed YouTube Embed Wrapper */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 z-10 pointer-events-none ring-1 ring-white/10 rounded-2xl" />
              {lesson.youtubeVideoId ? (
                <iframe 
                  src={`https://www.youtube.com/embed/${lesson.youtubeVideoId}?modestbranding=1&rel=0&controls=1&fs=0&disablekb=1&iv_load_policy=3&showinfo=0`}
                  className="w-full h-full" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen={false}
                  title={lesson.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/50">
                  <PlayCircle size={48} className="mb-4" />
                  <p>Video content pending</p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <h1 className="text-4xl font-bold font-headline">{lesson.title}</h1>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen size={16} /> Module {Math.floor((day - 1) / 30) + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} /> Estimated 15 min
                  </span>
                </div>
                <div className="prose prose-indigo max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {lesson.description}
                </div>
              </div>

              <div className="md:w-64 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-bold mb-4">Study Plan</h3>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                        Watch the full video
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                        Take personal notes
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                        Implement strategies
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <h2 className="text-2xl font-bold mb-4">Lesson content coming soon!</h2>
            <p className="text-muted-foreground mb-8">This module is currently being finalized.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to Curriculum</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
