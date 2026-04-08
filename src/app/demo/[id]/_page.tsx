
'use client';
import { Card } from "@/components/ui/card";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Tv, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PublicDemoPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);

  useEffect(() => {
    async function fetchDemo() {
      if (!id || !firestore) return;
      try {
        const docRef = doc(firestore, 'demo_pages', id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.isLocked) {
            setDemo('locked');
          } else {
            setDemo({ id: snap.id, ...data });
          }
        }
      } catch (err) {
        console.error("Error fetching demo:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDemo();
  }, [id, firestore]);

  useEffect(() => {
    if (!demo || demo === 'locked' || !demo.youtubeVideoId || typeof window === 'undefined') return;

    const init = async () => {
      const Plyr = (await import('plyr')).default;
      if (containerRef.current) {
        playerRef.current = new Plyr(containerRef.current, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'settings', 'fullscreen'],
          settings: ['quality', 'speed'],
          quality: { default: 1080, options: [1080, 720, 480], forced: true },
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
      }
    };
    init();

    return () => {
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [demo]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  if (!demo || demo === 'locked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950 rounded-full flex items-center justify-center mx-auto text-rose-500"><AlertCircle size={32} /></div>
          <h1 className="text-2xl font-black">Demo Not Accessible</h1>
          <p className="text-slate-500 max-w-sm">This session is currently locked or does not exist.</p>
          <Button asChild className="rounded-full px-8"><Link href="/">Back to Hub</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary selection:text-white">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full text-slate-500"><Link href="/"><ChevronLeft className="mr-1 h-4 w-4" /> Hub</Link></Button>
          <div className="font-black text-xl tracking-tighter uppercase">freedom<span className="text-primary">magnethub</span></div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-32 pb-20 px-6 space-y-10">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]"><Tv size={14} /> Official Demo Session</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{demo.title}</h1>
        </div>

        <div className="relative group aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-4 border-white dark:border-slate-800">
          <div ref={containerRef} data-plyr-provider="youtube" data-plyr-embed-id={demo.youtubeVideoId} />
          {/* Interaction Shield covering top 70% */}
          <div className="absolute inset-x-0 top-0 bottom-[30%] z-40 overflow-hidden select-none cursor-pointer flex items-center justify-center" onClick={() => playerRef.current?.togglePlay()}>
            <div className="absolute top-10 left-10 -rotate-12 text-white opacity-10 text-[10px] font-black">Freedom Magnet Hub</div>
            <div className="absolute bottom-10 right-10 -rotate-12 text-white opacity-10 text-[10px] font-black">Freedom Magnet Hub</div>
          </div>
        </div>

        {demo.description && (
          <Card className="rounded-[2.5rem] p-8 border-none bg-white dark:bg-slate-900 shadow-xl">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2 tracking-tight"><AlertCircle size={20} className="text-primary"/> Session Overview</h3>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium">{demo.description}</p>
          </Card>
        )}
      </main>
    </div>
  );
}
