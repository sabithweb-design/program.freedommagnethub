"use client";

import React, { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  Query
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuth as useAuthContext } from "@/context/auth-context";
import { useCollection, useAuth as useFirebaseAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  StickyNote,
  Trash2,
  Activity,
  Share2,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LessonData {
  id?: string; 
  title: string;
  description?: string;
  videoUrl?: string;
  actionPlan?: string;
  youtubeVideoId?: string;
  vimeoVideoId?: string;
  dayNumber: number;
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

/**
 * Isolated Player Component to manage Plyr lifecycle and prevent 'getAttribute' errors.
 */
function CustomVideoPlayer({ videoId, provider }: { videoId: string, provider: 'youtube' | 'vimeo' }) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    if (typeof window === "undefined" || !videoId) return;

    const initPlyr = async () => {
      try {
        const PlyrModule = await import('plyr');
        const PlyrClass = PlyrModule.default;
        
        if (!active || !containerRef.current) return;

        // Clean up any existing instance first
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            // Silently handle destruction errors
          }
        }

        playerRef.current = new PlyrClass(containerRef.current, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
          vimeo: { byline: false, portrait: false, title: false, transparent: false }
        });
        
        if (active) setIsInitializing(false);
      } catch (err) {
        console.error("Plyr initialization failed:", err);
      }
    };

    initPlyr();

    return () => {
      active = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Silently handle destruction errors
        }
        playerRef.current = null;
      }
    };
  }, [videoId, provider]);

  return (
    <div className="w-full h-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl relative">
      <div 
        key={`player-${provider}-${videoId}`}
        ref={containerRef} 
        data-plyr-provider={provider} 
        data-plyr-embed-id={videoId}
      />
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <Loader2 className="animate-spin h-10 w-10 text-primary mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preparing Session...</p>
        </div>
      )}
    </div>
  );
}

