"use client";

import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  sendSignInLinkToEmail 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, Sparkles, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (email === "admin@freedommagnethub.com") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login/finish`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      toast({
        title: "Magic Link Sent",
        description: "Check your email to sign in to Freedom Magnet Hub.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] p-4 font-body">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-xl shadow-primary/20">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            freedommagnet<span className="text-primary">hub</span>
          </h1>
          <p className="text-slate-500 font-medium">90-Day Elite Teacher Training</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="pt-8 pb-6 text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400">Choose your entry method</CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <Tabs defaultValue="password">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-50 p-1 rounded-2xl h-12">
                <TabsTrigger value="password" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Password</TabsTrigger>
                <TabsTrigger value="magic" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Magic Link</TabsTrigger>
              </TabsList>
              
              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-600 ml-1">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-300" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="admin@freedommagnethub.com" 
                        className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-600 ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-300" />
                      <Input 
                        id="password" 
                        type="password" 
                        className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base mt-2 shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email" className="text-slate-600 ml-1">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-300" />
                      <Input 
                        id="magic-email" 
                        type="email" 
                        placeholder="teacher@school.edu" 
                        className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" className="w-full h-12 rounded-xl font-bold text-base mt-2 bg-slate-900 text-white hover:bg-slate-800" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Magic Link"}
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-slate-400 mt-6 leading-relaxed">
                    We'll email you a secure link to log in instantly.<br/>No password required.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="pb-8 pt-2 flex flex-col gap-4">
            <div className="w-full h-px bg-slate-100" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldAlert size={14} className="text-primary" />
              Secure Access Guaranteed
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
