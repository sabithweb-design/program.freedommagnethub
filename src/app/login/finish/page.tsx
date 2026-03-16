
'use client';

import { useEffect, useState } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinishSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useFirebaseAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }

        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            setStatus('success');
            toast({
              title: "Welcome back!",
              description: "You've successfully signed in with your magic link.",
            });
            router.push('/dashboard');
          } catch (error: any) {
            console.error('Error signing in with email link:', error);
            setStatus('error');
            setErrorMessage(error.message || 'The magic link may have expired or already been used.');
            toast({
              variant: "destructive",
              title: "Sign-in Failed",
              description: error.message,
            });
          }
        } else {
          setStatus('error');
          setErrorMessage('Email address is required to complete the sign-in.');
        }
      } else {
        router.push('/login');
      }
    };

    completeSignIn();
  }, [router, toast, auth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF5] p-4 font-body">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="relative w-16 h-16 mx-auto">
              <Loader2 className="h-16 w-16 animate-spin text-[#F28C7F]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-[#F28C7F]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Verifying your link...</h1>
            <p className="text-slate-500">Almost there! We're confirming your credentials and preparing your dashboard.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Authentication Error</h1>
            <p className="text-slate-500">{errorMessage}</p>
            <Button 
              className="mt-4 rounded-full px-8 bg-[#F28C7F] hover:bg-[#F28C7F]/90"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Sign-in Successful!</h1>
            <p className="text-slate-500">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