function LessonContent() {
  const { dayNumber } = useParams();
  const searchParams = useSearchParams();
  const day = parseInt(dayNumber as string);
  const courseId = searchParams.get('courseId');
  const router = useRouter();
  const { user, loading, isAdmin } = useAuthContext();
  const auth = useFirebaseAuth();
  const firestore = db;
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [course, setCourse] = useState<CourseData | null>(null);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Deterrent for non-admins
  useEffect(() => {
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  // Data Fetching
  useEffect(() => {
    if (loading || !firestore) return;

    const fetchLesson = async () => {
      if (!courseId) {
        setFetching(false);
        return;
      }

      setFetching(true);
      try {
        const courseRef = doc(firestore, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
          setFetching(false);
          return;
        }

        const cData = courseSnap.data() as CourseData;
        setCourse({ ...cData, id: courseSnap.id });

        if (cData.visibility !== 'PUBLIC' && !user) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }

        const q = query(collection(db, "lessons"), where("dayNumber", "==", day), where("courseId", "==", courseId)) as Query<LessonData>;
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const lDoc = querySnapshot.docs[0];
          setLessonId(lDoc.id);
          setLesson({ ...lDoc.data(), id: lDoc.id });
          
          if (user) {
            const docSnap = await getDoc(doc(firestore, 'users', user.uid, 'completedLessons', lDoc.id));
            setIsCompleted(docSnap.exists());
          }
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
  }, [user, loading, day, courseId, firestore, router]);

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

  const handleToggleComplete = async () => {
    if (!user || !lessonId || !firestore || completing) return;
    setCompleting(true);
    const progressRef = doc(firestore, 'users', user.uid, 'completedLessons', lessonId);
    try {
      if (isCompleted) {
        await deleteDoc(progressRef);
        setIsCompleted(false);
        toast({ title: "Progress Reset", description: "Lesson marked as incomplete." });
      } else {
        await setDoc(progressRef, { completedAt: serverTimestamp() });
        setIsCompleted(true);
        toast({ title: "Lesson Completed!", description: "Way to go! On to the next one." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !lessonId || !noteText.trim() || !firestore) return;
    setSavingNote(true);
    try {
      await addDoc(collection(firestore, "user_notes"), {
        userId: user.uid, 
        lessonId, 
        courseId: courseId || '',
        text: noteText, 
        timestamp: 0, 
        createdAt: serverTimestamp()
      });
      setNoteText("");
      toast({ title: "Note Saved", description: "Your study note has been added to this lesson." });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleShareCourse = () => {
    if (!courseId) return;
    const url = `${window.location.origin}/lesson/1?courseId=${courseId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Hub access link copied to clipboard.",
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading || fetching) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-primary" />
      <p className="font-bold text-slate-400">Syncing Session...</p>
    </div>
  );

  const videoId = lesson?.vimeoVideoId || lesson?.youtubeVideoId;
  const provider = lesson?.vimeoVideoId ? 'vimeo' : 'youtube';

  return (
    <div className={cn("min-h-screen bg-background text-foreground pb-20 transition-colors", !isAdmin && "content-protected")}>
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/dashboard"><ChevronLeft className="mr-1 h-4 w-4" /> Hub</Link>
          </Button>
          <div className="font-bold flex items-center gap-1.5 uppercase tracking-tighter">
            freedom<span className="text-primary">magnethub</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-bold uppercase">Session {day}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShareCourse} className="rounded-full h-9 w-9 text-slate-400" title="Share Hub">
              <Share2 size={18} />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full h-9 w-9 text-slate-400 hover:text-red-500 transition-colors" title="Sign Out">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto py-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black">
              {videoId ? (
                <div className="w-full h-full relative">
                  <CustomVideoPlayer videoId={videoId} provider={provider} />
                  {user && (
                    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-10 select-none">
                      <div className="absolute top-10 left-10 -rotate-12 text-white text-[10px] font-bold">{user.email}</div>
                      <div className="absolute bottom-10 right-10 -rotate-12 text-white text-[10px] font-bold">{user.email}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500">
                  <Activity className="w-12 h-12 mb-4 animate-pulse" />
                  <p className="font-bold uppercase text-[10px] tracking-widest">Session Content Finalizing...</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{lesson?.title || `Session ${day}`}</h1>
                  {course && <p className="text-sm font-bold text-primary uppercase tracking-widest">{course.title}</p>}
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="outline" onClick={handleShareCourse} className="rounded-full flex gap-2 font-bold h-11 px-6 border-slate-200 dark:border-slate-800">
                     <Share2 size={16} /> Share Hub
                   </Button>
                   <Button onClick={handleToggleComplete} disabled={completing} className={cn("rounded-full px-8 h-11 font-black shadow-lg transition-all", isCompleted ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-primary shadow-primary/20")}>
                    {isCompleted ? "Session Completed" : "Mark Complete"}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-black mb-4 flex items-center gap-2 tracking-tight"><AlertCircle size={20} className="text-primary"/> Overview</h3>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium">{lesson?.description || "No overview provided for this session yet."}</p>
                </div>
                {lesson?.actionPlan && (
                  <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 h-fit shadow-sm">
                    <h3 className="text-xl font-black mb-3 text-primary flex items-center gap-2 tracking-tight"><CheckCircle2 size={18} /> Action Plan</h3>
                    <p className="font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">{lesson.actionPlan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] p-8 shadow-2xl sticky top-24 border-none bg-white dark:bg-slate-900 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <StickyNote size={80} />
              </div>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3 tracking-tight">
                <StickyNote className="text-primary"/> Study Notes
              </h2>
              <Textarea 
                placeholder="Capture your insights from this session..." 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)}
                className="rounded-2xl mb-4 bg-slate-50 dark:bg-slate-800 border-none min-h-[140px] focus-visible:ring-primary/20 p-5 font-medium"
              />
              <Button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} className="w-full rounded-full h-12 font-bold shadow-lg shadow-primary/20">
                {savingNote ? "Saving..." : "Save Note"}
              </Button>
              
              <ScrollArea className="h-[400px] mt-8 pr-4">
                <div className="space-y-4">
                  {notes && notes.length > 0 ? notes.map(note => (
                    <div key={note.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all group relative overflow-hidden">
                       <div className="flex justify-between items-center mb-3">
                         <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest tabular-nums">Saved Entry</span>
                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 shadow-sm" onClick={() => deleteDoc(doc(firestore, 'user_notes', note.id))}>
                            <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                         </Button>
                       </div>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{note.text}</p>
                    </div>
                  )) : (
                    <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                      <p className="text-xs font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">Insights are empty</p>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}>
      <LessonContent />
    </Suspense>
  );
}
