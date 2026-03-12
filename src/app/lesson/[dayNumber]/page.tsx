
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  GraduationCap, 
  Lock, 
  CheckCircle2,
  FileText,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlayerIcon } from "@/app/admin/page";

interface LessonData {
  id?: string;
  title?: string;
  description?: string;
  actionPlan?: string;
  youtubeVideoId: string;
  thumbnailUrl?: string;
  pdfUrl?: string;
  dayNumber: number;
  isLocked?: boolean;
}

export default function LessonPage() {
  const { dayNumber } = useParams();
  const day = parseInt(dayNumber as string);
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    // Prevent right-click to protect video content (deterrent only)
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!loading && !user) {
      // Force user to login page with a redirect back to this lesson
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (user) {
      const fetchLesson = async () => {
        try {
          const q = query(collection(db, "lessons"), where("dayNumber", "==", day));
          const querySnapshot = await getDocs(q);
          
          let currentLessonId = null;
          let currentLesson = null;

          if (!querySnapshot.empty) {
            currentLessonId = querySnapshot.docs[0].id;
            currentLesson = querySnapshot.docs[0].data() as LessonData;
          }

          setLessonId(currentLessonId);
          setLesson(currentLesson);

          if (currentLessonId) {
            const progressRef = doc(db, 'users', user.uid, 'completedLessons', currentLessonId);
            const docSnap = await getDoc(progressRef);
            setIsCompleted(docSnap.exists());
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

  const handleToggleComplete = () => {
    if (!user || !lessonId) return;
    setCompleting(true);

    const progressRef = doc(db, 'users', user.uid, 'completedLessons', lessonId);
    
    if (isCompleted) {
      deleteDoc(progressRef)
        .then(() => {
          setIsCompleted(false);
          toast({
            title: "Lesson Unmarked",
            description: "Lesson removed from completed list.",
          });
        })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: progressRef.path,
            operation: 'delete'
          }));
        })
        .finally(() => setCompleting(false));
    } else {
      const data = { completedAt: serverTimestamp() };
      setDoc(progressRef, data)
        .then(() => {
          setIsCompleted(true);
          toast({
            title: "Great Job!",
            description: "Day " + day + " marked as complete.",
          });
        })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: progressRef.path,
            operation: 'create',
            requestResourceData: data
          }));
        })
        .finally(() => setCompleting(false));
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (lesson?.isLocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-50 dark:bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <Lock size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4">Day {day}: Content Locked</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed font-medium">
          Access to this lesson is currently restricted.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" asChild className="rounded-full px-8 h-12">
            <Link href="/dashboard">Return to Hub</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-foreground pb-20 font-body transition-colors ${!isAdmin ? 'content-protected' : ''}`}>
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40 transition-colors">
        <div className="max-w-4xl mx-auto px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="rounded-full">
              <Link href="/dashboard">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Day {day}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
            </div>
            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block" />
            <BrandLogo className="h-8 w-8" />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {lesson ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Privacy-Enhanced Video Embed */}
            <div className="video-container shadow-2xl ring-8 ring-white/50 dark:ring-black/50 relative group select-none">
              {lesson.youtubeVideoId ? (
                <>
                  <iframe 
                    src={`https://www.youtube.com/embed/${lesson.youtubeVideoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&autohide=1`}
                    className="video-iframe border-none" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin"
                    title={lesson.title || `Day ${day}`}
                  />
                  {/* Deterrent: Transparent overlays that block clicks on the Top (Title) and Bottom Right (Logo) areas */}
                  {!isAdmin && (
                    <>
                      {/* Covers the Top Title Area (Title, Watch Later, Share) */}
                      <div className="absolute top-0 left-0 right-0 h-[20%] z-10 bg-transparent cursor-default" />
                      {/* Covers the Bottom Right Logo Area (YouTube Logo) */}
                      <div className="absolute bottom-0 right-0 w-[25%] h-[20%] z-10 bg-transparent cursor-default" />
                      {/* Covers the Bottom Left Area (Watch on YouTube) */}
                      <div className="absolute bottom-0 left-0 w-[20%] h-[15%] z-10 bg-transparent cursor-default" />
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/30 bg-slate-800">
                  <PlayerIcon className="h-16 w-16 mb-4 animate-pulse" />
                  <p className="font-medium">Video content pending</p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex-1 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{lesson.title || `Day ${day} Training`}</h1>
                    <div className="flex gap-4 mt-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                        <BookOpen size={14} /> Module {Math.floor((day - 1) / 30) + 1}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Clock size={14} /> DAY {day}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleToggleComplete}
                      disabled={completing}
                      className={`rounded-full h-12 px-8 font-bold transition-all shadow-lg ${
                        isCompleted 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                          : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-slate-900/20"
                      }`}
                    >
                      {isCompleted ? (
                        <><CheckCircle2 className="mr-2 h-5 w-5" /> Completed</>
                      ) : (
                        "Mark as Complete"
                      )}
                    </Button>
                  </div>
                </div>

                {lesson.description && (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg whitespace-pre-wrap">
                      {lesson.description}
                    </p>
                  </div>
                )}

                {lesson.actionPlan && (
                  <Card className="border-none shadow-sm rounded-3xl bg-primary/5 dark:bg-primary/10 p-8 border-l-4 border-primary">
                    <h3 className="font-black text-primary text-xl mb-4 flex items-center gap-3">
                      <ClipboardList size={24} />
                      Action Plan
                    </h3>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                      {lesson.actionPlan}
                    </div>
                  </Card>
                )}
              </div>

              {lesson.pdfUrl && (
                <div className="md:w-72 shrink-0 space-y-4">
                  <Card className="border-none shadow-sm rounded-3xl bg-card text-card-foreground p-6">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-primary" />
                      Study Material
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
                      Download the day's roadmap.
                    </p>
                    <Button 
                      className="w-full rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-none font-bold"
                      asChild
                    >
                      <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                        Download PDF
                      </a>
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-32 bg-card text-card-foreground rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <PlayerIcon className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Lesson Coming Soon</h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto">This module is currently being finalized.</p>
            <Button asChild variant="outline" className="rounded-full px-8">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
