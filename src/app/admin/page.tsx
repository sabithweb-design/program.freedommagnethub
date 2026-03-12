'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, setDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
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
  IndianRupee, 
  Lock, 
  Unlock,
  Star,
  Image as ImageIcon,
  FileText,
  Share2,
  ClipboardList
} from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';

/**
 * Custom Player Icon matching the requested Flaticon style.
 */
export const PlayerIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    fill="currentColor"
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
  </svg>
);

export default function AdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');

  // Queries
  const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const coursesQuery = useMemo(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const lessonsQuery = useMemo(() => firestore ? query(collection(firestore, 'lessons'), orderBy('dayNumber', 'asc')) : null, [firestore]);

  const { data: users, loading: usersLoading } = useCollection<any>(usersQuery);
  const { data: courses, loading: coursesLoading } = useCollection<any>(coursesQuery);
  const { data: lessons, loading: lessonsLoading } = useCollection<any>(lessonsQuery);

  // Form States
  const [courseForm, setCourseForm] = useState({ 
    title: '', 
    description: '', 
    category: 'General', 
    imageUrl: '', 
    author: 'Freedom Magnet Admin', 
    price: 0, 
    originalPrice: 0,
    rating: 4.5,
    reviewCount: 0
  });
  const [lessonForm, setLessonForm] = useState({ 
    title: '', 
    description: '', 
    dayNumber: 1, 
    youtubeUrl: '', 
    thumbnailUrl: '', 
    pdfUrl: '', 
    courseId: '',
    actionPlan: '' 
  });
  const [newUserForm, setNewUserForm] = useState({ displayName: '', email: '', password: '', role: 'student' as 'student' | 'admin' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Edit State
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [editFields, setEditFields] = useState({ 
    title: '', 
    description: '',
    category: '',
    imageUrl: '',
    author: '',
    price: 0, 
    originalPrice: 0,
    rating: 4.5,
    reviewCount: 0
  });

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const userRef = doc(firestore!, 'users', userId);
    updateDoc(userRef, { status: !currentStatus })
      .then(() => {
        toast({
          title: !currentStatus ? "User Activated" : "User Deactivated",
          description: `The status has been updated.`,
        });
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: { status: !currentStatus } });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleToggleProgramLock = (programId: string, currentLocked: boolean) => {
    if (!firestore) return;
    const programRef = doc(firestore, 'courses', programId);
    updateDoc(programRef, { isLocked: !currentLocked })
      .then(() => {
        toast({
          title: !currentLocked ? "Program Locked" : "Program Unlocked",
          description: `Access status updated successfully.`,
        });
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ path: programRef.path, operation: 'update', requestResourceData: { isLocked: !currentLocked } });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleToggleLessonLock = (lessonId: string, currentLocked: boolean) => {
    if (!firestore) return;
    const lessonRef = doc(firestore, 'lessons', lessonId);
    updateDoc(lessonRef, { isLocked: !currentLocked })
      .then(() => {
        toast({
          title: !currentLocked ? "Lesson Locked" : "Lesson Unlocked",
          description: `Access status updated successfully.`,
        });
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ path: lessonRef.path, operation: 'update', requestResourceData: { isLocked: !currentLocked } });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsAddingUser(true);

    try {
      const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserForm.email, newUserForm.password);
      const uid = userCredential.user.uid;

      const userProfile = {
        uid,
        displayName: newUserForm.displayName,
        email: newUserForm.email,
        role: newUserForm.role,
        status: true,
        cohortStartDate: serverTimestamp()
      };

      await setDoc(doc(firestore, 'users', uid), userProfile);
      await signOut(secondaryAuth);

      toast({
        title: "Admin/Member Registered",
        description: `${newUserForm.displayName} now has ${newUserForm.role} access.`,
      });

      setNewUserForm({ displayName: '', email: '', password: '', role: 'student' });
      setIsUserDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Creating User",
        description: error.message,
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    addDoc(collection(firestore, 'courses'), {
      ...courseForm,
      title: courseForm.title || "Untitled Program",
      price: Number(courseForm.price),
      originalPrice: Number(courseForm.originalPrice),
      rating: Number(courseForm.rating),
      reviewCount: Number(courseForm.reviewCount),
      videos: "0",
      progress: 0,
      isLocked: false,
      createdAt: serverTimestamp()
    }).then(() => {
      setCourseForm({ 
        title: '', 
        description: '', 
        category: 'General', 
        imageUrl: '', 
        author: 'Freedom Magnet Admin', 
        price: 0, 
        originalPrice: 0,
        rating: 4.5,
        reviewCount: 0
      });
      toast({ title: "Program Created", description: "Successfully added a new training program." });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: courseForm });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  const handleUpdateProgram = () => {
    if (!firestore || !editingProgram) return;

    const programRef = doc(firestore, 'courses', editingProgram.id);
    const updateData = {
      title: editFields.title || "Untitled Program",
      description: editFields.description,
      category: editFields.category,
      imageUrl: editFields.imageUrl,
      author: editFields.author,
      price: Number(editFields.price),
      originalPrice: Number(editFields.originalPrice),
      rating: Number(editFields.rating),
      reviewCount: Number(editFields.reviewCount)
    };

    updateDoc(programRef, updateData)
      .then(() => {
        toast({ title: "Program Updated", description: "The program details have been saved." });
        setEditingProgram(null);
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'update', 
          requestResourceData: updateData 
        });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleDeleteProgram = (programId: string) => {
    if (!firestore) return;
    
    if (!confirm("Are you sure you want to remove this program? This action cannot be undone.")) return;

    const programRef = doc(firestore, 'courses', programId);
    deleteDoc(programRef)
      .then(() => {
        toast({ title: "Program Removed", description: "The program has been deleted from the catalog." });
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', pErr);
      });
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !lessonForm.courseId) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a program for this lesson." });
      return;
    }

    const extractId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : url;
    };

    const lessonData = {
      courseId: lessonForm.courseId,
      title: lessonForm.title || '',
      description: lessonForm.description || '',
      actionPlan: lessonForm.actionPlan || '',
      dayNumber: Number(lessonForm.dayNumber),
      youtubeVideoId: extractId(lessonForm.youtubeUrl),
      thumbnailUrl: lessonForm.thumbnailUrl || '',
      pdfUrl: lessonForm.pdfUrl || '',
      isLocked: false,
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'lessons'), lessonData).then(() => {
      setLessonForm({ ...lessonForm, title: '', description: '', dayNumber: lessonForm.dayNumber + 1, youtubeUrl: '', thumbnailUrl: '', pdfUrl: '', actionPlan: '' });
      toast({ title: "Lesson Published", description: `Day ${lessonData.dayNumber} is now live.` });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  const handleShareLesson = (dayNumber: number) => {
    const url = `${window.location.origin}/lesson/${dayNumber}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lesson Link Copied",
      description: `Direct link to Day ${dayNumber} has been copied.`,
    });
  };

  const handleShareCourse = (courseId: string) => {
    const url = `${window.location.origin}/courses`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Program Link Copied",
      description: `The marketplace link has been copied to your clipboard.`,
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Management Suite</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Add admins, manage programs, and upload training content.</p>
        </div>
        {activeTab === 'users' && (
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-12 px-6 flex gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <UserPlus size={18} /> Add New Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Account</DialogTitle>
                <DialogDescription>Create a student or admin account for the hub.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">Full Name</Label>
                  <Input 
                    value={newUserForm.displayName} 
                    onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})}
                    placeholder="John Doe" 
                    required 
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Email Address</Label>
                  <Input 
                    type="email"
                    value={newUserForm.email} 
                    onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                    placeholder="admin@freedommagnethub.com" 
                    required 
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Password</Label>
                  <Input 
                    type="password"
                    value={newUserForm.password} 
                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                    placeholder="••••••••" 
                    required 
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">System Role</Label>
                  <Select value={newUserForm.role} onValueChange={(val: any) => setNewUserForm({...newUserForm, role: val})}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student (Standard Access)</SelectItem>
                      <SelectItem value="admin">Admin (Full Control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full rounded-xl h-12 font-bold bg-slate-900 dark:bg-slate-100 dark:text-slate-900" disabled={isAddingUser}>
                    {isAddingUser ? "Registering..." : "Complete Registration"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-3">
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <Users size={16} /> Admins & Members
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <BookOpen size={16} /> Manage Programs
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <PlayerIcon className="h-4 w-4" /> Upload Lessons
          </TabsTrigger>
        </TabsList>

        {/* Users Section */}
        <TabsContent value="users">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <CardTitle>Member Directory</CardTitle>
              <CardDescription>Grant admin privileges or manage student access status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                    <TableHead className="pl-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Name & Email</TableHead>
                    <TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">System Role</TableHead>
                    <TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right pr-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">Syncing member records...</TableCell></TableRow>
                  ) : users?.map((u: any) => (
                    <TableRow key={u.id} className="group transition-colors border-slate-50 dark:border-slate-800/50">
                      <TableCell className="pl-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-slate-200 text-base">{u.displayName || "Unknown Member"}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border-none ${
                          u.role === 'admin' ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-rose-50 dark:bg-rose-950 text-primary"
                        }`}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tight ${u.status === false ? "text-slate-300 dark:text-slate-700" : "text-emerald-500"}`}>
                          {u.status === false ? <UserMinus size={14} /> : <UserCheck size={14} />}
                          {u.status === false ? "Restricted" : "Active"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">{u.status === false ? "Enable" : "Disable"}</span>
                          <Switch 
                            checked={u.status !== false} 
                            onCheckedChange={() => handleToggleUserStatus(u.id, u.status !== false)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Programs Section */}
        <TabsContent value="courses">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="text-primary" /> Create Program
                </CardTitle>
                <CardDescription>Add a new folder or course to the hub.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Program Name</Label>
                    <Input placeholder="e.g. Elite Digital Marketing" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="rounded-xl h-12" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Sale Price (₹)</Label>
                      <Input type="number" placeholder="0" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: Number(e.target.value)})} required className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Original Price (₹)</Label>
                      <Input type="number" placeholder="0" value={courseForm.originalPrice} onChange={e => setCourseForm({...courseForm, originalPrice: Number(e.target.value)})} required className="rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Thumbnail (URL)</Label>
                    <Input placeholder="https://picsum.photos/..." value={courseForm.imageUrl} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Category</Label>
                    <Input placeholder="Business / Design" value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Overview</Label>
                    <Textarea placeholder="What is this program about?" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="rounded-xl min-h-[100px]" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-12 font-bold">Add to Portfolio</Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
                <BookOpen size={18} /> Program Portfolio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses?.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-3 flex gap-4 hover:shadow-md transition-shadow items-center relative group">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800 relative">
                      <img src={c.imageUrl || 'https://picsum.photos/seed/program/200'} className="w-full h-full object-cover" alt={c.title} />
                      {c.isLocked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">{c.title || "Untitled Program"}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.category}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold">{c.rating || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full text-slate-400 hover:text-primary"
                        onClick={() => handleShareCourse(c.id)}
                      >
                        <Share2 size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-primary"
                        onClick={() => { 
                          setEditingProgram(c); 
                          setEditFields({ 
                            title: c.title || '', 
                            description: c.description || '',
                            category: c.category || '',
                            imageUrl: c.imageUrl || '',
                            author: c.author || '',
                            price: c.price || 0, 
                            originalPrice: c.originalPrice || 0,
                            rating: c.rating || 4.5,
                            reviewCount: c.reviewCount || 0
                          }); 
                        }}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500"
                        onClick={() => handleDeleteProgram(c.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Lessons Section */}
        <TabsContent value="lessons">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayerIcon className="h-5 w-5 text-primary" /> Upload Content
                </CardTitle>
                <CardDescription>Upload training videos and PDFs to a program.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Select Program Folder</Label>
                    <Select value={lessonForm.courseId} onValueChange={(val) => setLessonForm({...lessonForm, courseId: val})}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Choose a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title || "Untitled Program"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Lesson Order</Label>
                      <Input type="number" min="1" max="90" value={lessonForm.dayNumber} onChange={e => setLessonForm({...lessonForm, dayNumber: Number(e.target.value)})} required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Video Link</Label>
                      <Input placeholder="YouTube/Vimeo link" value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} required className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">PDF Material (URL)</Label>
                    <Input placeholder="https://drive.google.com/..." value={lessonForm.pdfUrl} onChange={e => setLessonForm({...lessonForm, pdfUrl: e.target.value})} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Lesson Title</Label>
                    <Input placeholder="Introduction to Hub" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="h-12 rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Lesson Description</Label>
                    <Textarea className="min-h-[80px] rounded-xl" placeholder="Detailed content summary..." value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold flex gap-2">
                    <Save size={18} /> Publish to Folder
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
                <PlayerIcon className="h-5 w-5 text-primary" /> Content Timeline
              </h3>
              <div className="space-y-3">
                {lessonsLoading ? (
                  <div className="text-center py-10 text-slate-400">Loading timeline...</div>
                ) : lessons?.map((l: any) => {
                  const course = courses?.find(c => c.id === l.courseId);
                  return (
                    <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800">
                          <Image 
                            src={l.thumbnailUrl || `https://picsum.photos/seed/${l.id}/200/120`}
                            alt={l.title || "Lesson Thumbnail"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/10 text-primary`}>
                            {l.dayNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{l.title || `Lesson ${l.dayNumber}`}</h4>
                               {course && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase whitespace-nowrap">{course.title || "Untitled"}</span>}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{l.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full text-slate-400 hover:text-primary"
                          onClick={() => handleShareLesson(l.dayNumber)}
                        >
                          <Share2 size={16} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Program Details</DialogTitle>
            <DialogDescription>Modify program names, pricing, and visual assets.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Program Name</Label>
                  <Input 
                    value={editFields.title} 
                    onChange={(e) => setEditFields({...editFields, title: e.target.value})}
                    className="rounded-xl h-12"
                    placeholder="Enter program title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Category</Label>
                  <Input 
                    value={editFields.category} 
                    onChange={(e) => setEditFields({...editFields, category: e.target.value})}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Thumbnail (URL)</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      value={editFields.imageUrl} 
                      onChange={(e) => setEditFields({...editFields, imageUrl: e.target.value})}
                      className="rounded-xl h-12 pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Sale Price (₹)</Label>
                    <Input 
                      type="number"
                      value={editFields.price} 
                      onChange={(e) => setEditFields({...editFields, price: Number(e.target.value)})}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Original (₹)</Label>
                    <Input 
                      type="number"
                      value={editFields.originalPrice} 
                      onChange={(e) => setEditFields({...editFields, originalPrice: Number(e.target.value)})}
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Program Description</Label>
              <Textarea 
                value={editFields.description} 
                onChange={(e) => setEditFields({...editFields, description: e.target.value})}
                className="rounded-xl min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setEditingProgram(null)} className="rounded-xl h-12 font-bold flex-1">Cancel</Button>
            <Button onClick={handleUpdateProgram} className="rounded-xl h-12 font-bold bg-primary text-white flex-1 shadow-lg shadow-primary/20">Save All Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
