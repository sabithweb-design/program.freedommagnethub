
'use client';

import { useState, useMemo } from 'react';
import { collection, query, updateDoc, doc, addDoc, setDoc, serverTimestamp, orderBy, deleteDoc, where, getDocs, writeBatch } from 'firebase/firestore';
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
  Star, 
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  FolderOpen,
  Info,
  Video,
  Filter,
  AlertTriangle
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
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('courses');
  const [lessonFilter, setLessonFilter] = useState('all');

  const isMainAdmin = currentUser?.email === MAIN_ADMIN_EMAIL;

  const usersQuery = useMemo(() => {
    if (!firestore || authLoading || !isAdmin) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin, authLoading]);
  
  const coursesQuery = useMemo(() => {
    if (!firestore || authLoading || !currentUser || !isAdmin) return null;
    if (isMainAdmin) {
      return query(collection(firestore, 'courses'));
    }
    return query(collection(firestore, 'courses'), where('adminIds', 'array-contains', currentUser.uid));
  }, [firestore, currentUser, isMainAdmin, isAdmin, authLoading]);

  const lessonsQuery = useMemo(() => {
    if (!firestore || authLoading || !currentUser || !isAdmin) return null;
    if (lessonFilter !== 'all') {
      return query(collection(firestore, 'lessons'), where('courseId', '==', lessonFilter), orderBy('dayNumber', 'asc'));
    }
    return query(collection(firestore, 'lessons'), orderBy('dayNumber', 'asc'));
  }, [firestore, lessonFilter, currentUser, isAdmin, authLoading]);

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
    vimeoUrl: '',
    thumbnailUrl: '', 
    pdfUrl: '', 
    driveUrl: '',
    courseId: '',
    actionPlan: '' 
  });
  const [newUserForm, setNewUserForm] = useState({ displayName: '', email: '', password: '', role: 'student' as 'student' | 'admin' });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // User Edit State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({ displayName: '', email: '', role: 'student' as 'student' | 'admin' });

  // Lesson Edit State
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [editLessonFields, setEditLessonFields] = useState({
    title: '',
    description: '',
    dayNumber: 1,
    youtubeUrl: '',
    vimeoUrl: '',
    thumbnailUrl: '',
    pdfUrl: '',
    driveUrl: '',
    actionPlan: ''
  });

  // Delete Confirmation State
  const [deleteConfirmType, setDeleteConfirmType] = useState<'member' | 'program' | 'lesson' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [enrollmentEmail, setEnrollmentEmail] = useState('');
  const [enrollmentPassword, setEnrollmentPassword] = useState('');
  const [showEnrollPassword, setShowEnrollPassword] = useState(false);
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

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'student'
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingUser) return;

    const userRef = doc(firestore, 'users', editingUser.id);
    const updateData = {
      displayName: editUserForm.displayName,
      email: editUserForm.email,
      role: editUserForm.role
    };

    updateDoc(userRef, updateData)
      .then(() => {
        toast({ title: "Profile Updated", description: "Member details have been successfully changed." });
        setEditingUser(null);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: userRef.path, 
          operation: 'update', 
          requestResourceData: updateData 
        }));
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

      const roleToAssign = isMainAdmin ? newUserForm.role : 'student';

      const userProfile = {
        uid,
        displayName: newUserForm.displayName,
        email: newUserForm.email,
        role: roleToAssign,
        status: true,
        cohortStartDate: serverTimestamp()
      };

      await setDoc(doc(firestore, 'users', uid), userProfile);
      await signOut(secondaryAuth);

      toast({
        title: "Account Registered",
        description: `${newUserForm.displayName} now has ${roleToAssign} access.`,
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
      
      let studentUid = '';

      if (snap.empty) {
        if (!enrollmentPassword) {
          toast({ variant: "destructive", title: "New Member Detected", description: "Please provide a password to register this new student." });
          setEnrolling(false);
          return;
        }

        try {
          const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
          const secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, enrollmentEmail, enrollmentPassword);
          studentUid = userCredential.user.uid;

          const userProfile = {
            uid: studentUid,
            displayName: enrollmentEmail.split('@')[0],
            email: enrollmentEmail,
            role: 'student',
            status: true,
            cohortStartDate: serverTimestamp()
          };

          await setDoc(doc(firestore, 'users', studentUid), userProfile);
          await signOut(secondaryAuth);
          toast({ title: "Account Created", description: `Registered ${enrollmentEmail} as a new student.` });
        } catch (regErr: any) {
          toast({ variant: "destructive", title: "Registration Error", description: regErr.message });
          setEnrolling(false);
          return;
        }
      } else {
        studentUid = snap.docs[0].id;
      }

      if (editFields.studentIds.includes(studentUid)) {
        toast({ title: "Already Enrolled", description: "This user is already a member of this program." });
        return;
      }

      const newStudentIds = [...editFields.studentIds, studentUid];
      setEditFields({ ...editFields, studentIds: newStudentIds });
      setEnrollmentEmail('');
      setEnrollmentPassword('');
      toast({ title: "Member Added", description: "Successfully enrolled user in the program track." });
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
    if (!firestore || !currentUser) return;

    const newCourseData = {
      ...courseForm,
      title: courseForm.title || "Untitled Program",
      price: Number(courseForm.price),
      originalPrice: Number(courseForm.originalPrice),
      rating: Number(courseForm.rating),
      reviewCount: Number(courseForm.reviewCount),
      videos: "0",
      progress: 0,
      isLocked: false,
      adminIds: [currentUser.uid], 
      studentIds: [],
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'courses'), newCourseData).then((docRef) => {
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
      setLessonFilter(docRef.id);
      setActiveTab('courses');
      toast({ title: "Program Created", description: "Successfully added a new training program folder." });
    }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courses', operation: 'create', requestResourceData: newCourseData }));
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
        toast({ title: "Program Updated", description: "The program configuration has been saved." });
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

  const performDeletion = async () => {
    if (!firestore || !deleteTargetId || !deleteConfirmType) return;
    setIsDeleting(true);

    try {
      if (deleteConfirmType === 'program') {
        const q = query(collection(firestore, 'lessons'), where('courseId', '==', deleteTargetId));
        const lessonSnaps = await getDocs(q);
        const batch = writeBatch(firestore);
        lessonSnaps.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(firestore, 'courses', deleteTargetId));
        await batch.commit();
        if (lessonFilter === deleteTargetId) setLessonFilter('all');
        toast({ title: "Program Deleted", description: "The program and all its content have been removed." });
      } else if (deleteConfirmType === 'member') {
        await deleteDoc(doc(firestore, 'users', deleteTargetId));
        toast({ title: "Member Removed", description: "The profile has been permanently deleted." });
      } else if (deleteConfirmType === 'lesson') {
        await deleteDoc(doc(firestore, 'lessons', deleteTargetId));
        toast({ title: "Session Removed", description: "The session has been deleted." });
      }
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: `${deleteConfirmType === 'program' ? 'courses' : deleteConfirmType === 'member' ? 'users' : 'lessons'}/${deleteTargetId}`, 
        operation: 'delete'
      }));
    } finally {
      setIsDeleting(false);
      setDeleteConfirmType(null);
      setDeleteTargetId(null);
    }
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
      driveUrl: lessonForm.driveUrl || '',
      isLocked: false,
      createdAt: serverTimestamp()
    };

    addDoc(collection(firestore, 'lessons'), lessonData).then(() => {
      setLessonForm({ ...lessonForm, title: '', description: '', dayNumber: lessonForm.dayNumber + 1, youtubeUrl: '', vimeoUrl: '', thumbnailUrl: '', pdfUrl: '', driveUrl: '', actionPlan: '' });
      setLessonFilter(lessonForm.courseId);
      toast({ title: "Lesson Published", description: `Session Day ${lessonData.dayNumber} is now live.` });
    }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'lessons', operation: 'create', requestResourceData: lessonData }));
    });
  };

  const handleOpenEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setEditLessonFields({
      title: lesson.title || '',
      description: lesson.description || '',
      dayNumber: lesson.dayNumber || 1,
      youtubeUrl: lesson.youtubeVideoId ? `https://youtube.com/watch?v=${lesson.youtubeVideoId}` : '',
      vimeoUrl: lesson.vimeoVideoId ? `https://vimeo.com/${lesson.vimeoVideoId}` : '',
      thumbnailUrl: lesson.thumbnailUrl || '',
      pdfUrl: lesson.pdfUrl || '',
      driveUrl: lesson.driveUrl || '',
      actionPlan: lesson.actionPlan || ''
    });
  };

  const handleUpdateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingLesson) return;

    const lessonRef = doc(firestore, 'lessons', editingLesson.id);
    const updateData = {
      title: editLessonFields.title,
      description: editLessonFields.description,
      dayNumber: Number(editLessonFields.dayNumber),
      youtubeVideoId: extractYoutubeId(editLessonFields.youtubeUrl),
      vimeoVideoId: extractVimeoId(editLessonFields.vimeoUrl),
      thumbnailUrl: editLessonFields.thumbnailUrl,
      pdfUrl: editLessonFields.pdfUrl,
      driveUrl: editLessonFields.driveUrl,
      actionPlan: editLessonFields.actionPlan
    };

    updateDoc(lessonRef, updateData)
      .then(() => {
        toast({ title: "Lesson Updated", description: "The content session has been successfully modified." });
        setEditingLesson(null);
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: lessonRef.path, 
          operation: 'update', 
          requestResourceData: updateData 
        }));
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
  
  const filteredLessons = useMemo(() => {
    if (!lessons || !courses) return [];
    
    return lessons.filter(l => {
      const managedCourse = courses.find(c => c.id === l.courseId);
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
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-12 px-6 flex gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all">
              <UserPlus size={18} /> Register Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle>Register Account</DialogTitle>
              <DialogDescription>Create a student account for your hub.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold">Full Name</Label>
                <Input value={newUserForm.displayName} onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})} placeholder="Name" required className="rounded-xl h-12 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Email Address</Label>
                <Input type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} placeholder="your@email.com" required className="rounded-xl h-12 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Password</Label>
                <div className="relative">
                  <Input type={showRegPassword ? "text" : "password"} value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} placeholder="••••••••" required className="rounded-xl h-12 pr-11 text-slate-900" />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
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
                    {isMainAdmin && <SelectItem value="admin">Admin (Co-Admin Access)</SelectItem>}
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
          {isMainAdmin && (
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <CardTitle>Member Directory</CardTitle>
                <CardDescription>Main Admin view of all registered platform accounts.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="pl-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Name & Email</TableHead>
                      <TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Role</TableHead>
                      <TableHead className="h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                      <TableHead className="text-right pr-6 h-14 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest">Actions</TableHead>
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
                          {u.email !== MAIN_ADMIN_EMAIL && (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 hover:text-primary transition-all" onClick={() => handleOpenEditUser(u)}>
                                <Edit2 size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 hover:text-red-500 transition-all" onClick={() => { setDeleteTargetId(u.id); setDeleteConfirmType('member'); }}>
                                <Trash2 size={14} />
                              </Button>
                              <div className="flex items-center gap-2 ml-2">
                                <Switch checked={u.status !== false} onCheckedChange={() => handleToggleUserStatus(u.id, u.status !== false)} className="data-[state=checked]:bg-emerald-500 scale-75" />
                              </div>
                            </div>
                          )}
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="text-primary" /> Create Program
                </CardTitle>
                <CardDescription>Initialize a new program track folder.</CardDescription>
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

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
                <FolderOpen size={18} className="text-primary" /> {isMainAdmin ? "Full Program Portfolio" : "My Managed Programs"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesLoading ? (
                  Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white dark:bg-slate-900 animate-pulse rounded-2xl" />)
                ) : courses && courses.length > 0 ? courses.map((c: any) => (
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
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-all" onClick={() => { 
                        setEditingProgram(c); 
                        setEditFields({ 
                          title: c.title || '', description: c.description || '', category: c.category || '', imageUrl: c.imageUrl || '', author: c.author || '', price: c.price || 0, originalPrice: c.originalPrice || 0, rating: c.rating || 4.5, reviewCount: c.reviewCount || 0, adminIds: c.adminIds || [], studentIds: c.studentIds || []
                        }); 
                      }}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-all" onClick={() => { setDeleteTargetId(c.id); setDeleteConfirmType('program'); }}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card>
                )) : (
                  <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-bold">No programs assigned to your profile yet.</p>
                  </div>
                )}
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
                <CardDescription>Upload video sessions to your program folders.</CardDescription>
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
                      <Label className="font-bold text-xs uppercase tracking-tight text-slate-500">YouTube URL</Label>
                      <Input placeholder="YouTube Link" value={lessonForm.youtubeUrl} onChange={e => setLessonForm({...lessonForm, youtubeUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2 text-xs uppercase tracking-tight text-slate-500">
                      <Video size={14} className="text-primary" /> Vimeo URL
                    </Label>
                    <Input placeholder="Vimeo Link" value={lessonForm.vimeoUrl} onChange={e => setLessonForm({...lessonForm, vimeoUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Resources PDF</Label>
                      <Input placeholder="https://..." value={lessonForm.pdfUrl} onChange={e => setLessonForm({...lessonForm, pdfUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Drive Link</Label>
                      <Input placeholder="Google Drive URL" value={lessonForm.driveUrl} onChange={e => setLessonForm({...lessonForm, driveUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
                    </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <PlayerIcon className="h-5 w-5 text-primary" /> Published Sessions
                </h3>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Filter size={16} className="text-slate-400" />
                  <Select value={lessonFilter} onValueChange={setLessonFilter}>
                    <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracks</SelectItem>
                      {courses?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {lessonsLoading || coursesLoading ? (
                  <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2 animate-pulse">
                    <PlayerIcon className="h-10 w-10 text-slate-200" />
                    <p className="font-bold">Syncing content portfolio...</p>
                  </div>
                ) : filteredLessons.length > 0 ? filteredLessons.map((l: any) => {
                  const course = courses?.find(c => c.id === l.courseId);
                  return (
                    <Card key={l.id} className="border-none shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border dark:border-slate-800">
                          <Image src={l.thumbnailUrl || `https://picsum.photos/seed/${l.id}/200/120`} alt={l.title || "Thumbnail"} fill className="object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{l.title || `Day ${l.dayNumber}`}</h4>
                             {course && <span className="text-[9px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-black uppercase whitespace-nowrap">{course.title}</span>}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">Day {l.dayNumber} • {l.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-primary" onClick={() => handleOpenEditLesson(l)}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400" onClick={() => {
                          const url = `${window.location.origin}/lesson/${l.dayNumber}?courseId=${l.courseId}`;
                          navigator.clipboard.text(url);
                          toast({ title: "Session Link Copied", description: "Share this link with your enrolled students." });
                        }}>
                          <Share2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-red-500" onClick={() => { setDeleteTargetId(l.id); setDeleteConfirmType('lesson'); }}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </Card>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed text-slate-400 space-y-4">
                    <Info size={32} />
                    <p className="font-bold">No sessions found in this track.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={!!deleteConfirmType} onOpenChange={(open) => !open && setDeleteConfirmType(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="text-red-500 h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black">Confirm Deletion</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              {deleteConfirmType === 'program' ? "Are you sure? This will permanently delete the program and all its sessions." : 
               deleteConfirmType === 'member' ? "Are you sure? This will permanently delete this member's profile." : 
               "Are you sure you want to remove this session?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 mt-4">
            <Button onClick={performDeletion} disabled={isDeleting} className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold">
              {isDeleting ? "Processing..." : "Confirm & Delete"}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteConfirmType(null)} className="w-full h-12 rounded-xl font-bold">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="rounded-3xl max-md">
          <DialogHeader>
            <DialogTitle>Edit Member Details</DialogTitle>
            <DialogDescription>Update the profile information for this member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Full Name</Label>
              <Input value={editUserForm.displayName} onChange={e => setEditUserForm({...editUserForm, displayName: e.target.value})} placeholder="Name" required className="rounded-xl h-12 text-slate-900" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Email Address</Label>
              <Input type="email" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} placeholder="your@email.com" required className="rounded-xl h-12 text-slate-900" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Role</Label>
              <Select value={editUserForm.role} onValueChange={(val: any) => setEditUserForm({...editUserForm, role: val})}>
                <SelectTrigger className="h-12 rounded-xl text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student (Hub Access)</SelectItem>
                  <SelectItem value="admin">Admin (Co-Admin Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="rounded-xl h-12 font-bold">Cancel</Button>
              <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-slate-900 dark:bg-slate-100 dark:text-slate-900">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Edit Dialog */}
      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content Session</DialogTitle>
            <DialogDescription>Modify the details and resources for this lesson.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLesson} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Session Day #</Label>
                <Input type="number" min="1" max="90" value={editLessonFields.dayNumber} onChange={e => setEditLessonFields({...editLessonFields, dayNumber: Number(e.target.value)})} required className="h-12 rounded-xl text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">YouTube URL</Label>
                <Input placeholder="YouTube Link" value={editLessonFields.youtubeUrl} onChange={e => setEditLessonFields({...editLessonFields, youtubeUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Vimeo URL</Label>
              <Input placeholder="Vimeo Link" value={editLessonFields.vimeoUrl} onChange={e => setEditLessonFields({...editLessonFields, vimeoUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">PDF Resource</Label>
                <Input placeholder="https://..." value={editLessonFields.pdfUrl} onChange={e => setEditLessonFields({...editLessonFields, pdfUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Drive Resource</Label>
                <Input placeholder="Google Drive Link" value={editLessonFields.driveUrl} onChange={e => setEditLessonFields({...editLessonFields, driveUrl: e.target.value})} className="h-12 rounded-xl text-slate-900" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Session Title</Label>
              <Input value={editLessonFields.title} onChange={e => setEditLessonFields({...editLessonFields, title: e.target.value})} required className="h-12 rounded-xl text-slate-900" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Description</Label>
              <Textarea value={editLessonFields.description} onChange={e => setEditLessonFields({...editLessonFields, description: e.target.value})} className="min-h-[100px] rounded-xl text-slate-900" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Action Plan</Label>
              <Textarea value={editLessonFields.actionPlan} onChange={e => setEditLessonFields({...editLessonFields, actionPlan: e.target.value})} className="min-h-[100px] rounded-xl text-slate-900" />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingLesson(null)} className="rounded-xl h-12 font-bold">Cancel</Button>
              <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-primary text-white">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Config Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="rounded-3xl max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Program Configuration</DialogTitle>
            <DialogDescription>Manage content and enroll students for this program session.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-8 text-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Program Title</Label>
                    <Input value={editFields.title} onChange={(e) => setEditFields({...editFields, title: e.target.value})} className="rounded-xl h-12 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Program Description</Label>
                    <Textarea value={editFields.description} onChange={(e) => setEditFields({...editFields, description: e.target.value})} className="rounded-xl min-h-[120px] text-slate-900" />
                  </div>
                </div>

                <Card className="border shadow-none rounded-2xl bg-white dark:bg-slate-900">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users size={18} className="text-primary" /> Student Enrollment
                    </CardTitle>
                    <CardDescription className="text-xs">Add students. Provide a password to register new members.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-4 space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Email Address</Label>
                        <Input placeholder="student@email.com" value={enrollmentEmail} onChange={(e) => setEnrollmentEmail(e.target.value)} className="rounded-xl h-11 text-slate-900" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Password (For new members)</Label>
                        <div className="relative">
                          <Input type={showEnrollPassword ? "text" : "password"} placeholder="Set student password" value={enrollmentPassword} onChange={(e) => setEnrollmentPassword(e.target.value)} className="rounded-xl h-11 text-slate-900 pr-10" />
                          <button type="button" onClick={() => setShowEnrollPassword(!showEnrollPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showEnrollPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <Button onClick={handleEnrollStudent} disabled={enrolling} className="w-full rounded-xl h-11 font-bold mt-2">
                        {enrolling ? "Syncing..." : "Register & Enroll"}
                      </Button>
                    </div>
                    <div className="space-y-2 mt-6 max-h-[200px] overflow-y-auto pr-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Enrolled Members ({editFields.studentIds.length})</Label>
                      {editFields.studentIds.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-4 border border-dashed rounded-lg font-bold">No students enrolled yet.</div>
                      ) : editFields.studentIds.map(sid => {
                        const student = users?.find(u => u.uid === sid);
                        return (
                          <div key={sid} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border group">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300">{student?.displayName || sid.substring(0, 8)}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{student?.email || 'ID: ' + sid.substring(0, 6)}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeStudent(sid)} className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-full">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-500">Thumbnail Link</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={editFields.imageUrl} onChange={(e) => setEditFields({...editFields, imageUrl: e.target.value})} className="rounded-xl h-12 pl-10 text-slate-900" />
                  </div>
                </div>
                {isMainAdmin && (
                  <Card className="border shadow-none rounded-2xl bg-slate-50/50 dark:bg-slate-950/50">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary" /> Sub Admin Assignment
                      </CardTitle>
                      <CardDescription className="text-[10px]">Invite other admins to help manage this program session.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-3 mt-2">
                        {adminUsers.filter(u => u.email !== MAIN_ADMIN_EMAIL).length === 0 ? (
                          <div className="text-[10px] text-slate-400 text-center py-4 bg-white dark:bg-slate-900 rounded-lg border border-dashed font-bold">No other sub admins registered.</div>
                        ) : adminUsers.filter(u => u.email !== MAIN_ADMIN_EMAIL).map((u: any) => (
                          <div key={u.uid} className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border">
                            <Checkbox id={`admin-${u.uid}`} checked={editFields.adminIds.includes(u.uid)} onCheckedChange={() => toggleAdminAssignment(u.uid)} className="rounded-md" />
                            <Label htmlFor={`admin-${u.uid}`} className="flex flex-col cursor-pointer">
                              <span className="text-sm font-black text-slate-700 dark:text-slate-300">{u.displayName}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{u.email}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setEditingProgram(null)} className="rounded-xl h-12 font-bold flex-1">Discard</Button>
            <Button onClick={handleUpdateProgram} className="rounded-xl h-12 font-bold bg-primary text-white flex-1 shadow-lg shadow-primary/20 transition-all active:scale-95">Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
