
'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, setDoc, serverTimestamp, orderBy, deleteDoc, where, getDocs } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Lock, 
  Star, 
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  FolderOpen
} from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';

const MAIN_ADMIN_EMAIL = "admin@freedommagnethub.com";

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
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('courses');

  const isMainAdmin = currentUser?.email === MAIN_ADMIN_EMAIL;

  const usersQuery = useMemo(() => {
    if (!firestore || !isAdmin) return null;
    // Main Admin sees everything, Sub Admins only list for search purposes
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin]);
  
  const coursesQuery = useMemo(() => {
    if (!firestore || !currentUser) return null;
    if (isMainAdmin) {
      return query(collection(firestore, 'courses'));
    }
    return query(collection(firestore, 'courses'), where('adminIds', 'array-contains', currentUser.uid));
  }, [firestore, currentUser, isMainAdmin]);

  const lessonsQuery = useMemo(() => firestore ? query(collection(firestore, 'lessons'), orderBy('dayNumber', 'asc')) : null, [firestore]);

  const { data: users, loading: usersLoading } = useCollection<any>(usersQuery);
  const { data: courses, loading: coursesLoading } = useCollection<any>(coursesQuery);
  const { data: lessons, loading: lessonsLoading } = useCollection<any>(lessonsQuery);

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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const [enrollmentEmail, setEnrollmentEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);

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
    reviewCount: 0,
    adminIds: [] as string[],
    studentIds: [] as string[]
  });

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    updateDoc(userRef, { status: !currentStatus })
      .then(() => {
        toast({
          title: !currentStatus ? "User Activated" : "User Deactivated",
          description: `The status has been updated.`,
        });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: { status: !currentStatus } }));
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
        title: "Account Registered",
        description: `${newUserForm.displayName} now has ${newUserForm.role} access.`,
      });

      setNewUserForm({ displayName: '', email: '', password: '', role: 'student' });
      setIsUserDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!firestore || !editingProgram || !enrollmentEmail) return;
    setEnrolling(true);

    try {
      const q = query(collection(firestore, 'users'), where('email', '==', enrollmentEmail));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "User Not Found", description: "Please register the user first." });
        return;
      }

      const studentUid = snap.docs[0].id;
      if (editFields.studentIds.includes(studentUid)) {
        toast({ title: "Already Enrolled", description: "This user is already a member of this program." });
        return;
      }

      const newStudentIds = [...editFields.studentIds, studentUid];
      setEditFields({ ...editFields, studentIds: newStudentIds });
      setEnrollmentEmail('');
      toast({ title: "Member Added", description: "Successfully enrolled user in the session." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Error", description: err.message });
    } finally {
      setEnrolling(false);
    }
  };

  const removeStudent = (uid: string) => {
    setEditFields(prev => ({
      ...prev,
      studentIds: prev.studentIds.filter(id => id !== uid)
    }));
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
      adminIds: [currentUser?.uid], 
      studentIds: [],
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
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: courseForm }));
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
      reviewCount: Number(editFields.reviewCount),
      adminIds: editFields.adminIds,
      studentIds: editFields.studentIds
    };

    updateDoc(programRef, updateData)
      .then(() => {
        toast({ title: "Program Updated", description: "The program details have been saved." });
        setEditingProgram(null);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'update', 
          requestResourceData: updateData 
        }));
      });
  };

  const handleDeleteProgram = (programId: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to remove this program? This action cannot be undone.")) return;

    const programRef = doc(firestore, 'courses', programId);
    deleteDoc(programRef)
      .then(() => {
        toast({ title: "Program Removed", description: "The program has been deleted." });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: programRef.path, 
          operation: 'delete'
        }));
      });
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !lessonForm.courseId) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a program." });
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
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData }));
    });
  };

  const toggleAdminAssignment = (adminUid: string) => {
    setEditFields(prev => {
      const currentAdmins = [...prev.adminIds];
      const index = currentAdmins.indexOf(adminUid);
      if (index > -1) {
        currentAdmins.splice(index, 1);
      } else {
        currentAdmins.push(adminUid);
      }
      return { ...prev, adminIds: currentAdmins };
    });
  };

  const adminUsers = users?.filter((u: any) => u.role === 'admin') || [];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary h-10 w-10" /> Management Suite
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {isMainAdmin ? "Main Admin: Full platform control and sub-admin assignment." : "Sub Admin: Manage assigned programs, lessons, and your team of co-admins and students."}
          </p>
        </div>
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-12 px-6 flex gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all">
              <UserPlus size={18} /> Register Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle>Register Account</DialogTitle>
              <DialogDescription>Create a student or co-admin account. New admins can be assigned to help you manage programs.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold">Full Name</Label>
                <Input 
                  value={newUserForm.displayName} 
                  onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})}
                  placeholder="Name" 
                  required 
                  className="rounded-xl h-12 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Email Address</Label>
                <Input 
                  type="email"
                  value={newUserForm.email} 
                  onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                  placeholder="your@email.com" 
                  required 
                  className="rounded-xl h-12 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Password</Label>
                <div className="relative">
                  <Input 
                    type={showRegPassword ? "text" : "password"}
                    value={newUserForm.password} 
                    onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                    placeholder="••••••••" 
                    required 
                    className="rounded-xl h-12 pr-11 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Role</Label>
                <Select value={newUserForm.role} onValueChange={(val: any) => setNewUserForm({...newUserForm, role: val})}>
                  <SelectTrigger className="h-12 rounded-xl text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student (Hub Access)</SelectItem>
                    <SelectItem value="admin">Admin (Co-Admin Access)</SelectItem>
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
      </header>

      <Tabs defaultValue="courses" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-3">
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all disabled:opacity-50" disabled={!isMainAdmin}>
            <Users size={16} /> Directory
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <BookOpen size={16} /> Programs
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white flex gap-2 font-bold transition-all">
            <PlayerIcon className="h-4 w-4" /> Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {isMainAdmin ? (
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <CardTitle>Member Directory</CardTitle>
                <CardDescription>Main Admin view of all platform accounts.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="pl-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Name & Email</TableHead>
                      <TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Role</TableHead>
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
                            <span className="font-black text-slate-800 dark:text-slate-200 text-base">{u.displayName || "Unknown"}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border-none ${
                            u.role === 'admin' ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-rose-50 dark:bg-rose-950 text-primary"
                          }`}>
                            {u.email === MAIN_ADMIN_EMAIL ? "Main Admin" : u.role === 'admin' ? "Sub Admin" : "Student"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-tight ${u.status === false ? "text-slate-300 dark:text-slate-700" : "text-emerald-500"}`}>
                            {u.status === false ? <UserMinus size={14} /> : <UserCheck size={14} />}
                            {u.status === false ? "Restricted" : "Active"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isMainAdmin && u.email !== MAIN_ADMIN_EMAIL && (
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">{u.status === false ? "Enable" : "Disable"}</span>
                              <Switch 
                                checked={u.status !== false} 
                                onCheckedChange={() => handleToggleUserStatus(u.id, u.status !== false)}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="courses">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {isMainAdmin && (
              <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="text-primary" /> Create Program
                  </CardTitle>
                  <CardDescription>Only Main Admins can initialize new program folders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Program Name</Label>
                      <Input placeholder="e.g. 90-Day Masterclass" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="rounded-xl h-12 text-slate-900" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Sale Price (₹)</Label>
                        <Input type="number" placeholder="0" value={courseForm.price} onChange={e => setCourseForm({...courseForm, price: Number(e.target.value)})} required className="rounded-xl h-12 text-slate-900" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Old Price (₹)</Label>
                        <Input type="number" placeholder="0" value={courseForm.originalPrice} onChange={e => setCourseForm({...courseForm, originalPrice: Number(e.target.value)})} required className="rounded-xl h-12 text-slate-900" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Thumbnail (URL)</Label>
                      <Input placeholder="https://..." value={courseForm.imageUrl} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} className="rounded-xl h-12 text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Category</Label>
                      <Input placeholder="Education / Training" value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} required className="rounded-xl h-12 text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Overview</Label>
                      <Textarea placeholder="Program description..." value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="rounded-xl min-h-[100px] text-slate-900" />
                    </div>
                    <Button type="submit" className="w-full rounded-xl h-12 font-bold shadow-md">Add to Portfolio</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className={isMainAdmin ? "lg:col-span-2 space-y-4" : "col-span-full space-y-4"}>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
                <FolderOpen size={18} className="text-primary" /> {isMainAdmin ? "Full Program Portfolio" : "Assigned Programs"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesLoading ? (
                  Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 animate-pulse rounded-2xl" />)
                ) : courses?.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-3 flex gap-4 hover:shadow-md transition-all items-center relative group">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800 relative">
                      <img src={c.imageUrl || 'https://picsum.photos/seed/prog/200'} className="w-full h-full object-cover" alt={c.title} />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">{c.title || "Untitled"}</h4>
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
                        className="rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-all"
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
                            reviewCount: c.reviewCount || 0,
                            adminIds: c.adminIds || [],
                            studentIds: c.studentIds || []
                          }); 
                        }}
                      >
                        <Edit2 size={16} />
                      </Button>
                      {isMainAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-all"
                          onClick={() => handleDeleteProgram(c.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lessons">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayerIcon className="h-5 w-5 text-primary" /> Content Portal
                </CardTitle>
                <CardDescription>Upload video sessions to your assigned programs.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Target Program</Label>
                    <Select value={lessonForm.courseId} onValueChange={(val) => setLessonForm({...lessonForm, courseId: val})}>
                      <SelectTrigger className="h-12 rounded-xl text-slate-900">
                        <SelectValue placeholder="Choose program" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title || "Untitled"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Session / Day #</Label>
                      <Input type="number" min="1" max="90" value={lessonForm.dayNumber} onChange={e => setLessonForm({...lessonForm, dayNumber: Number(e.target.value)})} required className="h-12 rounded-xl text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Video URL</Label>
                      <Input placeholder="YouTube Link" value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} required className="h-12 rounded-xl text-slate-900" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Resources PDF (URL)</Label>
                    <Input placeholder="https://..." value={lessonForm.pdfUrl} onChange={e => setLessonForm({...lessonForm, pdfUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Session Title</Label>
                    <Input placeholder="Introduction to..." value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="h-12 rounded-xl text-slate-900" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Description</Label>
                    <Textarea className="min-h-[80px] rounded-xl text-slate-900" placeholder="Session breakdown..." value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold flex gap-2 transition-all active:scale-95 shadow-lg shadow-primary/10">
                    <Save size={18} /> Publish Session
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
                <PlayerIcon className="h-5 w-5 text-primary" /> Published Sessions
              </h3>
              <div className="space-y-3">
                {lessonsLoading ? (
                  <div className="text-center py-10 text-slate-400">Syncing content...</div>
                ) : lessons?.filter(l => courses?.some(c => c.id === l.courseId)).map((l: any) => {
                  const course = courses?.find(c => c.id === l.courseId);
                  return (
                    <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800">
                          <Image 
                            src={l.thumbnailUrl || `https://picsum.photos/seed/${l.id}/200/120`}
                            alt={l.title || "Thumbnail"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{l.title || `Day ${l.dayNumber}`}</h4>
                             {course && <span className="text-[9px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-black uppercase whitespace-nowrap">{course.title}</span>}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">Day {l.dayNumber} • {l.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400" onClick={() => {
                          const url = `${window.location.origin}/lesson/${l.dayNumber}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Session Link Copied", description: "Share this link with your enrolled students." });
                        }}>
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

      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="rounded-3xl max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Program Configuration</DialogTitle>
            <DialogDescription>Manage content, assign co-admins, and enroll students for this program session.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-8 text-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Program Title</Label>
                    <Input 
                      value={editFields.title} 
                      onChange={(e) => setEditFields({...editFields, title: e.target.value})}
                      className="rounded-xl h-12 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Program Description</Label>
                    <Textarea 
                      value={editFields.description} 
                      onChange={(e) => setEditFields({...editFields, description: e.target.value})}
                      className="rounded-xl min-h-[120px] text-slate-900"
                    />
                  </div>
                </div>

                <Card className="border shadow-none rounded-2xl bg-white dark:bg-slate-900">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users size={18} className="text-primary" /> Student Enrollment
                    </CardTitle>
                    <CardDescription className="text-xs">Add students to this program folder. They will only see this session.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-4 space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="student@email.com" 
                        value={enrollmentEmail}
                        onChange={(e) => setEnrollmentEmail(e.target.value)}
                        className="rounded-xl h-11 text-slate-900"
                      />
                      <Button onClick={handleEnrollStudent} disabled={enrolling} className="rounded-xl h-11 px-4">
                        {enrolling ? "..." : "Enroll"}
                      </Button>
                    </div>
                    
                    <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto pr-2">
                      {editFields.studentIds.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-4 border border-dashed rounded-lg font-bold">
                          No students enrolled yet.
                        </div>
                      ) : editFields.studentIds.map(sid => (
                        <div key={sid} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border group">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">ID: {sid.substring(0, 8)}...</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeStudent(sid)}
                            className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-full"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Thumbnail Link</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={editFields.imageUrl} 
                      onChange={(e) => setEditFields({...editFields, imageUrl: e.target.value})}
                      className="rounded-xl h-12 pl-10 text-slate-900"
                    />
                  </div>
                </div>
                
                <Card className="border shadow-none rounded-2xl bg-slate-50/50 dark:bg-slate-950/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" /> Admin Assignment
                    </CardTitle>
                    <CardDescription className="text-[10px]">Invite co-admins to help manage this program.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3 mt-2">
                      {adminUsers.filter(u => u.email !== MAIN_ADMIN_EMAIL).length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-4 bg-white dark:bg-slate-900 rounded-lg border border-dashed font-bold">
                          Register an Admin in the Register Member dialog first.
                        </div>
                      ) : adminUsers.filter(u => u.email !== MAIN_ADMIN_EMAIL).map((u: any) => (
                        <div key={u.uid} className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border">
                          <Checkbox 
                            id={`admin-${u.uid}`} 
                            checked={editFields.adminIds.includes(u.uid)}
                            onCheckedChange={() => toggleAdminAssignment(u.uid)}
                            className="rounded-md"
                          />
                          <Label htmlFor={`admin-${u.uid}`} className="flex flex-col cursor-pointer">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">{u.displayName}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{u.email}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {!isMainAdmin && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900 flex gap-3">
                    <ShieldAlert size={20} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      As a Sub Admin, you can enroll students and assign co-admins to help you with this session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setEditingProgram(null)} className="rounded-xl h-12 font-bold flex-1">Discard</Button>
            <Button onClick={handleUpdateProgram} className="rounded-xl h-12 font-bold bg-primary text-white flex-1 shadow-lg shadow-primary/20 transition-all active:scale-95">Save Config</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
