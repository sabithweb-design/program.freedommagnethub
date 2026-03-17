
"use client";

import { useEffect, useState, Suspense, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp, 
  addDoc, 
  orderBy, 
  setDoc, 
  Query
} from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  StickyNote,
  Trash2,
  Activity,
  Share2
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Import Standard Plyr for better control
import Plyr from "plyr";
import "plyr/dist/plyr.css";

interface LessonData {
  id?: string;
  courseId?: string;
  title?: string;
  description?: string;
  actionPlan?: string;
  youtubeVideoId?: string;
  vimeoVideoId?: string;
  pdfUrl?: string;
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
  const [course, setCourse] = useState<CourseData | null>(null);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // STABLE PLAYER REFERENCE
  const playerRef = useRef<any>(null);

  // Determine Video Source ID for Plyr Key stability
  const currentVideoId = useMemo(() => {
    return lesson?.vimeoVideoId || lesson?.youtubeVideoId || `lesson-${day}`;
  }, [lesson, day]);

  // Player initialization effect
  useEffect(() => {
    if (typeof window === "undefined" || !lesson) return;

    const videoElement = document.querySelector("#player");
    if (videoElement) {
      playerRef.current = new Plyr("#player", {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
        hideControls: false,
        youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
        vimeo: { byline: false, portrait: false, title: false, transparent: false }
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentVideoId]); // Re-init strictly when the video source changes

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

        const q = query(collection(firestore, "lessons"), where("dayNumber", "==", day), where("courseId", "==", courseId)) as Query<LessonData>;
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const lId = querySnapshot.docs[0].id;
          setLessonId(lId);
          setLesson({ ...querySnapshot.docs[0].data(), id: lId });
          if (user) {
            const docSnap = await getDoc(doc(firestore, 'users', user.uid, 'completedLessons', lId));
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
    return query(collection(firestore, "user_notes"), where("userId", "==", user.uid), where("lessonId", "==", lessonId), orderBy("createdAt", "desc")) as Query<UserNote>;
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
    const time = playerRef.current?.currentTime || 0;
    try {
      await addDoc(collection(firestore, "user_notes"), {
        userId: user.uid, lessonId, courseId: courseId || '',
        text: noteText, timestamp: time, createdAt: serverTimestamp()
      });
      setNoteText("");
      playerRef.current?.play();
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

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    return `${date.getUTCMinutes()}:${date.getUTCSeconds().toString().padStart(2, '0')}`;
  };

  if (loading || fetching) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-primary" />
      <p className="font-bold text-slate-400">Syncing Session...</p>
    </div>
  );

  return (
    <div className={cn("min-h-screen bg-background text-foreground pb-20 transition-colors", !isAdmin && "content-protected")}>
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href="/dashboard"><ChevronLeft className="mr-1 h-4 w-4" /> Hub</Link>
          </Button>
          <div className="font-bold flex items-center gap-1.5"><GraduationCap className="h-5 w-5 text-primary" /> Session {day}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShareCourse} className="rounded-full h-9 w-9 text-slate-400">
              <Share2 size={18} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto py-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div key={currentVideoId} className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl bg-black">
              {lesson ? (
                <div className="w-full h-full">
                  <video id="player" playsInline className="plyr__video-embed">
                    <source 
                      src={lesson.vimeoVideoId ? `https://vimeo.com/${lesson.vimeoVideoId}` : `https://youtube.com/watch?v=${lesson.youtubeVideoId}`} 
                      type={lesson.vimeoVideoId ? "video/vimeo" : "video/youtube"} 
                    />
                  </video>
                  {user && (
                    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-20 select-none">
                      <div className="absolute top-10 left-10 -rotate-12 text-white text-[10px] font-bold">{user.email}</div>
                      <div className="absolute bottom-10 right-10 -rotate-12 text-white text-[10px] font-bold">{user.email}</div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 text-white text-[8px] font-black opacity-10 uppercase tracking-widest">Property of Graphixhub</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-500">
                  <Activity className="w-12 h-12 mb-4 animate-pulse" />
                  <p>Session Content Finalizing...</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl font-black">{lesson?.title || `Session ${day}`}</h1>
                  {course && <p className="text-sm font-bold text-primary uppercase tracking-widest">{course.title}</p>}
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="outline" onClick={handleShareCourse} className="rounded-full flex gap-2 font-bold h-11 px-6">
                     <Share2 size={16} /> Share Hub
                   </Button>
                   <Button onClick={handleToggleComplete} disabled={completing} className={cn("rounded-full px-8 h-11 font-black", isCompleted ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary")}>
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-black mb-4 flex items-center gap-2"><AlertCircle size={20}/> Overview</h3>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{lesson?.description || "No overview provided for this session yet."}</p>
                </div>
                {lesson?.actionPlan && (
                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 h-fit">
                    <h3 className="text-xl font-black mb-2 text-primary flex items-center gap-2"><CheckCircle2 size={18} /> Action Plan</h3>
                    <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{lesson.actionPlan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] p-6 shadow-xl sticky top-24 border-none bg-white dark:bg-slate-900">
              <h2 className="text-2xl font-black mb-4 flex items-center gap-2"><StickyNote className="text-primary"/> Study Notes</h2>
              <Textarea 
                placeholder="Type your notes here. They will be timestamped to the current video time..." 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)}
                className="rounded-2xl mb-4 bg-slate-50 dark:bg-slate-800 border-none min-h-[120px] focus-visible:ring-primary/20"
              />
              <Button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} className="w-full rounded-full h-12 font-bold shadow-lg shadow-primary/20">
                {savingNote ? "Saving..." : "Save Timestamped Note"}
              </Button>
              
              <ScrollArea className="h-[400px] mt-6 pr-4">
                <div className="space-y-4">
                  {notes && notes.length > 0 ? notes.map(note => (
                    <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tabular-nums">At {formatTime(note.timestamp)}</span>
                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteDoc(doc(firestore, 'user_notes', note.id))}>
                            <Trash2 size={12} className="text-slate-400 hover:text-red-500" />
                         </Button>
                       </div>
                       <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{note.text}</p>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No notes for this session</p>
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
