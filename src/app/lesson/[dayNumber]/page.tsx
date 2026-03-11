"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { calculateCurrentDay, isLessonUnlocked } from "@/lib/drip-logic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Lock, BookOpen, Clock } from "lucide-react";
import Link from "next/link";

interface LessonData {
  title: string;
  descriptionText: string;
  videoUrl: string;
  dayNumber: number;
}

export default function LessonPage() {
  const { dayNumber } = useParams();
  const day = parseInt(dayNumber as string);
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (profile?.cohortStartDate) {
      const currentDay = calculateCurrentDay(profile.cohortStartDate);
      const unlocked = isLessonUnlocked(day, currentDay);
      setIsUnlocked(unlocked);

      if (unlocked) {
        const fetchLesson = async () => {
          const q = query(collection(db, "lessons"), where("dayNumber", "==", day));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setLesson(querySnapshot.docs[0].data() as LessonData);
          }
          setFetching(false);
        };
        fetchLesson();
      } else {
        setFetching(false);
      }
    }
  }, [profile, day]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="bg-muted p-6 rounded-full mb-6">
          <Lock size={64} className="text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Content Locked</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          This lesson will be available on Day {day} of your training. 
          Keep working through your current materials!
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
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
          <div className="font-bold text-primary">Day {day}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild disabled={day === 1}>
              <Link href={`/lesson/${day - 1}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild disabled={day === 90 || !isLessonUnlocked(day + 1, calculateCurrentDay(profile!.cohortStartDate))}>
              <Link href={`/lesson/${day + 1}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {lesson ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative">
              {lesson.videoUrl ? (
                <iframe 
                  src={lesson.videoUrl} 
                  className="w-full h-full" 
                  allowFullScreen 
                  title={lesson.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/50">
                  <Play size={48} className="mb-4" />
                  <p>Video not yet available for this lesson</p>
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
                    <Clock size={16} /> 15 min read
                  </span>
                </div>
                <div className="prose prose-indigo max-w-none text-muted-foreground leading-relaxed">
                  {lesson.descriptionText}
                </div>
              </div>

              <div className="md:w-64 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-bold mb-4">Lesson Summary</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        Complete video lesson
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        Reflection activity
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        Next steps: Day {day + 1}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Lesson content is coming soon!</h2>
            <p className="text-muted-foreground">This content is being prepared for you.</p>
          </div>
        )}
      </main>
    </div>
  );
}