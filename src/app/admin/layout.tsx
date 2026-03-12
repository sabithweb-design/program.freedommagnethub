'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Compass, 
  Video, 
  BookOpen, 
  MessageCircle,
  Bell, 
  Grid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

/**
 * ADMIN CONFIGURATION
 * Primary Top-Navigation Layout based on TagMango design.
 */
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-1 group">
            <span className="font-bold text-2xl tracking-tight text-slate-800">
              freedom<span className="text-primary">magnet</span>
            </span>
          </Link>

          {/* Centered Menu */}
          <nav className="hidden lg:flex items-center gap-10 h-full">
            <NavItem icon={<LayoutDashboard size={20} />} label="DASHBOARD" href="/admin" active={pathname === '/admin'} />
            <NavItem icon={<Compass size={20} />} label="FEED" href="#" />
            <NavItem icon={<Video size={20} />} label="WORKSHOPS" href="#" />
            <NavItem icon={<BookOpen size={20} />} label="COURSES" href="/admin/courses" active={pathname === '/admin/courses'} />
            <NavItem icon={<MessageCircle size={20} />} label="MESSAGES" href="#" />
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <Grid size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white">3</span>
            </Button>
            <Avatar className="h-9 w-9 border cursor-pointer">
              <AvatarImage src="https://picsum.photos/seed/admin-avatar/100" />
              <AvatarFallback>FM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-white min-h-[calc(100vh-80px)]">
        {children}
      </main>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 cursor-pointer group relative pt-4 h-full`}>
      <div className={`flex flex-col items-center gap-1.5 transition-colors ${active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"}`}>
        {icon}
        <span className="text-[11px] font-bold tracking-wider">{label}</span>
      </div>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
      )}
    </Link>
  );
}
