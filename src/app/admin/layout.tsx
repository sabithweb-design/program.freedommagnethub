'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Compass, 
  BookOpen, 
  MessageCircle,
  Bell, 
  Grid,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PlayerIcon } from './page';

const ADMIN_EMAIL = "admin@freedommagnethub.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthorized = user?.email === ADMIN_EMAIL || profile?.role === 'admin';

  React.useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/login');
    }
  }, [loading, isAuthorized, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Top Navbar */}
      <header className="bg-background/95 backdrop-blur-md border-b sticky top-0 z-50 transition-colors">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-10 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-1 group shrink-0">
            <span className="font-bold text-xl sm:text-2xl tracking-tight text-slate-800 dark:text-slate-100">
              freedom<span className="text-primary">magnethub</span>
            </span>
          </Link>

          {/* Centered Menu */}
          <nav className="hidden lg:flex items-center gap-10 h-full">
            <NavItem icon={<LayoutDashboard size={20} />} label="DASHBOARD" href="/admin" active={pathname === '/admin'} />
            <NavItem icon={<Compass size={20} />} label="FEED" href="#" />
            <NavItem icon={<PlayerIcon className="h-5 w-5" />} label="WORKSHOPS" href="#" />
            <NavItem icon={<BookOpen size={20} />} label="PROGRAMS" href="/admin/courses" active={pathname === '/admin/courses'} />
            <NavItem icon={<MessageCircle size={20} />} label="MESSAGES" href="#" />
          </nav>

          {/* Right Icons & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-6">
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="flex rounded-full border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold gap-1 sm:gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95 px-3 sm:px-4 h-9 sm:h-10"
            >
              <Link href="/dashboard">
                <ExternalLink size={14} />
                <span className="text-[10px] sm:text-xs">View Hub</span>
              </Link>
            </Button>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="text-slate-400 dark:text-slate-500 rounded-full h-9 w-9 sm:h-10 sm:w-10">
                <Grid size={18} className="sm:size-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 dark:text-slate-500 relative rounded-full h-9 w-9 sm:h-10 sm:w-10">
                <Bell size={18} className="sm:size-5" />
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] sm:text-[10px] text-white flex items-center justify-center border-2 border-white dark:border-slate-900">3</span>
              </Button>
            </div>
            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-1 hidden sm:block" />
            <BrandLogo className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-80px)]">
        {children}
      </main>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 cursor-pointer group relative pt-4 h-full`}>
      <div className={`flex flex-col items-center gap-1.5 transition-colors ${active ? "text-primary" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
        {icon}
        <span className="text-[11px] font-bold tracking-wider">{label}</span>
      </div>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
      )}
    </Link>
  );
}
