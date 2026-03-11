"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { calculateCurrentDay, isLessonUnlocked } from "@/lib/drip-logic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Lock, Play, CheckCircle2, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  dayNumber: number;
  title: string;
}

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentDay, setCurrentDay] = useState(0);

  useEffect(() => {
    if (profile?.cohortStartDate) {
      setCurrentDay(calculateCurrentDay(profile.cohortStartDate));
      
      const fetchLessons = async () => {
        const q = query(collection(db, "lessons"), orderBy("dayNumber", "asc"));
        const querySnapshot = await getDocs(q);
        const lessonsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lesson[];
        setLessons(lessonsData);
      };
      
      fetchLessons();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  const progress = Math.min(100, Math.round((currentDay / 90) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary w-6 h-6" />
            <h1 className="text-xl font-bold text-primary">EduTrail</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{profile.email}</p>
              <p className="text-xs text-muted-foreground">Day {currentDay} of 90</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
              {profile.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-80">Training Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{progress}%</div>
                <Progress value={progress} className="bg-primary-foreground/20 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="bg-secondary p-2 rounded-lg">
                  <Calendar className="text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-xl font-bold">Day {currentDay}</div>
                  <p className="text-xs text-muted-foreground">Keep going!</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Milestone</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="bg-accent/20 p-2 rounded-lg text-accent">
                  <CheckCircle2 />
                </div>
                <div>
                  <div className="text-xl font-bold">Day 30</div>
                  <p className="text-xs text-muted-foreground">Certificate 1</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-headline">Training Curriculum</h2>
            <div className="flex gap-2 text-sm">
              <Badge variant="outline" className="bg-white">Unlocked</Badge>
              <Badge variant="secondary" className="opacity-50">Locked</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-4">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((day) => {
              const unlocked = isLessonUnlocked(day, currentDay);
              const lesson = lessons.find(l => l.dayNumber === day);
              
              return (
                <Link
                  key={day}
                  href={unlocked ? `/lesson/${day}` : "#"}
                  className={cn(
                    "lesson-grid-item relative group h-24 flex flex-col items-center justify-center border rounded-xl transition-all",
                    unlocked 
                      ? "bg-white border-primary/20 hover:border-primary hover:shadow-lg cursor-pointer" 
                      : "bg-muted text-muted-foreground border-transparent cursor-not-allowed"
                  )}
                  onClick={(e) => !unlocked && e.preventDefault()}
                >
                  <span className="text-2xl font-bold mb-1">{day}</span>
                  {unlocked ? (
                    <Play size={16} className="text-primary group-hover:scale-125 transition-transform" />
                  ) : (
                    <Lock size={16} className="text-muted-foreground/50" />
                  )}
                  
                  {lesson && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-primary/10 rounded-xl overflow-hidden pointer-events-none">
                      <p className="text-[10px] px-1 text-center font-bold text-primary line-clamp-2">{lesson.title}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}