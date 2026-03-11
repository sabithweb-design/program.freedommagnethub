
"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateLessonDescription } from "@/ai/flows/generate-lesson-description";
import { Wand2, Save, PlusCircle, ShieldAlert, Youtube } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [lessonForm, setLessonForm] = useState({
    dayNumber: 1,
    title: "",
    description: "",
    youtubeVideoId: "",
    initialContent: ""
  });

  const handleGenerateDescription = async () => {
    if (!lessonForm.title) {
      toast({ variant: "destructive", title: "Missing Title", description: "Please enter a title before generating a description." });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateLessonDescription({
        title: lessonForm.title,
        initialContent: lessonForm.initialContent
      });
      setLessonForm(prev => ({ ...prev, description: result.description }));
      toast({ title: "Description Generated", description: "AI has crafted a lesson summary for you." });
    } catch (error) {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate description. Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, "lessons"), {
        dayNumber: lessonForm.dayNumber,
        title: lessonForm.title,
        description: lessonForm.description,
        youtubeVideoId: lessonForm.youtubeVideoId,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Lesson Saved", description: `Day ${lessonForm.dayNumber} has been successfully added.` });
      // Reset for next entry
      setLessonForm(prev => ({ 
        ...prev, 
        dayNumber: prev.dayNumber + 1, 
        title: "", 
        description: "", 
        youtubeVideoId: "",
        initialContent: "" 
      }));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShieldAlert size={64} className="text-destructive mb-4" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must be an administrator to view this page.</p>
        <Button className="mt-6" onClick={() => window.location.href = "/"}>Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Curriculum Manager</h1>
            <p className="text-muted-foreground">All lessons are available to students immediately after publishing.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="text-primary" />
              Add Lesson
            </CardTitle>
            <CardDescription>Publish a new lesson to the 90-day curriculum</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveLesson} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayNumber">Day Number (1-90)</Label>
                  <Input 
                    id="dayNumber" 
                    type="number" 
                    min="1" max="90" 
                    value={lessonForm.dayNumber}
                    onChange={e => setLessonForm({...lessonForm, dayNumber: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Lesson Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Building Rapport with Students" 
                    value={lessonForm.title}
                    onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeVideoId" className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube Video ID
                </Label>
                <Input 
                  id="youtubeVideoId" 
                  placeholder="e.g. dQw4w9WgXcQ (The ID part after v=)" 
                  value={lessonForm.youtubeVideoId}
                  onChange={e => setLessonForm({...lessonForm, youtubeVideoId: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialContent">Context for AI (Optional)</Label>
                <Textarea 
                  id="initialContent" 
                  placeholder="Provide key points or a rough draft for AI to expand upon..." 
                  value={lessonForm.initialContent}
                  onChange={e => setLessonForm({...lessonForm, initialContent: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description">Full Lesson Description</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateDescription}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "AI Working..." : "Expand with AI"}
                    <Wand2 className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <Textarea 
                  id="description" 
                  className="min-h-[200px]"
                  placeholder="Rich content students will read below the video..." 
                  value={lessonForm.description}
                  onChange={e => setLessonForm({...lessonForm, description: e.target.value})}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Publishing..." : "Publish Lesson"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
