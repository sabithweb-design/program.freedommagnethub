'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, BookOpen, Video, Plus, UserCheck, UserMinus, Youtube, Save, Wand2 } from 'lucide-react';
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
  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: 'Coding', imageUrl: '', author: 'Samuel' });
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', dayNumber: 1, youtubeUrl: '' });

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const userRef = doc(firestore, 'users', userId);
    updateDoc(userRef, { status: !currentStatus })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: { status: !currentStatus } });
        errorEmitter.emit('permission-error', pErr);
      });
    
    toast({
      title: currentStatus ? "User Deactivated" : "User Activated",
      description: `The user's status has been updated successfully.`,
    });
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    addDoc(collection(firestore, 'courses'), {
      ...courseForm,
      videos: "0/0",
      progress: 0,
      createdAt: serverTimestamp()
    }).then(() => {
      setCourseForm({ title: '', description: '', category: 'Coding', imageUrl: '', author: 'Samuel' });
      toast({ title: "Course Created", description: "Successfully added a new course to the curriculum." });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: courseForm });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    // Helper to extract YouTube ID
    const extractId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : url;
    };

    const lessonData = {
      title: lessonForm.title,
      description: lessonForm.description,
      dayNumber: Number(lessonForm.dayNumber),
      youtubeVideoId: extractId(lessonForm.youtubeUrl),
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'lessons'), lessonData).then(() => {
      setLessonForm({ title: '', description: '', dayNumber: lessonForm.dayNumber + 1, youtubeUrl: '' });
      toast({ title: "Lesson Published", description: `Day ${lessonData.dayNumber} is now live.` });
    }).catch(async (err) => {
      const pErr = new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData });
      errorEmitter.emit('permission-error', pErr);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Management Suite</h1>
        <p className="text-slate-500 mt-2 font-medium">Configure your 90-day elite training hub.</p>
      </header>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-3">
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2">
            <Users size={16} /> Users
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2">
            <BookOpen size={16} /> Courses
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2">
            <Video size={16} /> Lessons
          </TabsTrigger>
        </TabsList>

        {/* Users Section */}
        <TabsContent value="users">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle>User Directory</CardTitle>
              <CardDescription>Manage student access and platform permissions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Student Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Loading directory...</TableCell></TableRow>
                  ) : users?.map((u: any) => (
                    <TableRow key={u.id} className="group transition-colors">
                      <TableCell className="pl-6 font-medium text-slate-700">{u.email}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.status === false ? "text-destructive" : "text-emerald-500"}`}>
                          {u.status === false ? <UserMinus size={12} /> : <UserCheck size={12} />}
                          {u.status === false ? "Deactivated" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Switch 
                          checked={u.status !== false} 
                          onCheckedChange={() => handleToggleUserStatus(u.id, u.status !== false)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Section */}
        <TabsContent value="courses">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="text-primary" /> New Course
                </CardTitle>
                <CardDescription>Launch a new learning path.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g. Master React Native" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail URL</Label>
                    <Input placeholder="https://picsum.photos/..." value={courseForm.imageUrl} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input placeholder="Coding" value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Quick course overview..." value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full rounded-xl py-6">Add Course</Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                <BookOpen size={18} /> Active Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses?.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden p-3 flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                      <img src={c.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{c.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{c.category} • {c.author}</p>
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
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="text-primary" /> Add Lesson
                </CardTitle>
                <CardDescription>Publish to the 90-day drip.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day Number</Label>
                      <Input type="number" min="1" max="90" value={lessonForm.dayNumber} onChange={e => setLessonForm({...lessonForm, dayNumber: Number(e.target.value)})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>YouTube URL</Label>
                      <Input placeholder="https://youtube.com/..." value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Lesson Title</Label>
                    <Input placeholder="Key Concepts of Day X" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Rich Description</Label>
                    <Textarea className="min-h-[150px]" placeholder="Detailed lesson content..." value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} required />
                  </div>
                  <Button type="submit" className="w-full rounded-xl py-6 flex gap-2">
                    <Save size={18} /> Publish Lesson
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                <Youtube size={18} className="text-red-600" /> Curriculum Timeline
              </h3>
              <div className="space-y-3">
                {lessons?.map((l: any) => (
                  <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {l.dayNumber}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{l.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{l.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Wand2 size={16} />
                    </Button>
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