
'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs';
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
import { Users, BookOpen, Video, Plus, UserCheck, UserMinus, Youtube, Save, Edit2, UserPlus, Shield } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: 'General', imageUrl: '', author: 'Freedom Magnet Admin' });
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', dayNumber: 1, youtubeUrl: '', courseId: '' });
  const [newUserForm, setNewUserForm] = useState({ displayName: '', email: '', password: '', role: 'student' as 'student' | 'admin' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Edit State
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const userRef = doc(firestore, 'users', userId);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsAddingUser(true);

    try {
      // In a pure client-side setup, to create a user WITHOUT signing out the admin:
      // We initialize a temporary secondary Firebase app instance.
      const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserForm.email, newUserForm.password);
      const uid = userCredential.user.uid;

      // Create the profile in Firestore
      const userProfile = {
        uid,
        displayName: newUserForm.displayName,
        email: newUserForm.email,
        role: newUserForm.role,
        status: true,
        cohortStartDate: serverTimestamp()
      };

      await setDoc(doc(firestore, 'users', uid), userProfile);
      
      // Sign out from the secondary app instance
      await signOut(secondaryAuth);

      toast({
        title: "User Created Successfully",
        description: `${newUserForm.displayName} has been added to the hub.`,
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
      videos: "0",
      progress: 0,
      createdAt: serverTimestamp()
    }).then(() => {
      setCourseForm({ title: '', description: '', category: 'General', imageUrl: '', author: 'Freedom Magnet Admin' });
      toast({ title: "Program Created", description: "Successfully added a new training program." });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: courseForm });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  const handleRenameProgram = () => {
    if (!firestore || !editingProgram) return;

    const programRef = doc(firestore, 'courses', editingProgram.id);
    updateDoc(programRef, { title: editTitle })
      .then(() => {
        toast({ title: "Program Renamed", description: "The program title has been updated." });
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
      title: lessonForm.title,
      description: lessonForm.description,
      dayNumber: Number(lessonForm.dayNumber),
      youtubeVideoId: extractId(lessonForm.youtubeUrl),
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'lessons'), lessonData).then(() => {
      setLessonForm({ ...lessonForm, title: '', description: '', dayNumber: lessonForm.dayNumber + 1, youtubeUrl: '' });
      toast({ title: "Lesson Published", description: `Day ${lessonData.dayNumber} is now live.` });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Management Suite</h1>
          <p className="text-slate-500 mt-2 font-medium">Configure your elite training hub and manage members.</p>
        </div>
        {activeTab === 'users' && (
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-12 px-6 flex gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <UserPlus size={18} /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Member</DialogTitle>
                <DialogDescription>Create a new account for your training program.</DialogDescription>
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
                    placeholder="student@example.com" 
                    required 
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Initial Password</Label>
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
                  <Label className="font-bold">Role</Label>
                  <Select value={newUserForm.role} onValueChange={(val: any) => setNewUserForm({...newUserForm, role: val})}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full rounded-xl h-12 font-bold bg-slate-900" disabled={isAddingUser}>
                    {isAddingUser ? "Creating Account..." : "Confirm & Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-3">
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <Users size={16} /> Members
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <BookOpen size={16} /> Programs
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <Video size={16} /> Lessons
          </TabsTrigger>
        </TabsList>

        {/* Users Section */}
        <TabsContent value="users">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle>Member Directory</CardTitle>
              <CardDescription>Monitor student progress and manage platform access status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-6 h-14 font-black text-slate-400 uppercase text-[10px] tracking-widest">Name & Email</TableHead>
                    <TableHead className="h-14 font-black text-slate-400 uppercase text-[10px] tracking-widest">Role</TableHead>
                    <TableHead className="h-14 font-black text-slate-400 uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right pr-6 h-14 font-black text-slate-400 uppercase text-[10px] tracking-widest">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">Syncing member records...</TableCell></TableRow>
                  ) : users?.map((u: any) => (
                    <TableRow key={u.id} className="group transition-colors border-slate-50">
                      <TableCell className="pl-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-base">{u.displayName || "Unknown Member"}</span>
                          <span className="text-xs text-slate-400 font-bold">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border-none ${
                          u.role === 'admin' ? "bg-slate-900 text-white" : "bg-rose-50 text-primary"
                        }`}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tight ${u.status === false ? "text-slate-300" : "text-emerald-500"}`}>
                          {u.status === false ? <UserMinus size={14} /> : <UserCheck size={14} />}
                          {u.status === false ? "Restricted" : "Active"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{u.status === false ? "Enable" : "Disable"}</span>
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
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="text-primary" /> New Program
                </CardTitle>
                <CardDescription>Launch a new learning path.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Title</Label>
                    <Input placeholder="e.g. Master React Native" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Thumbnail URL</Label>
                    <Input placeholder="https://picsum.photos/..." value={courseForm.imageUrl} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Category</Label>
                    <Input placeholder="Coding" value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} required className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Description</Label>
                    <Textarea placeholder="Quick overview..." value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="rounded-xl min-h-[100px]" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-12 font-bold">Create Program</Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                <BookOpen size={18} /> Active Programs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses?.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden p-3 flex gap-4 hover:shadow-md transition-shadow items-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden border">
                      <img src={c.imageUrl || 'https://picsum.photos/seed/program/200'} className="w-full h-full object-cover" alt={c.title} />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 leading-tight line-clamp-1">{c.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{c.category} • {c.author}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-slate-50 text-slate-400 hover:text-primary"
                      onClick={() => { setEditingProgram(c); setEditTitle(c.title); }}
                    >
                      <Edit2 size={16} />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Lessons Section */}
        <TabsContent value="lessons">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="text-primary" /> Add Lesson
                </CardTitle>
                <CardDescription>Upload a video to a specific program.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Select Program</Label>
                    <Select value={lessonForm.courseId} onValueChange={(val) => setLessonForm({...lessonForm, courseId: val})}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Choose a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Day Number</Label>
                      <Input type="number" min="1" max="90" value={lessonForm.dayNumber} onChange={e => setLessonForm({...lessonForm, dayNumber: Number(e.target.value)})} required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">YouTube URL</Label>
                      <Input placeholder="https://youtube.com/..." value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} required className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Lesson Title</Label>
                    <Input placeholder="Key Concepts" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Description</Label>
                    <Textarea className="min-h-[120px] rounded-xl" placeholder="Detailed lesson content..." value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} required />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold flex gap-2">
                    <Save size={18} /> Publish Lesson
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                <Youtube size={18} className="text-red-600" /> Lesson Timeline
              </h3>
              <div className="space-y-3">
                {lessonsLoading ? (
                  <div className="text-center py-10 text-slate-400">Loading lessons...</div>
                ) : lessons?.map((l: any) => {
                  const course = courses?.find(c => c.id === l.courseId);
                  return (
                    <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {l.dayNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-slate-800">{l.title}</h4>
                             {course && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase">{course.title}</span>}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{l.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Program</DialogTitle>
            <DialogDescription>Change the public title of this training program.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Program Title</Label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl h-12"
                placeholder="Enter new title..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingProgram(null)} className="rounded-xl h-12 font-bold">Cancel</Button>
            <Button onClick={handleRenameProgram} className="rounded-xl h-12 font-bold bg-primary text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

