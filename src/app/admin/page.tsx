'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, setDoc, serverTimestamp, orderBy, deleteDoc, where, getDocs, writeBatch, Query } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { 
  Users, 
  BookOpen, 
  Plus, 
  UserCheck, 
  UserMinus, 
  Save, 
  Edit2, 
  UserPlus, 
  Trash2, 
  ShieldCheck,
  Eye,
  EyeOff,
  FolderOpen,
  Filter,
} from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { PlayerIcon } from '@/components/icons/PlayerIcon';

const MAIN_ADMIN_EMAIL = "admin@freedommagnethub.com";

export default function AdminPage() {
  const firestore = useFirestore();
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('courses');
  const [lessonFilter, setLessonFilter] = useState('all');

  const isMainAdmin = currentUser?.email === MAIN_ADMIN_EMAIL;

  const usersQuery = useMemo(() => {
    if (!firestore || authLoading || !currentUser || !isAdmin) return null;
    return query(collection(firestore, 'users')) as Query<any>;
  }, [firestore, isAdmin, authLoading, currentUser]);
  
  const coursesQuery = useMemo(() => {
    if (!firestore || authLoading || !currentUser || !isAdmin) return null;
    if (isMainAdmin) {
      return query(collection(firestore, 'courses')) as Query<any>;
    }
    return query(collection(firestore, 'courses'), where('adminIds', 'array-contains', currentUser.uid)) as Query<any>;
  }, [firestore, currentUser, isMainAdmin, isAdmin, authLoading]);

  const lessonsQuery = useMemo(() => {
    if (!firestore || authLoading || !currentUser || !isAdmin) return null;
    if (lessonFilter !== 'all') {
      return query(collection(firestore, 'lessons'), where('courseId', '==', lessonFilter), orderBy('dayNumber', 'asc')) as Query<any>;
    }
    return query(collection(firestore, 'lessons'), orderBy('dayNumber', 'asc')) as Query<any>;
  }, [firestore, lessonFilter, currentUser, isAdmin, authLoading]);

  const { data: users, loading: usersLoading } = useCollection<any>(usersQuery);
  const { data: courses, loading: coursesLoading } = useCollection<any>(coursesQuery);
  const { data: lessons, loading: lessonsLoading } = useCollection<any>(lessonsQuery);

  const [courseForm, setCourseForm] = useState({ 
    title: '', description: '', category: 'General', imageUrl: '', author: 'Freedom Magnet Admin', price: 0, originalPrice: 0, rating: 4.5, reviewCount: 0, visibility: 'PRIVATE'
  });
  const [lessonForm, setLessonForm] = useState({ 
    title: '', description: '', dayNumber: 1, youtubeUrl: '', vimeoUrl: '', thumbnailUrl: '', pdfUrl: '', driveVideoUrl: '', courseId: '', actionPlan: '' 
  });
  const [newUserForm, setNewUserForm] = useState({ displayName: '', email: '', password: '', role: 'student' as 'student' | 'admin' });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const extractVimeoId = (url: string) => {
    if (!url) return '';
    const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : url;
  };

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({ displayName: '', email: '', role: 'student' as 'student' | 'admin' });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsAddingUser(true);
    try {
      const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserForm.email, newUserForm.password);
      const uid = userCredential.user.uid;
      const roleToAssign = isMainAdmin ? newUserForm.role : 'student';
      const userProfile = { uid, displayName: newUserForm.displayName, email: newUserForm.email, role: roleToAssign, status: true, cohortStartDate: serverTimestamp() };
      await setDoc(doc(firestore, 'users', uid), userProfile);
      await signOut(secondaryAuth);
      toast({ title: "Account Registered", description: `${newUserForm.displayName} now has ${roleToAssign} access.` });
      setNewUserForm({ displayName: '', email: '', password: '', role: 'student' });
      setIsUserDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !currentUser) return;
    const newCourseData = {
      ...courseForm,
      title: courseForm.title || "Untitled Program",
      price: Number(courseForm.price),
      originalPrice: Number(courseForm.originalPrice),
      rating: Number(courseForm.rating),
      reviewCount: Number(courseForm.reviewCount),
      visibility: courseForm.visibility,
      videos: "0",
      progress: 0,
      isLocked: false,
      adminIds: [currentUser.uid], 
      studentIds: [],
      createdAt: serverTimestamp()
    };
    addDoc(collection(firestore, 'courses'), newCourseData).then((docRef) => {
      setCourseForm({ title: '', description: '', category: 'General', imageUrl: '', author: 'Freedom Magnet Admin', price: 0, originalPrice: 0, rating: 4.5, reviewCount: 0, visibility: 'PRIVATE' });
      toast({ title: "Program Created", description: "Successfully added a new training program folder." });
    }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: newCourseData }));
    });
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !lessonForm.courseId) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a target program." });
      return;
    }
    const lessonData = {
      courseId: lessonForm.courseId,
      title: lessonForm.title || '',
      description: lessonForm.description || '',
      actionPlan: lessonForm.actionPlan || '',
      dayNumber: Number(lessonForm.dayNumber),
      youtubeVideoId: extractYoutubeId(lessonForm.youtubeUrl),
      vimeoVideoId: extractVimeoId(lessonForm.vimeoUrl),
      thumbnailUrl: lessonForm.thumbnailUrl || '',
      pdfUrl: lessonForm.pdfUrl || '',
      driveVideoUrl: lessonForm.driveVideoUrl || '',
      isLocked: false,
      createdAt: serverTimestamp()
    };
    addDoc(collection(firestore, 'lessons'), lessonData).then(() => {
      setLessonForm({ ...lessonForm, title: '', description: '', dayNumber: lessonForm.dayNumber + 1, youtubeUrl: '', vimeoUrl: '', thumbnailUrl: '', pdfUrl: '', driveVideoUrl: '', actionPlan: '' });
      toast({ title: "Lesson Published", description: `Session Day ${lessonData.dayNumber} is now live.` });
    }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData }));
    });
  };

  const filteredLessons = useMemo(() => {
    if (!lessons || !courses) return [];
    return lessons.filter((l: any) => {
      const managedCourse = courses.find((c: any) => c.id === l.courseId);
      if (!managedCourse) return false;
      if (lessonFilter !== 'all' && l.courseId !== lessonFilter) return false;
      return true;
    });
  }, [lessons, courses, lessonFilter]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary h-10 w-10" /> Management Suite
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {isMainAdmin ? "Main Admin: Global control of users, programs, and administrative assignments." : "Sub Admin: Manage your assigned programs, enroll students, and publish content."}
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-12 px-6 flex gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all">
                <UserPlus size={18} /> Register Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-md">
              <DialogHeader><DialogTitle>Register Account</DialogTitle><DialogDescription>Create a student account for your hub.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2"><Label className="font-bold">Full Name</Label><Input value={newUserForm.displayName} onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})} placeholder="Name" required className="rounded-xl h-12 text-slate-900" /></div>
                <div className="space-y-2"><Label className="font-bold">Email Address</Label><Input type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} placeholder="your@email.com" required className="rounded-xl h-12 text-slate-900" /></div>
                <div className="space-y-2">
                  <Label className="font-bold">Password</Label>
                  <div className="relative">
                    <Input type={showRegPassword ? "text" : "password"} value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} placeholder="••••••••" required className="rounded-xl h-12 pr-11 text-slate-900" />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">{showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div className="space-y-2"><Label className="font-bold">Role</Label>
                  <Select value={newUserForm.role} onValueChange={(val: any) => setNewUserForm({...newUserForm, role: val})}><SelectTrigger className="h-12 rounded-xl text-slate-900"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Student (Hub Access)</SelectItem>{isMainAdmin && <SelectItem value="admin">Admin (Co-Admin Access)</SelectItem>}</SelectContent></Select>
                </div>
                <DialogFooter className="pt-4"><Button type="submit" className="w-full rounded-xl h-12 font-bold bg-slate-900 dark:bg-slate-100 dark:text-slate-900" disabled={isAddingUser}>{isAddingUser ? "Registering..." : "Complete Registration"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Tabs defaultValue="courses" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-1 rounded-2xl h-14 w-full md:w-auto flex overflow-x-auto gap-1">
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all disabled:opacity-50 min-w-max" disabled={!isMainAdmin}><Users size={16} /> Directory</TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all min-w-max"><BookOpen size={16} /> Programs</TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all min-w-max"><PlayerIcon className="h-4 w-4" /> Content</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {isMainAdmin && (
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50"><CardTitle>Member Directory</CardTitle><CardDescription>Main Admin view of all registered platform accounts.</CardDescription></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table><TableHeader><TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800"><TableHead className="pl-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Name & Email</TableHead><TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Role</TableHead><TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead><TableHead className="text-right pr-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {usersLoading ? (<TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">Syncing member records...</TableCell></TableRow>) : users?.map((u: any) => (
                      <TableRow key={u.id} className="group transition-colors border-slate-50 dark:border-slate-800/50">
                        <TableCell className="pl-6 py-5"><div className="flex flex-col"><span className="font-black text-slate-800 dark:text-slate-200 text-base">{u.displayName || "Unknown"}</span><span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{u.email}</span></div></TableCell>
                        <TableCell><Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border-none ${u.role === 'admin' ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-rose-50 dark:bg-rose-950 text-primary"}`}>{u.email === MAIN_ADMIN_EMAIL ? "Main Admin" : u.role === 'admin' ? "Sub Admin" : "Student"}</Badge></TableCell>
                        <TableCell><div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tight ${u.status === false ? "text-slate-300 dark:text-slate-700" : "text-emerald-500"}`}>{u.status === false ? <UserMinus size={14} /> : <UserCheck size={14} />}{u.status === false ? "Restricted" : "Active"}</div></TableCell>
                        <TableCell className="text-right pr-6">
                          {u.email !== MAIN_ADMIN_EMAIL && (<div className="flex items-center justify-end gap-2"><Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 hover:text-primary transition-all" onClick={() => { setEditingUser(u); setEditUserForm({ displayName: u.displayName || '', email: u.email || '', role: u.role || 'student' }); }}><Edit2 size={14} /></Button><div className="flex items-center gap-2 ml-2"><Switch checked={u.status !== false} className="data-[state=checked]:bg-emerald-500 scale-75" /></div></div>)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="courses">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="text-primary" /> Create Program</CardTitle><CardDescription>Initialize a new program track folder.</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <div className="space-y-2"><Label className="font-bold">Program Name</Label><Input placeholder="e.g. 90-Day Masterclass" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="rounded-xl h-12 text-slate-900" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="font-bold">Sale Price (₹)</Label><Input type="number" placeholder="0" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: Number(e.target.value)})} required className="rounded-xl h-12 text-slate-900" /></div>
                    <div className="space-y-2"><Label className="font-bold">Old Price (₹)</Label><Input type="number" placeholder="0" value={courseForm.originalPrice} onChange={e => setCourseForm({...courseForm, originalPrice: Number(e.target.value)})} required className="rounded-xl h-12 text-slate-900" /></div>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">Visibility</Label>
                    <Select value={courseForm.visibility} onValueChange={(val) => setCourseForm({...courseForm, visibility: val})}><SelectTrigger className="h-12 rounded-xl text-slate-900"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PUBLIC">Public</SelectItem><SelectItem value="PRIVATE">Private</SelectItem><SelectItem value="UNLISTED">Unlisted</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">Thumbnail URL</Label><Input placeholder="https://..." value={courseForm.imageUrl} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} className="rounded-xl h-12 text-slate-900" /></div>
                  <div className="space-y-2"><Label className="font-bold">Category</Label><Input placeholder="Education" value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} required className="rounded-xl h-12 text-slate-900" /></div>
                  <Button type="submit" className="w-full rounded-xl h-12 font-bold shadow-md">Add to Portfolio</Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2"><FolderOpen size={18} className="text-primary" /> Program Portfolio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesLoading ? Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 animate-pulse rounded-2xl" />) : courses?.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-3 flex gap-4 hover:shadow-md transition-all items-center relative group">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800 relative"><Image src={c.imageUrl || 'https://picsum.photos/seed/prog/200'} className="w-full h-full object-cover" alt={c.title} fill /></div>
                    <div className="flex flex-col justify-center flex-1 min-w-0"><h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">{c.title || "Untitled"}</h4><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.category}</span></div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-primary"><Edit2 size={16} /></Button></div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lessons">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
              <CardHeader><CardTitle className="flex items-center gap-2"><PlayerIcon className="h-5 w-5 text-primary" /> Content Portal</CardTitle><CardDescription>Upload video sessions to your program folders.</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="space-y-2"><Label className="font-bold">Target Program</Label><Select value={lessonForm.courseId} onValueChange={(val) => setLessonForm({...lessonForm, courseId: val})}><SelectTrigger className="h-12 rounded-xl text-slate-900"><SelectValue placeholder="Choose program" /></SelectTrigger><SelectContent>{courses?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.title || "Untitled"}</SelectItem>))}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="font-bold">Session / Day #</Label><Input type="number" min="1" value={lessonForm.dayNumber} onChange={e => setLessonForm({...lessonForm, dayNumber: Number(e.target.value)})} required className="h-12 rounded-xl text-slate-900" /></div>
                    <div className="space-y-2"><Label className="font-bold">YouTube URL</Label><Input placeholder="YouTube Link" value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" /></div>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">Session Title</Label><Input placeholder="Introduction" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="h-12 rounded-xl text-slate-900" required /></div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold flex gap-2 transition-all active:scale-95 shadow-lg shadow-primary/10"><Save size={18} /> Publish Session</Button>
                </form>
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><PlayerIcon className="h-5 w-5 text-primary" /> Published Sessions</h3>
                <div className="flex items-center gap-2 min-w-[200px]"><Filter size={16} className="text-slate-400" /><Select value={lessonFilter} onValueChange={setLessonFilter}><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs"><SelectValue placeholder="Filter by program" /></SelectTrigger><SelectContent><SelectItem value="all">All Tracks</SelectItem>{courses?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="space-y-3">
                {lessonsLoading ? <p className="text-center py-10 text-slate-400">Syncing...</p> : filteredLessons.map((l: any) => (
                  <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4"><div className="relative w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden"><Image src={l.thumbnailUrl || `https://picsum.photos/seed/${l.id}/200/120`} alt={l.title} fill className="object-cover" /></div><div><h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{l.title}</h4><p className="text-xs text-slate-400">Day {l.dayNumber}</p></div></div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-red-500" onClick={() => deleteDoc(doc(firestore, 'lessons', l.id))}><Trash2 size={16} /></Button></div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
