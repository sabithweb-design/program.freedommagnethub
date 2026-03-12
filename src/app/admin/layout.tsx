'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  BookOpen, 
  Video, 
  LayoutDashboard, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

/**
 * ADMIN CONFIGURATION
 * Set your master admin email here. 
 * Ensure you create this user in the Firebase Console.
 */
const ADMIN_EMAIL = "admin@edutrail.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Primary security guard: Check by hardcoded email or Firestore role
  const isAuthorized = user?.email === ADMIN_EMAIL || profile?.role === 'admin';

  React.useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/login');
    }
  }, [loading, isAuthorized, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Admin Hub</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <AdminNavLink icon={<LayoutDashboard size={18} />} label="Dashboard" href="/admin" active />
          <AdminNavLink icon={<Users size={18} />} label="Users" href="/admin?tab=users" />
          <AdminNavLink icon={<BookOpen size={18} />} label="Courses" href="/admin?tab=courses" />
          <AdminNavLink icon={<Video size={18} />} label="Lessons" href="/admin?tab=lessons" />
        </nav>

        <div className="p-4 border-t space-y-2">
          <div className="px-4 py-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged in as</p>
            <p className="text-xs font-semibold text-slate-600 truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-500 hover:text-destructive hover:bg-destructive/5"
            onClick={() => signOut(auth)}
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function AdminNavLink({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <a 
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        active 
          ? "bg-primary text-white" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}