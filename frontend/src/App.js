import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import BoardPage from '@/pages/BoardPage';
import AppShell from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function LoadingScreen(){return <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFDFD]"><div className="font-display font-black text-3xl tracking-tighter animate-pulse">TASKFLOW</div></div>;}
function Protected({children}){const {user}=useAuth();if(user===undefined)return <LoadingScreen/>;if(user===null)return <Navigate to="/login" replace/>;return children;}
function PublicOnly({children}){const {user}=useAuth();if(user===undefined)return <LoadingScreen/>;if(user)return <Navigate to="/dashboard" replace/>;return children;}
function AppRoutes(){return <Routes><Route path="/login" element={<PublicOnly><AuthPage/></PublicOnly>}/><Route element={<Protected><RealtimeProvider><AppShell/></RealtimeProvider></Protected>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/board/:workspaceId" element={<BoardPage/>}/></Route><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>;}
export default function App(){return <div className="App"><BrowserRouter><AuthProvider><AppRoutes/><Toaster position="top-right"/></AuthProvider></BrowserRouter></div>;}
