
"use client";

import React, { useEffect, useRef, useState, Suspense, useImperativeHandle, forwardRef, useMemo } from "react";
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
  onSnapshot,
  orderBy
} from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { useAuth as useAuthContext } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  StickyNote,
  Trash2,
  Activity,
  Share2,
  PlayCircle,
  Clock,
  History,
  TrendingUp,
  Settings
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

interface PlayerHandle {
  currentTime: number;
  seek: (time: number) => void;
  pause: () => void;
  play: () => void;
  togglePlay: () => void;
}

const CustomVideoPlayer = forwardRef<PlayerHandle, { videoId: string, provider: 'youtube' | 'vimeo' }>(({ videoId, provider }, ref) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return playerRef.current?.currentTime || 0;
    },
    seek(time: number) {
      if (playerRef.current) {
        playerRef.current.currentTime = time;
        playerRef.current.play();
      }
    },
    pause() {
      playerRef.current?.pause();
    },
    play() {
      playerRef.current?.play();
    },
    togglePlay() {
      if (playerRef.current) {
        playerRef.current.togglePlay();
      }
    }
  }));

  useEffect(() => {
    let active = true;
    if (typeof window === "undefined" || !videoId) return;

    const initPlyr = async () => {
      try {
        const PlyrModule = await import('plyr');
        const PlyrClass = PlyrModule.default;
        
        if (!active || !containerRef.current) return;

        if (playerRef.current) {
          playerRef.current.destroy();
        }

        playerRef.current = new PlyrClass(containerRef.current, {
          clickToPlay: true,
          keyboard: { focused: true, global: true },
          controls: [
            'play-large', 
            'play', 
            'progress', 
            'current-time', 
            'duration', 
            'settings', 
            'fullscreen'
          ],
          settings: ['quality', 'speed'],
          quality: {
            default: 1080,
            options: [1080, 720, 540, 480, 360, 240],
            forced: true,
          },
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
          vimeo: { byline: false, portrait: false, title: false, transparent: false }
        });
        
        playerRef.current.on('ready', () => {
          if (active) setIsInitializing(false);
        });

      } catch (err) {
        console.warn("Plyr initialization error:", err);
      }
    };

    initPlyr();

    return () => {
      active = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, provider]);

  return (
    <div className="w-full h-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl relative">
      <div 
        key={`${provider}-${videoId}`} 
        ref={containerRef} 
        data-plyr-provider={provider} 
        data-plyr-embed-id={videoId}
      />
      
      {/* Interaction Shield covering top 70% to prevent YouTube clicks while leaving controls interactive */}
      <div 
        className="absolute inset-x-0 top-0 bottom-[30%] z-40 overflow-hidden select-none cursor-pointer flex items-center justify-center pointer-events-auto"
        onClick={() => playerRef.current?.togglePlay()}
      >
        <div className="absolute top-10 left-10 -rotate-12 text-white opacity-10 text-[10px] font-bold">Freedom Magnet Hub</div>
        <div className="absolute top-10 right-10 -rotate-12 text-white opacity-10 text-[10px] font-bold">Freedom Magnet Hub</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-white opacity-10 text-sm font-black whitespace-nowrap">Freedom Magnet Hub</div>
      </div>
      
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50">
          <Loader2 className="animate-spin h-10 w-10 text-primary mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preparing Session...</p>
        </div>
      )}
    </div>
  );
});

CustomVideoPlayer.displayName = "CustomVideoPlayer";

