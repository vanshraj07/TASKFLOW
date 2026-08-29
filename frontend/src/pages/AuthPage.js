import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AUTH } from '@/constants/testIds';
import { Zap, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const { login, register, error, setError } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    if (mode === 'login') await login(email, password);
    else await register(email, password, name);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex">
      <div className="hidden lg:flex flex-col justify-between w-[46%] bg-[#0A0A0A] text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF4500] flex items-center justify-center brutal-shadow-sm"><Zap size={20} strokeWidth={3} color="#fff" /></div>
          <span className="font-display font-black text-2xl tracking-tighter">TASKFLOW</span>
        </div>
        <div className="relative z-10">
          <p className="tab-label text-[#FF4500]">Command Center</p>
          <h1 className="font-display font-black tracking-tighter text-6xl xl:text-7xl leading-[0.95] mt-4">Ship work.<br/><span className="text-[#FF4500]">Not meetings.</span></h1>
          <p className="text-neutral-400 mt-6 max-w-md text-base">A tactical task tracker for teams that move fast. Kanban boards, live sync, comments and priorities — engineered for velocity.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {[['12x','Faster stand-ups'],['0ms','Realtime sync'],['∞','Focus modes']].map(([n,l]) => (
            <div key={l} className="border border-neutral-800 p-4"><p className="font-display font-black text-3xl">{n}</p><p className="tab-label text-neutral-500 mt-1">{l}</p></div>
          ))}
        </div>
        <div aria-hidden className="absolute -right-24 top-1/2 -translate-y-1/2 w-[560px] h-[560px] border border-neutral-800 rotate-45" />
        <div aria-hidden className="absolute -right-8 top-1/4 w-[240px] h-[240px] bg-[#FF4500]/10 rotate-12" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#FDFDFD]">
        <div className="w-full max-w-md">
          <p className="tab-label text-[#FF4500]">{mode === 'login' ? 'Welcome Back' : 'Get Started'}</p>
          <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-2">{mode === 'login' ? 'Sign in.' : 'Create account.'}</h2>
          <p className="text-neutral-600 mt-3 text-sm">{mode === 'login' ? 'Enter your credentials to continue.' : 'Start organizing your team in seconds.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'register' && <div><label className="tab-label block mb-2">Name</label><input data-testid={AUTH.nameInput} value={name} onChange={e=>setName(e.target.value)} required className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]" placeholder="Jane Chen" /></div>}
            <div><label className="tab-label block mb-2">Email</label><input data-testid={AUTH.emailInput} type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]" placeholder="you@work.com" /></div>
            <div><label className="tab-label block mb-2">Password</label><input data-testid={AUTH.passwordInput} type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]" placeholder="At least 6 characters" /></div>
            {error && <p data-testid={AUTH.errorMsg} className="text-sm text-[#FF3B30] border border-[#FF3B30] px-3 py-2">{error}</p>}
            <button data-testid={AUTH.submitBtn} type="submit" disabled={loading} className="w-full bg-[#0A0A0A] text-white font-bold uppercase tracking-wider py-3 px-4 border border-neutral-900 brutal-shadow hover:bg-[#FF4500] hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform disabled:opacity-60 flex items-center justify-center gap-2">{loading ? 'Loading…' : (mode === 'login' ? 'Sign in' : 'Create account')}<ArrowRight size={18} strokeWidth={3} /></button>
          </form>
          <div className="mt-6 text-sm text-neutral-600">{mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}<button data-testid={AUTH.toggleModeBtn} className="font-bold text-[#FF4500] underline underline-offset-4" onClick={()=>{setError('');setMode(mode==='login'?'register':'login')}}>{mode === 'login' ? 'Create one' : 'Sign in'}</button></div>
          <p className="text-xs text-neutral-500 mt-8 border-t border-neutral-200 pt-4">Demo credentials are configured through the backend environment.</p>
        </div>
      </div>
    </div>
  );
}
