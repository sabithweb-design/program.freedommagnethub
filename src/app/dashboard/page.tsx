'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  author: string;
  category: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  thumbnailUrl: string;
  userId: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  // Stabilize the query reference to avoid infinite re-renders
  const coursesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'courses'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: courses, loading: coursesLoading, error } = useCollection<Course>(coursesQuery);

  if (authLoading || coursesLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center py-20">
        <h2 className="text-xl font-bold text-destructive">Unable to load courses</h2>
        <p className="text-muted-foreground">Please try refreshing the page later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-background">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-primary">My Learning</h1>
          <p className="text-muted-foreground">Track your progress and continue your journey.</p>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-muted/30">
          <CardHeader>
            <CardTitle>No courses found</CardTitle>
            <CardDescription>You haven't enrolled in any training modules yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress = course.lessonsTotal > 0 
              ? Math.round((course.lessonsCompleted / course.lessonsTotal) * 100) 
              : 0;

            return (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 border-none shadow-sm overflow-hidden bg-card">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={course.thumbnailUrl || 'https://picsum.photos/seed/course/600/400'} 
                    alt={course.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2">
                    <div className="bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {course.category}
                    </div>
                  </div>
                </div>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription>By {course.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary">{progress}% Complete</span>
                      <span className="text-muted-foreground">{course.lessonsCompleted}/{course.lessonsTotal} Lessons</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
