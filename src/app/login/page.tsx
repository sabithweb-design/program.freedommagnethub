
"use client";

import { useState, Suspense } from "react";
import { 
  signInWithEmailAndPassword
} from "firebase/auth";
import { useAuth as useFirebaseAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Mail, Lock, ShieldAlert, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useFirebaseAuth();
  const searchParams = useSearchParams();
  
  const redirectPath = searchParams.get('redirect');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      if (redirectPath) {
        router.push(redirectPath);
      } else if (email === "admin@freedommagnethub.com") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please check your credentials.",
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
            freedom<span className="text-primary">magnethub</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Access Your Training Sessions</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pt-8 pb-6 text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Account Login</CardTitle>
            <CardDescription className="text-slate-400">Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600 ml-1 font-bold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary text-slate-900 font-medium" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600 ml-1 font-bold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary text-slate-900 font-medium" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base mt-2 shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Login to Hub"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 pt-2 flex flex-col gap-4">
            <div className="w-full h-px bg-slate-100" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldAlert size={14} className="text-primary" />
              Secure Data Protection Active
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
