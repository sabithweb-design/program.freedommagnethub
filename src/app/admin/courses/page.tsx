
'use client';

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2,
  Share2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore } from '@/firebase';
import { query, collection, doc, updateDoc, deleteDoc, where, Query } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '@/context/auth-context';

const MAIN_ADMIN_EMAIL = "admin@freedommagnethub.com";

export default function ProgramManagementPage() {
  const firestore = useFirestore();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'by-me' | 'all'>('by-me');
  const [searchQuery, setSearchQuery] = useState('');
  
  const isMainAdmin = user?.email === MAIN_ADMIN_EMAIL;

  // Edit State
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const programsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (isMainAdmin && activeTab === 'all') {
      return query(collection(firestore, 'courses')) as Query<any>;
    }
    return query(collection(firestore, 'courses'), where('adminIds', 'array-contains', user.uid)) as Query<any>;
  }, [firestore, user, isMainAdmin, activeTab]);
  
  const { data: programs, loading } = useCollection<any>(programsQuery);

  const handleOpenEdit = (program: any) => {
    setEditingProgram(program);
    setEditTitle(program.title || '');
  };

  const handleRename = () => {
    if (!firestore || !editingProgram) return;

    const programRef = doc(firestore, 'courses', editingProgram.id);
    updateDoc(programRef, { title: editTitle })
      .then(() => {
        toast({ title: "Program Renamed", description: "The program title has been updated successfully." });
        setEditingProgram(null);
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'update', 
          requestResourceData: { title: editTitle } 
        });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleDelete = (programId: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to permanently delete this program?")) return;

    const programRef = doc(firestore, 'courses', programId);
    deleteDoc(programRef)
      .then(() => {
        toast({ title: "Program Deleted", description: "The program has been removed from the platform." });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'delete' 
        }));
      });
  };

  const handleShare = (programId: string) => {
    const url = `${window.location.origin}/lesson/1?courseId=${programId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Program link copied to clipboard. Share this with your clients.",
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Programs</h1>
        <div className="flex items-center gap-6">
          <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-xl px-7 h-11 flex gap-2 font-bold shadow-md transition-all active:scale-95">
            <Link href="/admin"><Plus size={20} /> Create Program</Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <TabButton 
          active={activeTab === 'by-me'} 
          onClick={() => setActiveTab('by-me')}
          label="My Managed Programs" 
        />
        {isMainAdmin && (
          <TabButton 
            active={activeTab === 'all'} 
            onClick={() => setActiveTab('all')}
            label="All Platform Programs" 
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <Input 
            placeholder="Search by program title or description" 
            className="pl-14 h-14 rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 placeholder:text-slate-400 text-slate-700 dark:text-slate-200 shadow-sm focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl h-[420px] animate-pulse border dark:border-slate-800 shadow-sm" />
          ))
        ) : programs && programs.length > 0 ? (
          programs
            .filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((program: any) => (
            <ProgramCard 
              key={program.id} 
              program={program} 
              onEdit={() => handleOpenEdit(program)}
              onShare={() => handleShare(program.id)}
              onDelete={() => handleDelete(program.id)}
              isMainAdmin={isMainAdmin}
            />
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed">
            <AlertCircle size={48} className="text-slate-300" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No Programs Found</h3>
              <p className="text-sm text-slate-400 font-medium">Create your first training program to get started.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Program</DialogTitle>
            <DialogDescription>Enter a new title for this training program.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Program Title</Label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingProgram(null)} className="rounded-xl h-12 font-bold">Cancel</Button>
            <Button onClick={handleRename} className="rounded-xl h-12 font-bold bg-primary text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-10 py-3 rounded-full text-sm font-bold transition-all ${
        active 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
          : "bg-slate-50 dark:bg-slate-900 text-slate-500 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function ProgramCard({ program, onEdit, onShare, onDelete, isMainAdmin }: { program: any, onEdit: () => void, onShare: () => void, onDelete: () => void, isMainAdmin: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full hover:-translate-y-1">
      <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800">
        <Image 
          src={program.imageUrl || 'https://picsum.photos/seed/course/600/400'} 
          alt={program.title || "Program image"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-7 space-y-4 flex flex-col flex-1">
        <div className="space-y-3 flex-1">
          <div className="inline-flex">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg px-3 py-1 text-[10px] font-black tracking-widest mb-1 shadow-sm uppercase">
              Published
            </Badge>
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 capitalize leading-tight line-clamp-2">
            {program.title || "Untitled Program"}
          </h3>
          <p className="text-sm text-slate-400 font-bold tracking-tight">
            {program.category || "Training"} • Access Enabled
          </p>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Button 
            variant="ghost" 
            onClick={onEdit}
            className="flex-1 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-11 text-xs font-black border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all flex gap-2"
          >
            <Edit2 size={14} /> Rename
          </Button>
          <Button 
            variant="ghost" 
            onClick={onShare}
            className="flex-1 rounded-2xl text-primary hover:text-primary hover:bg-primary/5 h-11 text-xs font-black border border-primary/20 transition-all flex gap-2"
          >
            <Share2 size={14} /> Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 h-11 w-11 border border-slate-200 dark:border-slate-800">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48">
              <DropdownMenuItem onClick={onEdit} className="flex gap-2 font-bold cursor-pointer">
                <Edit2 size={14} /> Edit Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="flex gap-2 font-bold cursor-pointer">
                <Share2 size={14} /> Share Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="flex gap-2 font-bold text-red-500 cursor-pointer hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/30">
                <Trash2 size={14} /> Delete Program
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
