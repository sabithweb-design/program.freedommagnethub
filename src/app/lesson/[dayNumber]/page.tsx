
"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  GraduationCap, 
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertCircle,
  Play
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

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
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  
  // Facade Logic: Start with loaded = false
  const [isLoaded, setIsLoaded] = useState(false);

  // Content Protection for non-admins
  useEffect(() => {
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  // Reset Facade when day changes
  useEffect(() => {
    setIsLoaded(false);
  }, [day]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const currentPath = window.location.pathname + (window.location.search || '');
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!courseId) {
      setNoAccess(true);
      setFetching(false);
      return;
    }

    const fetchLesson = async () => {
      setFetching(true);
      try {
        const q = query(
          collection(db, "lessons"), 
          where("dayNumber", "==", day),
          where("courseId", "==", courseId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const lId = querySnapshot.docs[0].id;
          const lData = querySnapshot.docs[0].data() as LessonData;
          setLessonId(lId);
          setLesson(lData);

          const progressRef = doc(db, 'users', user.uid, 'completedLessons', lId);
          const docSnap = await getDoc(progressRef);
          setIsCompleted(docSnap.exists());
        } else {
          setLessonId(null);
          setLesson(null);
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
    if (completing) return;
    setCompleting(true);

    const progressRef = doc(doc(db, 'users', user.uid), 'completedLessons', lessonId);
    
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

  const videoId = lesson?.youtubeVideoId || "P5_rBMem0cE";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0`;

  if (loading || (fetching && !lesson)) {
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

  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground pb-20 font-body transition-colors",
      !isAdmin && "content-protected"
    )}>
      {/* Navigation Header */}
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40 transition-colors">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild className="rounded-full h-9 px-3 text-slate-600 dark:text-slate-400">
              <Link href="/dashboard">
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline font-bold">Hub</span>
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

      <main className="max-w-7xl mx-auto py-8">
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Industry Standard Click-to-Load Facade Pattern */}
          <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6">
            <div className="relative aspect-video w-full rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl bg-slate-950">
              {!isLoaded ? (
                // Facade View
                <div 
                  className="absolute inset-0 cursor-pointer group flex items-center justify-center"
                  onClick={() => setIsLoaded(true)}
                >
                  {/* Background Thumbnail if available, else dark placeholder */}
                  {lesson?.thumbnailUrl ? (
                    <Image 
                      src={lesson.thumbnailUrl} 
                      alt={lesson.title || "Session Thumbnail"} 
                      fill 
                      className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <Image 
                      src={`https://picsum.photos/seed/${videoId}/1280/720`}
                      alt="Session Placeholder"
                      fill
                      className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  
                  {/* High-Impact Central Play Button */}
                  <div className="relative z-10 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all pointer-events-auto">
                    <Play className="text-slate-950 fill-slate-950 w-6 h-6 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ml-1" />
                  </div>

                  {/* Overlay branding gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              ) : (
                // Native Iframe View (Loads only after interaction)
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={lesson?.title || `Session ${day}`}
                />
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-12">
              <div className="flex-1 space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b dark:border-slate-800 pb-8">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none">
                      {lesson?.title || `Day ${day} Session`}
                    </h1>
                    <div className="flex gap-4 pt-4">
                      <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                        Module 01
                      </Badge>
                      <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Clock size={12} /> SESSION {day}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleToggleComplete}
                      disabled={completing}
                      className={cn(
                        "rounded-full h-14 px-10 font-black transition-all shadow-xl text-xs uppercase tracking-widest border-2",
                        isCompleted 
                          ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                          : "bg-slate-900 dark:bg-slate-100 border-transparent dark:text-slate-900 shadow-slate-900/20"
                      )}
                    >
                      {isCompleted ? (
                        <><CheckCircle2 className="mr-3 h-5 w-5" /> Completed</>
                      ) : (
                        "Mark Session Complete"
                      )}
                    </Button>
                  </div>
                </div>

                {lesson?.description && (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg sm:text-xl whitespace-pre-wrap font-medium">
                      {lesson.description}
                    </p>
                  </div>
                )}

                {lesson?.actionPlan && (
                  <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem] bg-primary/5 dark:bg-primary/10 p-6 sm:p-12 border-l-8 border-primary relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ClipboardList className="text-primary size-12 sm:size-20" />
                    </div>
                    <h3 className="font-black text-primary text-xl sm:text-2xl mb-6 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                        <ClipboardList size={20} />
                      </div>
                      Action & Implementation
                    </h3>
                    <div className="text-slate-700 dark:text-slate-200 leading-relaxed font-bold text-base sm:text-lg whitespace-pre-wrap relative z-10">
                      {lesson.actionPlan}
                    </div>
                  </Card>
                )}
              </div>

              {(lesson?.pdfUrl || lesson?.driveUrl) && (
                <div className="lg:w-80 shrink-0 space-y-6">
                  <Card className="border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[1.5rem] sm:rounded-[2.5rem] bg-card text-card-foreground p-6 sm:p-8">
                    <h3 className="font-black text-foreground text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                      <FileText size={18} className="text-primary" />
                      Learning Assets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-bold leading-relaxed">
                      Download the supplemental materials to reinforce your training.
                    </p>
                    <div className="flex flex-col gap-4">
                      {lesson.pdfUrl && (
                        <Button 
                          variant="secondary"
                          className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-none font-black text-xs uppercase tracking-widest shadow-sm"
                          asChild
                        >
                          <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-3 h-5 w-5 text-primary" /> Workbook PDF
                          </a>
                        </Button>
                      )}
                      {lesson.driveUrl && (
                        <Button 
                          className="w-full h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-none font-black text-xs uppercase tracking-widest shadow-sm"
                          asChild
                        >
                          <a href={lesson.driveUrl} target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" className="mr-3 h-5 w-5" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg> Resource Drive
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
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
