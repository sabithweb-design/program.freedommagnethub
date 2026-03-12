'use client';

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  ChevronDown,
  Edit2
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
import { query, collection, doc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ProgramManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'by-me' | 'purchased'>('by-me');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const programsQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'courses')) : null, 
  [firestore]);
  
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

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">
      {/* Sub-Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Programs</h1>
        <div className="flex items-center gap-6">
          <button className="text-primary font-bold text-sm hover:underline tracking-wide">
            Comments
          </button>
          <Button className="bg-[#FF4D4D] hover:bg-[#E63E3E] text-white rounded-xl px-7 h-11 flex gap-2 font-bold shadow-md transition-all active:scale-95">
            <Plus size={20} strokeWidth={3} /> Create
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4">
        <TabButton 
          active={activeTab === 'by-me'} 
          onClick={() => setActiveTab('by-me')}
          label="Programs by me" 
        />
        <TabButton 
          active={activeTab === 'purchased'} 
          onClick={() => setActiveTab('purchased')}
          label="Purchased programs" 
        />
      </div>

      {/* Search Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <Input 
            placeholder="search by program title or description" 
            className="pl-14 h-14 rounded-full border-slate-200 bg-white placeholder:text-slate-400 text-slate-700 shadow-sm focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-14 rounded-2xl border-slate-200 px-8 flex gap-10 bg-white justify-between min-w-[160px] text-slate-700 font-bold shadow-sm hover:bg-slate-50">
              Filter <ChevronDown size={18} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-2 min-w-[160px]">
            <DropdownMenuItem className="rounded-lg font-medium">Workshop</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg font-medium">Program</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg font-medium">Drip Content</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-[420px] animate-pulse border shadow-sm" />
          ))
        ) : (
          programs?.map((program: any) => (
            <ProgramCard 
              key={program.id} 
              program={program} 
              onEdit={() => handleOpenEdit(program)}
            />
          ))
        )}
        
        {/* Placeholder if empty */}
        {(!programs || programs.length === 0) && !loading && (
           <ProgramCard 
            program={{
              title: "magnetic digital marketing formula",
              sections: 6,
              lectures: 7,
              imageUrl: "https://picsum.photos/seed/digital-marketing/600/400"
            }} 
            onEdit={() => {}}
           />
        )}
      </div>

      {/* Edit Dialog */}
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
          ? "bg-rose-50 text-primary border border-rose-100 shadow-sm" 
          : "bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function ProgramCard({ program, onEdit }: { program: any, onEdit: () => void }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        <Image 
          src={program.imageUrl || 'https://picsum.photos/seed/course/600/400'} 
          alt={program.title || "Program image"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="p-7 space-y-4 flex flex-col flex-1">
        <div className="space-y-3 flex-1">
          <div className="inline-flex">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg px-3 py-1 text-[10px] font-black tracking-widest mb-1 shadow-sm">
              PUBLISHED
            </Badge>
          </div>
          <h3 className="text-xl font-black text-slate-800 capitalize leading-tight line-clamp-2">
            {program.title || "magnetic digital marketing formula"}
          </h3>
          <p className="text-sm text-slate-400 font-bold tracking-tight">
            {program.sections || 6} sections • {program.lectures || 7} lectures
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 gap-3">
          <Button 
            variant="ghost" 
            onClick={onEdit}
            className="flex-1 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-12 text-sm font-black border border-slate-200 hover:border-slate-300 transition-all flex gap-2"
          >
            <Edit2 size={14} /> Rename
          </Button>
          <Button variant="ghost" size="icon" className="rounded-2xl text-slate-400 hover:bg-slate-50 h-12 w-12 border border-slate-200">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