function LessonContent() {
  const { dayNumber } = useParams();
  const searchParams = useSearchParams();
  const day = parseInt(dayNumber as string);
  const courseId = searchParams.get('courseId');
  const router = useRouter();
  const { user, loading, isAdmin, profile } = useAuthContext();
  const firestore = db;
  const { toast } = useToast();
  const playerRef = useRef<PlayerHandle>(null);
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [allLessons, setAllLessons] = useState<LessonData[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  const [notes, setNotes] = useState<UserNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [resumeAfterSave, setResumeAfterSave] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handleContextMenu);
      return () => document.removeEventListener("contextmenu", handleContextMenu);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (loading || !firestore) return;

    const fetchLessonData = async () => {
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

        const allLessonsQ = query(collection(db, "lessons"), where("courseId", "==", courseId));
        const allLessonsSnap = await getDocs(allLessonsQ);
        const fetchedAllLessons = allLessonsSnap.docs
          .map(d => ({ ...d.data(), id: d.id } as LessonData))
          .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)); 
        setAllLessons(fetchedAllLessons);

        const currentLesson = fetchedAllLessons.find(l => l.dayNumber === day);
        if (currentLesson && currentLesson.id) {
          setLessonId(currentLesson.id);
          setLesson(currentLesson);
        } else { setLesson(null); }
      } catch (error) {
        console.warn("Session data fetch error:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchLessonData();
  }, [user, loading, day, courseId, firestore, router]);

  useEffect(() => {
    if (!user || !firestore) return;
    const progressRef = collection(firestore, 'users', user.uid, 'completedLessons');
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setCompletedLessonIds(ids);
      if (lessonId) {
        setIsCompleted(ids.includes(lessonId));
      }
    });
    return () => unsubscribe();
  }, [user, firestore, lessonId]);

  useEffect(() => {
    if (!user || !lessonId || !firestore) return;
    const notesQ = query(collection(firestore, "user_notes"), where("userId", "==", user.uid), where("lessonId", "==", lessonId), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(notesQ, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserNote));
      setNotes(fetchedNotes);
    });
    return () => unsubscribe();
  }, [user, lessonId, firestore]);

  const handleToggleComplete = async () => {
    if (!user || !lessonId || !firestore || completing || isCompleted) return;
    setCompleting(true);
    const progressRef = doc(firestore, 'users', user.uid, 'completedLessons', lessonId);
    try {
      await setDoc(progressRef, { completedAt: serverTimestamp() });
      toast({ title: "Lesson Completed!", description: "Progress updated successfully." });
    } catch (err) {
      console.warn("Progress update error:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !lessonId || !noteText.trim() || !firestore) return;
    setSavingNote(true);
    const videoTimestamp = playerRef.current?.currentTime || 0;
    try {
      await addDoc(collection(firestore, "user_notes"), {
        userId: user.uid, lessonId, courseId: courseId || '', text: noteText, timestamp: videoTimestamp, createdAt: serverTimestamp()
      });
      setNoteText("");
      toast({ title: "Note Saved" });
      if (resumeAfterSave) playerRef.current?.play();
    } catch (err) {
      console.warn("Note save error:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const progressPercentage = useMemo(() => {
    if (!allLessons.length) return 0;
    const completedInCourse = allLessons.filter(l => completedLessonIds.includes(l.id!)).length;
    return Math.round((completedInCourse / allLessons.length) * 100);
  }, [allLessons, completedLessonIds]);

  if (loading || fetching) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-primary" />
      <p className="font-bold text-slate-400 text-xs uppercase tracking-widest">Syncing Session...</p>
    </div>
  );

  const videoId = lesson?.vimeoVideoId || lesson?.youtubeVideoId;
  const provider = lesson?.vimeoVideoId ? 'vimeo' : 'youtube';

  return (
    <div className={cn("min-h-screen bg-background text-foreground pb-20 transition-colors", !isAdmin && "content-protected")}>
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full text-slate-500"><Link href="/dashboard"><ChevronLeft className="mr-1 h-4 w-4" /> Hub</Link></Button>
          <div className="font-black flex items-center gap-1.5 uppercase tracking-tighter">freedom<span className="text-primary">magnethub</span></div>
          <div className="flex items-center gap-2"><ThemeToggle /></div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto py-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black">
              {videoId ? <CustomVideoPlayer ref={playerRef} videoId={videoId} provider={provider} /> : <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500"><Activity className="w-12 h-12 mb-4 animate-pulse" /><p className="font-bold uppercase text-[10px] tracking-widest">Finalizing Content...</p></div>}
            </div>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1"><h1 className="text-3xl sm:text-4xl font-black tracking-tight">{lesson?.title || 'Training Session'}</h1>{course && <p className="text-sm font-bold text-primary uppercase tracking-widest">{course.title}</p>}</div>
                <div className="flex items-center gap-3">
                   <Button onClick={handleToggleComplete} disabled={completing || isCompleted} className={cn("rounded-full px-8 h-11 font-black shadow-lg transition-all", isCompleted ? "bg-emerald-500 text-white cursor-default opacity-100 shadow-none" : "bg-primary shadow-primary/20")}>{isCompleted ? "Session Completed" : "Mark as Complete"}</Button>
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-8">
                <div><h3 className="text-xl font-black mb-4 flex items-center gap-2 tracking-tight"><AlertCircle size={20} className="text-primary"/> Overview</h3><p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium">{lesson?.description || "No overview provided."}</p></div>
                {lesson?.actionPlan && (<div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 h-fit shadow-sm"><h3 className="text-xl font-black mb-3 text-primary flex items-center gap-2 tracking-tight"><CheckCircle2 size={18} /> Action Plan</h3><p className="font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">{lesson.actionPlan}</p></div>)}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] p-6 shadow-xl border-none bg-white dark:bg-slate-900"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-black flex items-center gap-2 tracking-tight"><TrendingUp className="text-primary h-5 w-5" /> Track Progress</h2><span className="text-sm font-black text-primary">{progressPercentage}%</span></div><Progress value={progressPercentage} className="h-2 rounded-full mb-2 bg-slate-100 dark:bg-slate-800" /><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Your Course Completion</p></Card>
            <Card className="rounded-[2.5rem] p-6 shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden"><h2 className="text-xl font-black mb-4 flex items-center gap-3 tracking-tight"><PlayCircle className="text-primary"/> Sessions</h2><ScrollArea className="h-[200px] pr-4"><div className="space-y-2">
              {allLessons.map((l) => {
                const isActive = l.dayNumber === day;
                const isLessonDone = completedLessonIds.includes(l.id!);
                return (<Link href={`/lesson/${l.dayNumber}?courseId=${courseId}`} key={l.id}><div className={cn("flex items-center gap-3 p-4 rounded-2xl transition-all border", isActive ? "bg-primary/10 border-primary/20 text-primary font-bold" : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100")}><div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shrink-0", isActive ? "bg-primary text-white" : isLessonDone ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700")}>{isLessonDone && !isActive ? <CheckCircle2 size={14} /> : l.dayNumber}</div><p className="flex-1 text-sm line-clamp-1">{l.title}</p></div></Link>)
              })}
            </div></ScrollArea></Card>
            <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden flex flex-col min-h-[400px]">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 tracking-tight"><StickyNote className="text-primary"/> Study Notes</h2>
              <ScrollArea className="flex-1 mb-6 pr-4"><div className="space-y-6 relative ml-4 pl-6 border-l-2 border-slate-100 dark:border-slate-800">
                {notes.map(note => (<div key={note.id} className="relative group"><div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary" /><div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all"><div className="flex justify-between items-start mb-2"><button onClick={() => playerRef.current?.seek(note.timestamp)} className="bg-primary text-white px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">{Math.floor(note.timestamp / 60)}:{(Math.floor(note.timestamp % 60)).toString().padStart(2, '0')}</button><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteDoc(doc(firestore, 'user_notes', note.id))}><Trash2 size={12}/></Button></div><p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{note.text}</p></div></div>))}
              </div></ScrollArea>
              <div className="pt-6 border-t dark:border-slate-800 space-y-4">
                <Textarea placeholder="Capture insights..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onFocus={() => playerRef.current?.pause()} className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-none min-h-[80px] p-4" />
                <Button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} className="w-full rounded-full h-11 font-black shadow-lg shadow-primary/20">{savingNote ? "Syncing..." : "Publish Note"}</Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LessonPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}><LessonContent /></Suspense>);
}
