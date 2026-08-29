import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DASHBOARD } from '@/constants/testIds';
import { KanbanSquare, Plus, ArrowUpRight, ListTodo, Loader2, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const { workspaces, openCreateWorkspace } = useOutletContext();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaces || workspaces.length === 0) { setAllTasks([]); setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.all(workspaces.map(w => api.get(`/workspaces/${w.id}/tasks`).then(r=>r.data).catch(()=>[])));
      setAllTasks(results.flat());
    } finally { setLoading(false); }
  }, [workspaces]);

  useEffect(()=>{ load(); }, [load]);

  const stats = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter(t=>t.status==='todo').length,
    inProgress: allTasks.filter(t=>t.status==='in_progress').length,
    done: allTasks.filter(t=>t.status==='done').length,
  }), [allTasks]);

  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return allTasks.filter(t=>t.status!=='done' && t.due_date && t.due_date<today);
  }, [allTasks]);

  return <div data-testid={DASHBOARD.root} className="p-8 lg:p-12 max-w-[1400px]">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
      <div><p className="tab-label text-[#FF4500]">Command Center</p><h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2 uppercase leading-[0.9]">Dashboard</h1><p className="text-neutral-600 mt-3 text-sm max-w-xl">Every task across every workspace. Track velocity, spot blockers, ship on time.</p></div>
      <button data-testid={DASHBOARD.createWorkspaceBtn} onClick={openCreateWorkspace} className="bg-[#0A0A0A] text-white font-bold uppercase tracking-wider py-3 px-5 border border-neutral-900 brutal-shadow hover:bg-[#FF4500] flex items-center gap-2 transition-transform"><Plus size={18} strokeWidth={3}/>New workspace</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger-in">
      <StatCard testid={DASHBOARD.statTotal} label="Total Tasks" value={stats.total} accent="#0A0A0A" icon={<ListTodo size={20}/>}/>
      <StatCard testid={DASHBOARD.statTodo} label="To Do" value={stats.todo} accent="#525252"/>
      <StatCard testid={DASHBOARD.statInProgress} label="In Progress" value={stats.inProgress} accent="#007AFF" icon={<Loader2 size={20}/>}/>
      <StatCard testid={DASHBOARD.statDone} label="Completed" value={stats.done} accent="#00C853" icon={<CheckCircle2 size={20}/>}/>
    </div>
    {overdue.length>0 && <div className="mt-10 border-2 border-[#FF3B30] bg-[#FFF5F4] p-5"><p className="tab-label text-[#FF3B30]">Attention Required</p><h3 className="font-display font-bold text-xl mt-1">{overdue.length} overdue task{overdue.length>1?'s':''}</h3><ul className="mt-3 divide-y divide-neutral-200">{overdue.slice(0,4).map(t=><li key={t.id} className="py-2 flex items-center justify-between text-sm"><span className="truncate">{t.title}</span><span className="font-mono text-xs text-[#FF3B30]">{t.due_date}</span></li>)}</ul></div>}
    <section className="mt-14">
      <div className="mb-6"><p className="tab-label text-neutral-500">Workspaces</p><h2 className="font-display font-black text-3xl sm:text-4xl tracking-tighter mt-1">Your boards</h2></div>
      {loading ? <p className="text-sm text-neutral-500">Loading…</p> : workspaces.length===0 ? <div className="brutal-card p-10 text-center"><KanbanSquare size={40} className="mx-auto text-[#FF4500]"/><h3 className="font-display font-bold text-xl mt-3">No workspaces yet</h3><p className="text-sm text-neutral-600 mt-1">Create your first workspace to start shipping.</p><button onClick={openCreateWorkspace} className="mt-5 bg-[#FF4500] text-white font-bold uppercase tracking-wider py-2 px-4 border border-neutral-900 brutal-shadow-sm">Create workspace</button></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-in">{workspaces.map(w=>{const wt=allTasks.filter(t=>t.workspace_id===w.id);const done=wt.filter(t=>t.status==='done').length;const pct=wt.length?Math.round(done/wt.length*100):0;return <Link key={w.id} to={`/board/${w.id}`} data-testid={DASHBOARD.workspaceCard} className="brutal-card p-6 group"><div className="flex items-start justify-between"><div className="min-w-0"><p className="tab-label text-[#FF4500]">{wt.length} tasks</p><h3 className="font-display font-bold text-2xl mt-1 truncate">{w.name}</h3>{w.description&&<p className="text-sm text-neutral-600 mt-1 line-clamp-2">{w.description}</p>}</div><ArrowUpRight size={22}/></div><div className="mt-6"><div className="flex justify-between text-xs mb-2"><span className="tab-label text-neutral-500">Progress</span><span className="font-mono">{pct}%</span></div><div className="h-2 bg-neutral-200 border border-neutral-900"><div className="h-full bg-[#FF4500]" style={{width:`${pct}%`}}/></div></div></Link>})}</div>}
    </section>
  </div>;
}
function StatCard({label,value,accent,icon,testid}){return <div data-testid={testid} className="brutal-card p-5 flex flex-col justify-between min-h-[140px]"><div className="flex items-center justify-between"><p className="tab-label text-neutral-500">{label}</p>{icon&&<span style={{color:accent}}>{icon}</span>}</div><p className="font-display font-black text-5xl lg:text-6xl tracking-tighter" style={{color:accent}}>{value}</p></div>}
