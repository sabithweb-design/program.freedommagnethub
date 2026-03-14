
"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  GraduationCap, 
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  CalendarClock
} from "lucide-react";
import Link from "next/link";
import ReactPlayer from "react-player/youtube";
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

const CustomBigButton = () => (
  <div className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 transition-all shadow-2xl group/btn cursor-pointer">
    <Play className="text-white fill-white w-8 h-8 ml-1 transition-transform group-hover/btn:scale-110" />
  </div>
);

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

  // Player State
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const playerRef = useRef<ReactPlayer>(null);

  // Content Protection
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

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const videoId = lesson?.youtubeVideoId;

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
        <div className="bg-rose-50 dark:bg-rose-950 w-24 h-24 rounded-full flex items-center justify-center mb-8">
          <AlertCircle size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-4">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          You are not enrolled in the program containing this session.
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
      {/* Navigation Header */}
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
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
          
          {/* Bulletproof Video Player */}
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-950 group">
              {videoId ? (
                <>
                  <ReactPlayer
                    ref={playerRef}
                    url={`https://www.youtube.com/watch?v=${videoId}`}
                    width="100%"
                    height="100%"
                    light={lesson?.thumbnailUrl || true}
                    playIcon={<CustomBigButton />}
                    playing={playing}
                    controls={false}
                    volume={volume}
                    muted={isMuted}
                    playbackRate={playbackRate}
                    onStart={() => setIsLoaded(true)}
                    onProgress={(state) => setPlayed(state.played)}
                    onDuration={(d) => setDuration(d)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    config={{
                      youtube: {
                        playerVars: { 
                          modestbranding: 1, 
                          rel: 0, 
                          iv_load_policy: 3, 
                          controls: 0,
                          disablekb: 1
                        }
                      }
                    }}
                  />

                  {/* Custom Controls Bar (Visible only when video is active) */}
                  {isLoaded && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100 flex flex-col gap-3 z-20">
                      {/* Progress Scrubber */}
                      <Slider
                        value={[played * 100]}
                        max={100}
                        step={0.1}
                        onValueChange={(val) => {
                          const newPlayed = val[0] / 100;
                          setPlayed(newPlayed);
                          playerRef.current?.seekTo(newPlayed);
                        }}
                        className="cursor-pointer"
                        trackClassName="h-1 bg-white/20"
                        rangeClassName="bg-[#8B5CF6]"
                        thumbClassName="w-3 h-3 bg-[#8B5CF6] border-none"
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button onClick={() => setPlaying(!playing)} className="text-white hover:text-[#8B5CF6] transition-colors">
                            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                          </button>
                          
                          <div className="flex items-center gap-3">
                            <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-[#8B5CF6] transition-colors">
                              {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                            <Slider 
                              value={[isMuted ? 0 : volume * 100]} 
                              max={100} 
                              onValueChange={(val) => setVolume(val[0] / 100)}
                              className="w-20 hidden sm:block"
                              trackClassName="h-1 bg-white/20"
                              rangeClassName="bg-white"
                              thumbClassName="w-2.5 h-2.5 bg-white border-none"
                            />
                          </div>

                          <div className="text-[10px] sm:text-xs font-bold text-white/90 font-mono">
                            {formatTime(played * duration)} / {formatTime(duration)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="relative group/speed">
                            <button className="text-[10px] font-black text-white bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 uppercase tracking-widest flex items-center gap-2">
                              {playbackRate}x <Settings className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-4 bg-black/95 rounded-xl p-1 opacity-0 group-hover/speed:opacity-100 transition-all border border-white/10 min-w-[70px]">
                              {[2, 1.5, 1.25, 1, 0.75].map((rate) => (
                                <button 
                                  key={rate}
                                  onClick={() => setPlaybackRate(rate)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg",
                                    playbackRate === rate ? "bg-[#8B5CF6] text-white" : "text-white/60 hover:text-white"
                                  )}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => document.getElementById('lms-player-container')?.requestFullscreen()} className="text-white hover:text-[#8B5CF6] transition-colors">
                            <Maximize className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <CalendarClock className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white">Session Coming Soon</h3>
                    <p className="text-slate-400 font-medium max-w-xs mx-auto">
                      Day {day} content hasn't been published for this program yet. Check back soon!
                    </p>
                  </div>
                  <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full px-8">
                    <Link href="/dashboard">Return to Hub</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-12">
              <div className="flex-1 space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b dark:border-slate-800 pb-8">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none">
                      {lesson?.title || `Session ${day}`}
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
                    {lessonId && (
                      <Button 
                        onClick={handleToggleComplete}
                        disabled={completing}
                        className={cn(
                          "rounded-full h-14 px-10 font-black transition-all shadow-xl text-xs uppercase tracking-widest border-2",
                          isCompleted 
                            ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600 text-white" 
                            : "bg-slate-900 dark:bg-slate-100 border-transparent dark:text-slate-900"
                        )}
                      >
                        {isCompleted ? (
                          <><CheckCircle2 className="mr-3 h-5 w-5" /> Completed</>
                        ) : (
                          "Mark Session Complete"
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {lesson?.description ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg sm:text-xl whitespace-pre-wrap font-medium">
                      {lesson.description}
                    </p>
                  </div>
                ) : !fetching && (
                   <p className="text-slate-400 italic">No session breakdown available for this day.</p>
                )}

                {lesson?.actionPlan && (
                  <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2rem] bg-primary/5 dark:bg-primary/10 p-6 sm:p-12 border-l-8 border-primary relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ClipboardList className="text-primary size-12 sm:size-20" />
                    </div>
                    <h3 className="font-black text-primary text-xl sm:text-2xl mb-6 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
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
                            <PlayerIcon className="mr-3 h-5 w-5" /> Resource Drive
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

const PlayerIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    fill="currentColor"
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
  </svg>
);

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
