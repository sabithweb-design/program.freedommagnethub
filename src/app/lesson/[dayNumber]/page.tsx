
"use client";

import { useEffect, useState, Suspense, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, serverTimestamp, addDoc, orderBy, setDoc, Query } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent as UICardContent, CardHeader as UICardHeader, CardTitle as UICardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import dynamic from 'next/dynamic';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  GraduationCap, 
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertCircle,
  Loader2,
  StickyNote,
  Send,
  Trash2,
  Bookmark,
  Activity,
  Download,
  Lock as LockIcon
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

// Import Plyr
const Plyr = dynamic(() => import('plyr-react'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-[2rem]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )
});

interface LessonData {
  id?: string;
  courseId?: string;
  title?: string;
  description?: string;
  actionPlan?: string;
  driveVideoUrl?: string;
  youtubeVideoId?: string;
  vimeoVideoId?: string;
  thumbnailUrl?: string;
  pdfUrl?: string;
  dayNumber: number;
  isLocked?: boolean;
}

interface CourseData {
  id: string;
  title: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  studentIds?: string[];
}

interface UserNote {
  id: string;
  text: string;
  timestamp: number;
  createdAt: any;
}

function LessonContent() {
  const { dayNumber } = useParams();
  const searchParams = useSearchParams();
  const day = parseInt(dayNumber as string);
  const courseId = searchParams.get('courseId');
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const [course, setCourse] = useState<CourseData | null>(null);

  // Notes State
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [capturedTimestamp, setCapturedTimestamp] = useState<number | null>(null);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (loading || !firestore) return;

    if (!courseId) {
      setNoAccess(true);
      setFetching(false);
      return;
    }

    const fetchLesson = async () => {
      setFetching(true);
      try {
        const courseRef = doc(firestore, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
          setNoAccess(true);
          setFetching(false);
          return;
        }

        const cData = courseSnap.data() as CourseData;
        setCourse({ ...cData, id: courseSnap.id });

        if (cData.visibility !== 'PUBLIC' && !user) {
          const currentPath = window.location.pathname + (window.location.search || '');
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        if (cData.visibility === 'PRIVATE' && !isAdmin && !cData.studentIds?.includes(user?.uid || '')) {
          setNoAccess(true);
          setFetching(false);
          return;
        }

        const q = query(
          collection(firestore, "lessons"), 
          where("dayNumber", "==", day),
          where("courseId", "==", courseId)
        ) as Query<LessonData>;
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const lId = querySnapshot.docs[0].id;
          const lData = querySnapshot.docs[0].data() as LessonData;
          setLessonId(lId);
          setLesson({ ...lData, id: lId });

          if (user) {
            const progressRef = doc(firestore, 'users', user.uid, 'completedLessons', lId);
            const docSnap = await getDoc(progressRef);
            setIsCompleted(docSnap.exists());
          }
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
  }, [user, loading, day, courseId, router, isAdmin, firestore]);

  const notesQuery = useMemo(() => {
    if (!firestore || !user || !lessonId) return null;
    return query(
      collection(firestore, "user_notes"),
      where("userId", "==", user.uid),
      where("lessonId", "==", lessonId),
      orderBy("createdAt", "desc")
    ) as Query<UserNote>;
  }, [firestore, user, lessonId]);

  const { data: notes } = useCollection<UserNote>(notesQuery);

  const handleToggleComplete = () => {
    if (!user || !lessonId || !firestore) return;
    if (completing) return;
    setCompleting(true);

    const progressRef = doc(firestore, 'users', user.uid, 'completedLessons', lessonId);
    
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

  const handleNoteFocus = () => {
    if (playerRef.current?.plyr) {
      const plyr = playerRef.current.plyr;
      if (plyr.playing) {
        plyr.pause();
      }
      setCapturedTimestamp(plyr.currentTime);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !lessonId || !noteText.trim() || capturedTimestamp === null || !firestore) return;
    setSavingNote(true);

    const noteData = {
      userId: user.uid,
      lessonId: lessonId,
      courseId: courseId || '',
      text: noteText,
      timestamp: capturedTimestamp,
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, "user_notes"), noteData)
      .then(() => {
        setNoteText("");
        setCapturedTimestamp(null);
        playerRef.current?.plyr?.play();
        toast({ title: "Note Saved", description: "Timestamped note added to your collection." });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'user_notes', operation: 'create', requestResourceData: noteData }));
      })
      .finally(() => setSavingNote(false));
  };

  const handleDeleteNote = (id: string) => {
    if (!firestore) return;
    const noteRef = doc(firestore, 'user_notes', id);
    deleteDoc(noteRef).catch((err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: noteRef.path, operation: 'delete' }));
    });
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const plyrSource = useMemo(() => {
    if (!lesson) return null;
    if (lesson.vimeoVideoId) {
      return {
        type: 'video',
        sources: [{ src: lesson.vimeoVideoId, provider: 'vimeo' }]
      };
    }
    if (lesson.youtubeVideoId) {
      return {
        type: 'video',
        sources: [{ src: lesson.youtubeVideoId, provider: 'youtube' }]
      };
    }
    return null;
  }, [lesson]);

  const plyrOptions = {
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
    settings: ['quality', 'speed'],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
    vimeo: { byline: false, portrait: false, title: false, transparent: false }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
        <p className="font-bold text-slate-400 animate-pulse">Syncing Session...</p>
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-50 dark:bg-rose-950 w-24 h-24 rounded-full flex items-center justify-center mb-8">
          <AlertCircle size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          This program is private and requires enrollment to view content.
        </p>
        <Button asChild className="rounded-full px-8 h-12">
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
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild className="rounded-full h-9 px-3 text-slate-600 dark:text-slate-400">
              <Link href="/dashboard">
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline font-bold">Hub</span>
              </Link>
            </Button>
            <div className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-5 w-5 text-primary" />
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

      <main className="max-w-[1600px] mx-auto py-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-8 space-y-10">
            <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black group">
              {plyrSource ? (
                <Plyr 
                  ref={playerRef}
                  source={plyrSource as any} 
                  options={plyrOptions as any} 
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed rounded-[2rem]">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <Activity className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-foreground">Session Coming Soon</h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">
                      Day {day} content is currently being finalized for this program track.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-none">
                    {lesson?.title || `Day ${day} Session`}
                  </h1>
                  <div className="flex items-center gap-4 pt-2">
                    <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      Session {day}
                    </Badge>
                    <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <Clock size={12} /> {course?.visibility === 'PUBLIC' ? 'PUBLIC ACCESS' : 'PREMIUM CONTENT'}
                    </span>
                  </div>
                </div>
                
                {lessonId && user && (
                  <Button 
                    onClick={handleToggleComplete}
                    disabled={completing}
                    className={cn(
                      "rounded-full h-14 px-10 font-black transition-all shadow-xl text-xs uppercase tracking-widest border-2 active:scale-95",
                      isCompleted 
                        ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600 text-white" 
                        : "bg-slate-900 dark:bg-slate-100 border-transparent dark:text-slate-900"
                    )}
                  >
                    {isCompleted ? <><CheckCircle2 className="mr-3 h-5 w-5" /> Done</> : "Mark Complete"}
                  </Button>
                )}
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-black flex items-center gap-2">
                      <AlertCircle size={20} className="text-primary" /> Session Overview
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      {lesson?.description && lesson.description.length > 10 ? (
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                          {lesson.description}
                        </p>
                      ) : (
                        <p className="text-slate-400 font-bold italic text-base">
                          Overview coming soon! Stay tuned for more details about this session.
                        </p>
                      )}
                    </div>
                  </div>

                  {lesson?.pdfUrl && (
                    <Card className="border-none shadow-xl rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 overflow-hidden group">
                      <div className="p-6 lg:p-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
                        <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                          <FileText className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">Class Handouts</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">High-Resolution PDF Workbook</p>
                        </div>
                        <Button 
                          asChild
                          className="w-full sm:w-auto rounded-2xl h-12 lg:h-14 px-6 lg:px-8 font-black text-[10px] lg:text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all"
                        >
                          <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </a>
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-10">
                  {lesson?.actionPlan && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-black flex items-center gap-2 text-primary">
                        <ClipboardList size={20} /> Action Plan
                      </h3>
                      <div className="bg-primary/5 dark:bg-primary/10 p-7 rounded-3xl border border-primary/10 relative overflow-hidden group">
                        <div className="text-slate-700 dark:text-slate-200 leading-relaxed font-bold text-base whitespace-pre-wrap relative z-10">
                          {lesson.actionPlan}
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <ClipboardList size={80} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 h-full">
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 h-full flex flex-col sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden">
              <UICardHeader className="border-b dark:border-slate-800 px-8 py-6">
                <UICardTitle className="text-2xl font-black flex items-center gap-3">
                  <StickyNote size={24} className="text-primary" /> Study Notes
                </UICardTitle>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Live Sync Active</p>
              </UICardHeader>
              
              <div className="px-8 py-6 space-y-4">
                {user ? (
                  <div className="relative">
                    <Textarea 
                      placeholder="Capture a key takeaway..."
                      value={noteText}
                      onFocus={handleNoteFocus}
                      onChange={(e) => {
                        setNoteText(e.target.value);
                        if (capturedTimestamp === null) handleNoteFocus();
                      }}
                      className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-primary font-medium p-4 text-slate-800 dark:text-slate-200"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      {capturedTimestamp !== null && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full animate-pulse border border-primary/20">
                          <Activity size={12} className="stroke-[3]" />
                          <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                            Syncing {formatTime(capturedTimestamp)}
                          </span>
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        onClick={handleSaveNote} 
                        disabled={savingNote || !noteText.trim()}
                        className="rounded-full h-10 w-10 bg-primary shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                      >
                        {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center space-y-2">
                    <LockIcon size={24} className="mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-500">Sign in to save personal study notes.</p>
                    <Button variant="link" size="sm" asChild className="text-primary">
                      <Link href="/login">Login Now</Link>
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 px-8 pb-8">
                <div className="space-y-4 pt-2">
                  {notes && notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="group bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-transparent hover:border-primary/20 transition-all hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <button 
                            onClick={() => {
                              if (playerRef.current?.plyr) {
                                playerRef.current.plyr.currentTime = note.timestamp;
                                playerRef.current.plyr.play();
                              }
                            }}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                          >
                            <Bookmark size={14} className="fill-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">{formatTime(note.timestamp)}</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {note.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-20">
                      <StickyNote size={48} />
                      <p className="text-xs font-black uppercase tracking-widest">{user ? "No notes yet" : "Personalize your learning"}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
        <p className="font-bold text-slate-400">Loading Track...</p>
      </div>
    }>
      <LessonContent />
    </Suspense>
  );
}
