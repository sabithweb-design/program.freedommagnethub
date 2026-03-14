"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
  Maximize,
  Settings,
  Volume2,
  VolumeX
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlayerIcon } from "@/app/admin/page";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";

// Dynamic import for ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

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

/**
 * Professional LMS Video Player
 * Precision-Crop logic for 115% scale to hide YouTube branding.
 * Laptop/Desktop: 1280x720 footprint centered.
 * Mobile: Auto-hide controls with touch reveal and scaled UI.
 */
function LmsVideoPlayer({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    if (!isReady) return;
    setPlaying(prev => !prev);
    if (isMobile) setShowControls(true);
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Mobile Auto-Hide Logic: Hide controls after 2 seconds of inactivity when playing
  useEffect(() => {
    if (isMobile && playing && showControls) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isMobile, playing, showControls]);

  const handleInteraction = () => {
    if (isMobile) {
      if (!showControls) {
        setShowControls(true);
      } else {
        togglePlay();
      }
    } else {
      togglePlay();
    }
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    return `${mm}:${ss}`;
  };

  const handleSeekChange = (value: number[]) => {
    const newPlayed = value[0] / 100;
    setPlayed(newPlayed);
    playerRef.current?.seekTo(newPlayed);
    if (isMobile) setShowControls(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full flex justify-center items-center px-4 sm:px-0 mb-12"
      onMouseEnter={() => !isMobile && setShowControls(true)}
      onMouseLeave={() => !isMobile && playing && setShowControls(false)}
    >
      <div className={cn(
        "relative overflow-hidden bg-black shadow-2xl transition-all duration-500",
        "rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[3rem]",
        "w-full aspect-video",
        "lg:w-[1280px] lg:h-[720px] lg:aspect-auto lg:mx-auto" 
      )}>
        
        {/* Core Video Engine with Precision Crop (115% scale to hide branding) */}
        <div className="absolute inset-0 pointer-events-none scale-[1.15]">
          <ReactPlayer
            ref={playerRef}
            url={`https://www.youtube.com/watch?v=${videoId}`}
            width="100%"
            height="100%"
            playing={playing}
            muted={isMuted}
            volume={volume}
            playbackRate={playbackRate}
            onReady={() => setIsReady(true)}
            onProgress={(state) => setPlayed(state.played)}
            onDuration={(d) => setDuration(d)}
            config={{
              youtube: {
                playerVars: { 
                  modestbranding: 1, 
                  rel: 0, 
                  showinfo: 0, 
                  iv_load_policy: 3,
                  controls: 0,
                  disablekb: 1
                }
              }
            }}
          />
        </div>

        {/* Branding Shields - pointer-events-none so clicks pass through */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

        {/* Interaction Layer - Captures Background Clicks */}
        <div 
          className="absolute inset-0 z-20 cursor-pointer pointer-events-auto" 
          onClick={handleInteraction}
        />

        {/* Central Cinematic Play Button (Highest Priority z-index: 999) */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center z-[999] transition-opacity duration-300 pointer-events-none",
          (!playing || showControls) ? "opacity-100" : "opacity-0"
        )}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={cn(
              "bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto",
              "w-16 h-16 lg:w-28 lg:h-28" // 20% smaller on mobile
            )}
          >
            {playing ? (
              <Pause className="text-slate-900 fill-slate-900 w-6 h-6 lg:w-10 lg:h-10" />
            ) : (
              <Play className="text-slate-900 fill-slate-900 ml-1 w-6 h-6 lg:w-10 lg:h-10" />
            )}
          </button>
        </div>

        {/* Professional Control Bar (z-index: 100) */}
        <div className={cn(
          "absolute inset-x-0 bottom-0 z-[100] transition-all duration-300 px-6 sm:px-8 pb-6 sm:pb-8 pt-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent",
          showControls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}>
          {/* Lavender Progress Bar */}
          <div className="mb-4 lg:mb-6 group px-2 sm:px-0">
            <Slider
              value={[played * 100]}
              max={100}
              step={0.1}
              onValueChange={handleSeekChange}
              className="cursor-pointer pointer-events-auto"
              trackClassName="h-1 bg-white/20"
              rangeClassName="bg-[#8B5CF6]" 
              thumbClassName="w-3 h-3 bg-[#8B5CF6] border-none opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4 pointer-events-auto px-1 sm:px-0">
            <div className="flex items-center gap-3 lg:gap-6">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:text-[#8B5CF6] transition-colors"
              >
                {playing ? <Pause size={isMobile ? 18 : 24} /> : <Play size={isMobile ? 18 : 24} className="ml-0.5" />}
              </button>
              
              <div className="text-[10px] lg:text-sm font-bold text-white/90 tabular-nums tracking-tight">
                {formatTime(played * duration)} <span className="text-white/40 mx-1">/</span> {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-6">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Settings size={14} className="text-white/40 hidden sm:block" />
                <select 
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="bg-transparent text-white text-[10px] lg:text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:text-[#8B5CF6] transition-colors"
                >
                  <option value="0.5" className="text-slate-900">0.5x</option>
                  <option value="1" className="text-slate-900">1.0x</option>
                  <option value="1.25" className="text-slate-900">1.25x</option>
                  <option value="1.5" className="text-slate-900">1.5x</option>
                  <option value="2" className="text-slate-900">2.0x</option>
                </select>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:text-[#8B5CF6] transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={isMobile ? 18 : 20} /> : <Volume2 size={isMobile ? 18 : 20} />}
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="text-white hover:text-[#8B5CF6] transition-colors"
              >
                <Maximize size={isMobile ? 18 : 20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

  const videoId = lesson?.youtubeVideoId || "P5_rBMem0cE";

  return (
    <div className={`min-h-screen bg-background text-foreground pb-20 font-body transition-colors ${!isAdmin ? 'content-protected' : ''}`}>
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
          
          {/* Professional 1280x720 Desktop Player / Responsive Mobile */}
          <LmsVideoPlayer videoId={videoId} />

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
                  <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] bg-primary/5 dark:bg-primary/10 p-6 sm:p-12 border-l-8 border-primary relative overflow-hidden">
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
