"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlayerIcon } from "@/app/admin/page";

interface LessonData {
  id?: string;
  courseId?: string;
  title?: string;
  description?: string;
  actionPlan?: string;
  youtubeVideoId?: string;
  vimeoVideoId?: string;
  thumbnailUrl?: string;
  pdfUrl?: string;
  driveUrl?: string;
  dayNumber: number;
  isLocked?: boolean;
}

function LessonContent() {
  const { dayNumber } = useParams();
  const searchParams = useSearchParams();
  const day = parseInt(dayNumber as string);
  const courseId = searchParams.get('courseId');
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!courseId) {
      setNoAccess(true);
      setFetching(false);
      return;
    }

    const fetchLesson = async () => {
      try {
        const q = query(
          collection(db, "lessons"), 
          where("dayNumber", "==", day),
          where("courseId", "==", courseId)
        );
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
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          setNoAccess(true);
        }
      } finally {
        setFetching(false);
      }
    };
    
    fetchLesson();
  }, [user, loading, day, courseId, router]);

  const handleToggleComplete = () => {
    if (!user || !lessonId) return;
    setCompleting(true);

    const progressRef = doc(db, 'users', user.uid, 'completedLessons', lessonId);
    
    if (isCompleted) {
      deleteDoc(progressRef)
        .then(() => {
          setIsCompleted(false);
          toast({ title: "Lesson Unmarked", description: "Lesson removed from completed list." });
        })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: progressRef.path, operation: 'delete' }));
        })
        .finally(() => setCompleting(false));
    } else {
      const data = { completedAt: serverTimestamp() };
      setDoc(progressRef, data)
        .then(() => {
          setIsCompleted(true);
          toast({ title: "Great Job!", description: "Day " + day + " marked as complete." });
        })
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: progressRef.path, operation: 'create', requestResourceData: data }));
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

  if (noAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-50 dark:bg-rose-950 w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <AlertCircle size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed font-medium">
          You are not enrolled in the program containing this session. Please contact your instructor for access.
        </p>
        <Button asChild className="rounded-full px-8 h-12 shadow-lg shadow-primary/20">
          <Link href="/dashboard">Go to My Dashboard</Link>
        </Button>
      </div>
    );
  }

  const getEmbedUrl = () => {
    if (!lesson) return "";
    if (lesson.youtubeVideoId) {
      // Modest branding and parameters for custom feel
      return `https://www.youtube.com/embed/${lesson.youtubeVideoId}?modestbranding=1&rel=0&controls=1&iv_load_policy=3&disablekb=1&fs=1&autoplay=0`;
    }
    if (lesson.vimeoVideoId) {
      return `https://player.vimeo.com/video/${lesson.vimeoVideoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&controls=1`;
    }
    return "";
  };

  return (
    <div className={`min-h-screen bg-background text-foreground pb-20 font-body transition-colors ${!isAdmin ? 'content-protected' : ''}`}>
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40 transition-colors">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild className="rounded-full h-9 px-3">
              <Link href="/dashboard">
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Hub</span>
              </Link>
            </Button>
            <div className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Session {day}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" asChild disabled={day <= 1} className="rounded-full h-9 w-9">
                <Link href={day > 1 ? `/lesson/${day - 1}?courseId=${courseId}` : "#"}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild disabled={day >= 90} className="rounded-full h-9 w-9">
                <Link href={day < 90 ? `/lesson/${day + 1}?courseId=${courseId}` : "#"}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {lesson && (lesson.vimeoVideoId || lesson.youtubeVideoId) ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Premium LMS Masked Video Player */}
            <div className="video-mask mx-auto shadow-2xl bg-black">
              <iframe 
                key={lessonId || day}
                src={getEmbedUrl()}
                className="video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              {/* Invisible Shields to block external navigation and logo links */}
              <div className="click-shield-top" />
              <div className="click-shield-bottom-right" />
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex-1 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground leading-tight">
                      {lesson.title || `Day ${day} Session`}
                    </h1>
                    <div className="flex gap-4 pt-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest">
                        <BookOpen size={12} /> Training Hub
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Clock size={12} /> DAY {day}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleToggleComplete}
                      disabled={completing}
                      className={`rounded-full h-11 sm:h-12 px-6 sm:px-8 font-black transition-all shadow-lg text-xs sm:text-sm uppercase tracking-wider ${
                        isCompleted 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                          : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-slate-900/20"
                      }`}
                    >
                      {isCompleted ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Completed</>
                      ) : (
                        "Mark as Complete"
                      )}
                    </Button>
                  </div>
                </div>

                {lesson.description && (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base sm:text-lg whitespace-pre-wrap font-medium">
                      {lesson.description}
                    </p>
                  </div>
                )}

                {lesson.actionPlan && (
                  <Card className="border-none shadow-sm rounded-3xl bg-primary/5 dark:bg-primary/10 p-6 sm:p-8 border-l-4 border-primary">
                    <h3 className="font-black text-primary text-lg sm:text-xl mb-4 flex items-center gap-3">
                      <ClipboardList size={20} className="sm:size-6" />
                      Action Steps
                    </h3>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-sm sm:text-base whitespace-pre-wrap">
                      {lesson.actionPlan}
                    </div>
                  </Card>
                )}
              </div>

              {(lesson.pdfUrl || lesson.driveUrl) && (
                <div className="md:w-72 shrink-0 space-y-4">
                  <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl bg-card text-card-foreground p-6">
                    <h3 className="font-black text-foreground text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      Materials
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-5 font-bold leading-relaxed">
                      Access supplemental resources for today's session.
                    </p>
                    <div className="flex flex-col gap-3">
                      {lesson.pdfUrl && (
                        <Button 
                          variant="secondary"
                          className="w-full rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-none font-bold text-xs"
                          asChild
                        >
                          <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                          </a>
                        </Button>
                      )}
                      {lesson.driveUrl && (
                        <Button 
                          className="w-full rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-none font-bold text-xs"
                          asChild
                        >
                          <a href={lesson.driveUrl} target="_blank" rel="noopener noreferrer">
                            <Clock className="mr-2 h-4 w-4" /> Drive Resources
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        ) : lesson ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
             <div className="bg-background w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
               <PlayerIcon className="h-10 w-10 sm:h-14 sm:w-14 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2">Video Not Available</h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto text-xs sm:text-sm font-medium">
              This session consists of text materials and resources. Review the action plan below.
            </p>
            {lesson.actionPlan && (
              <div className="max-w-3xl mx-auto text-left">
                <Card className="border-none shadow-sm rounded-3xl bg-primary/5 dark:bg-primary/10 p-6 sm:p-8 border-l-4 border-primary">
                  <h3 className="font-black text-primary text-lg sm:text-xl mb-4 flex items-center gap-3">
                    <ClipboardList size={20} className="sm:size-6" />
                    Action Steps
                  </h3>
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-sm sm:text-base whitespace-pre-wrap">
                    {lesson.actionPlan}
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 sm:py-32 bg-card text-card-foreground rounded-[2rem] sm:rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 mx-auto max-w-2xl">
            <div className="bg-background w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
               <PlayerIcon className="h-10 w-10 sm:h-14 sm:w-14 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2">Session Not Found</h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto text-xs sm:text-sm font-medium">This session hasn't been uploaded yet or you don't have access.</p>
            <Button asChild variant="outline" className="rounded-full px-8 h-11 sm:h-12 font-black text-xs uppercase tracking-widest">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <LessonContent />
    </Suspense>
  );
}
