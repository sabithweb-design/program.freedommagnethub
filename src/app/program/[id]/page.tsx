
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestore, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  PlayCircle, 
  Star, 
  Users, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Loader2 } from 'lucide-react';

// Isolated Video Player for Landing Page
function PublicVideoPlayer({ videoId }: { videoId: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);

  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return;

    const init = async () => {
      const Plyr = (await import('plyr')).default;
      if (containerRef.current) {
        playerRef.current = new Plyr(containerRef.current, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
      }
    };
    init();

    return () => {
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [videoId]);

  return (
    <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-white dark:border-slate-800">
      <div ref={containerRef} data-plyr-provider="youtube" data-plyr-embed-id={videoId} />
    </div>
  );
}

export default function PublicLandingPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourse() {
      if (!id || !firestore) return;
      try {
        const docRef = doc(firestore, 'courses', id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCourse({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching landing page data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id, firestore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-black">Program Not Found</h1>
          <p className="text-slate-500 mt-2">The link might be expired or incorrect.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link href="/courses">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const landing = {
    heading: course.landingHeading || course.title,
    subtitle: course.landingSubtitle || course.description,
    demoVideoId: course.demoVideoId || course.youtubeVideoId,
    galleryImages: course.galleryImages || [],
    feedbackVideos: course.feedbackVideoIds || [],
    testimonials: course.testimonialImageUrls || [],
    joinLink: course.joinLink || '#',
    offerEndTime: course.offerEndTime?.toDate?.() || null
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary selection:text-white">
      {/* Sticky Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-black text-xl tracking-tighter uppercase">
            freedom<span className="text-primary">magnethub</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#overview" className="text-sm font-bold hover:text-primary transition-colors">Overview</a>
            <a href="#curriculum" className="text-sm font-bold hover:text-primary transition-colors">Curriculum</a>
            <a href="#reviews" className="text-sm font-bold hover:text-primary transition-colors">Reviews</a>
          </div>
          <Button asChild className="rounded-full px-8 h-12 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <a href={landing.joinLink}>Enroll Now</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]">
              Limited Enrollment Open
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              {landing.heading}
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
              {landing.subtitle}
            </p>
            
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Users className="text-primary" size={20} />
                <span className="font-bold text-sm">Join 500+ Teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500" size={20} />
                <span className="font-bold text-sm">4.9/5 Student Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                <span className="font-bold text-sm">Lifetime Access</span>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <Button asChild className="w-full sm:w-auto rounded-2xl h-16 px-12 text-lg font-black shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all">
                <a href={landing.joinLink} className="flex gap-3">Enroll Today <ArrowRight /></a>
              </Button>
              {landing.offerEndTime && (
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <span className="text-sm font-black text-rose-500 uppercase tracking-widest">Special Offer Ends In:</span>
                  <CountdownTimer targetDate={landing.offerEndTime} />
                </div>
              )}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-3xl group-hover:bg-primary/30 transition-all"></div>
            <PublicVideoPlayer videoId={landing.demoVideoId} />
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      {landing.galleryImages.length > 0 && (
        <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3">
                <ImageIcon className="text-primary" /> Inside the Hub
              </h2>
              <p className="text-slate-500 font-bold max-w-2xl mx-auto italic">Explore the high-quality content and resources waiting for you inside the student portal.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {landing.galleryImages.map((img: string, idx: number) => (
                <div key={idx} className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-xl hover:scale-105 transition-transform duration-500 group">
                  <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video Feedback */}
      <section id="reviews" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3">
              <Video className="text-primary" /> Student Success Stories
            </h2>
            <p className="text-slate-500 font-bold">Hear directly from the teachers who transformed their careers with us.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {landing.feedbackVideos.slice(0, 4).map((vidId: string, idx: number) => (
              <div key={idx} className="space-y-4">
                <PublicVideoPlayer videoId={vidId} />
                <div className="flex items-center gap-2 px-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Verified Success Story</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Testimonials */}
      {landing.testimonials.length > 0 && (
        <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3">
                <MessageSquare className="text-primary" /> Testimonials
              </h2>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
              {landing.testimonials.map((img: string, idx: number) => (
                <div key={idx} className="break-inside-avoid rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border dark:border-slate-800">
                  <Image src={img} alt={`Testimonial ${idx}`} width={400} height={600} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-32 px-6">
        <Card className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-none shadow-2xl relative">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <ShieldCheck size={200} />
          </div>
          <CardContent className="p-16 text-center space-y-8 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Ready to Master Your Magnetic Freedom?</h2>
            <p className="text-xl font-medium opacity-80 max-w-xl mx-auto">
              Join the elite circle of modern educators. Get instant access to the full 90-day training suite.
            </p>
            <div className="space-y-6">
              <Button asChild size="lg" className="rounded-2xl h-16 px-16 text-xl font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20">
                <a href={landing.joinLink}>Start Your Journey Today</a>
              </Button>
              {landing.offerEndTime && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Limited Time Enrollment</p>
                  <CountdownTimer targetDate={landing.offerEndTime} className="bg-white/10 dark:bg-black/10 px-6 py-2 rounded-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="font-black text-2xl tracking-tighter uppercase">
              freedom<span className="text-primary">magnethub</span>
            </div>
            <p className="text-slate-400 font-medium max-w-sm">Empowering educators to build scalable, sustainable, and magnetic training businesses through modern digital transformation.</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Resources</h4>
            <nav className="flex flex-col gap-2">
              <a href="#" className="text-slate-400 font-bold hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-400 font-bold hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="text-slate-400 font-bold hover:text-primary transition-colors">Refund Policy</a>
            </nav>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Support</h4>
            <nav className="flex flex-col gap-2">
              <a href="mailto:support@freedommagnethub.com" className="text-slate-400 font-bold hover:text-primary transition-colors">support@freedommagnethub.com</a>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                   <Users size={18} />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
