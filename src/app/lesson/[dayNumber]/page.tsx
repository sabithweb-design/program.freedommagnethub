"use client";

import React, { useEffect, useRef, useState, Suspense, useImperativeHandle, forwardRef } from "react";
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
  History
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
          clickToPlay: false, // Block default click-to-play on the video area
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'captions', 'settings', 'fullscreen'],
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
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
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
  const { user, loading, isAdmin } = useAuthContext();
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
          
          if (user) {
            const docSnap = await getDoc(doc(firestore, 'users', user.uid, 'completedLessons', currentLesson.id));
            setIsCompleted(docSnap.exists());
          }
        } else { 
          setLesson(null); 
        }
      } catch (error) {
        console.warn("Session data fetch error:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchLessonData();
  }, [user, loading, day, courseId, firestore, router]);

  useEffect(() => {
    if (!user || !lessonId || !firestore) return;

    const notesQ = query(
      collection(firestore, "user_notes"),
      where("userId", "==", user.uid),
      where("lessonId", "==", lessonId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(notesQ, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserNote));
      setNotes(fetchedNotes);
    }, (error) => {
      console.warn("Notes listener error:", error);
    });

    return () => unsubscribe();
  }, [user, lessonId, firestore]);

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
        userId: user.uid, 
        lessonId, 
        courseId: courseId || '',
        text: noteText, 
        timestamp: videoTimestamp, 
        createdAt: serverTimestamp()
      });
      setNoteText("");
      toast({ title: "Note Saved", description: "Your study note has been added to this session." });
      if (resumeAfterSave) {
        playerRef.current?.play();
      }
    } catch (err) {
      console.warn("Note save error:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (time: number) => {
    playerRef.current?.seek(time);
  };

  const handleNoteFocus = () => {
    playerRef.current?.pause();
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
          <Button variant="ghost" size="sm" asChild className="rounded-full text-slate-500">
            <Link href="/dashboard"><ChevronLeft className="mr-1 h-4 w-4" /> Hub</Link>
          </Button>
          <div className="font-bold flex items-center gap-1.5 uppercase tracking-tighter">
            freedom<span className="text-primary">magnethub</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={handleShareCourse} className="rounded-full h-9 w-9 text-slate-400" title="Share Hub">
                <Share2 size={18} />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto py-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <div className="lg:col-span-8 space-y-8">
            <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black">
              {videoId ? (
                <div className="w-full h-full relative">
                  <CustomVideoPlayer ref={playerRef} videoId={videoId} provider={provider} />
                  
                  {/* Branding Watermark & Click Shield */}
                  {/* Removing pointer-events-none turns this into a shield that blocks YouTube interaction */}
                  <div className="absolute inset-0 z-40 overflow-hidden opacity-10 select-none cursor-default">
                    <div className="absolute top-10 left-10 -rotate-12 text-white text-[10px] font-bold">Freedom Magnet Hub</div>
                    <div className="absolute top-10 right-10 -rotate-12 text-white text-[10px] font-bold">Freedom Magnet Hub</div>
                    <div className="absolute bottom-10 left-10 -rotate-12 text-white text-[10px] font-bold">Freedom Magnet Hub</div>
                    <div className="absolute bottom-10 right-10 -rotate-12 text-white text-[10px] font-bold">Freedom Magnet Hub</div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-white text-sm font-black whitespace-nowrap">Freedom Magnet Hub</div>
                  </div>
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
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{lesson?.title || 'Training Session'}</h1>
                  {course && <p className="text-sm font-bold text-primary uppercase tracking-widest">{course.title}</p>}
                </div>
                <div className="flex items-center gap-3">
                   {isAdmin && (
                     <Button variant="outline" onClick={handleShareCourse} className="rounded-full flex gap-2 font-bold h-11 px-6 border-slate-200 dark:border-slate-800">
                       <Share2 size={16} /> Share Hub
                     </Button>
                   )}
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
            
            <Card className="rounded-[2.5rem] p-6 shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 tracking-tight">
                <PlayCircle className="text-primary"/> Course Content
              </h2>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {allLessons.length > 0 ? allLessons.map((l) => {
                    const isActive = l.dayNumber === day;
                    return (
                      <Link href={`/lesson/${l.dayNumber}?courseId=${courseId}`} key={l.id}>
                        <div className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl transition-all border",
                          isActive 
                            ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-sm" 
                            : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 font-medium"
                        )}>
                          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-xs font-black", isActive ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-700")}>
                            {l.dayNumber}
                          </div>
                          <p className="flex-1 text-sm line-clamp-1">{l.title}</p>
                        </div>
                      </Link>
                    )
                  }) : (
                    <p className="text-sm text-slate-400 italic">No other sessions found.</p>
                  )}
                </div>
              </ScrollArea>
            </Card>

            <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  <StickyNote className="text-primary"/> Study Notes
                </h2>
                <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2">
                  <History size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">Timeline</span>
                </div>
              </div>

              {/* Timeline Container */}
              <ScrollArea className="flex-1 mb-6 pr-4">
                <div className="space-y-6 relative ml-4 pl-6 border-l-2 border-slate-100 dark:border-slate-800">
                  {notes && notes.length > 0 ? notes.map(note => (
                    <div key={note.id} className="relative group animate-in fade-in slide-in-from-left-2 duration-300">
                       {/* Timeline Dot */}
                       <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary shadow-sm" />
                       
                       <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all hover:shadow-md relative overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <button 
                              onClick={() => handleSeek(note.timestamp)}
                              className="flex items-center gap-2 group/btn"
                            >
                               <div className="bg-primary text-white px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-transform active:scale-90 group-hover/btn:bg-primary/90">
                                 <PlayCircle size={12} />
                                 {formatTimestamp(note.timestamp)}
                               </div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                 {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'New'}
                               </span>
                            </button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 shadow-sm" 
                              onClick={() => deleteDoc(doc(firestore, 'user_notes', note.id))}
                            >
                               <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                            </Button>
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{note.text}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl opacity-40">
                      <StickyNote className="mx-auto mb-3 text-slate-300" size={32} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline is empty</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Editor Container */}
              <div className="pt-6 border-t dark:border-slate-800 space-y-4">
                <Textarea 
                  placeholder="Capture insights... (Video will pause)" 
                  value={noteText} 
                  onChange={(e) => setNoteText(e.target.value)}
                  onFocus={handleNoteFocus}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-none min-h-[100px] focus-visible:ring-primary/20 p-4 font-medium"
                />
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="resume" 
                      checked={resumeAfterSave} 
                      onCheckedChange={(checked) => setResumeAfterSave(checked === true)}
                      className="rounded-md"
                    />
                    <Label htmlFor="resume" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none tracking-tight">
                      Auto-resume after saving
                    </Label>
                  </div>
                  <Button 
                    onClick={handleSaveNote} 
                    disabled={savingNote || !noteText.trim()} 
                    className="flex-1 rounded-full h-11 font-black shadow-lg shadow-primary/20"
                  >
                    {savingNote ? "Syncing..." : "Publish Note"}
                  </Button>
                </div>
              </div>
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
