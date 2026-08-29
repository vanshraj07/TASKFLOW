import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { api, apiError } from '@/lib/api';
import { SHELL, WORKSPACE } from '@/constants/testIds';
import { Zap, LayoutDashboard, KanbanSquare, Bell, LogOut, Plus, Users, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return d.toLocaleDateString();
  } catch { return ''; }
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { subscribe, connected } = useRealtime();
  const nav = useNavigate();
  const { workspaceId } = useParams();

  const [workspaces, setWorkspaces] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
    } catch (e) { toast.error(apiError(e)); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadWorkspaces(); loadNotifications(); }, [loadWorkspaces, loadNotifications]);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe((msg) => {
      if (msg.type === 'notification') {
        setNotifications((prev) => [msg.data, ...prev]);
        toast(msg.data.message);
      }
    });
  }, [subscribe]);

  const unread = notifications.filter((n) => !n.read).length;

  const createWorkspace = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/workspaces', { name: wsName, description: wsDesc });
      setWorkspaces((prev) => [...prev, data]);
      setShowCreate(false);
      setWsName(''); setWsDesc('');
      toast.success('Workspace created');
      nav(`/board/${data.id}`);
    } catch (e) { toast.error(apiError(e)); }
    setCreating(false);
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 border border-transparent text-sm font-medium ${
      isActive ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'text-neutral-700 hover:border-[#0A0A0A] hover:bg-white'
    }`;

  return (
    <div className="min-h-screen flex bg-[#FDFDFD]">
      {/* Sidebar */}
      <aside data-testid={SHELL.sidebar} className="w-64 shrink-0 border-r border-neutral-900 bg-[#FAFAFA] flex flex-col">
        <div className="p-6 border-b border-neutral-900 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FF4500] flex items-center justify-center brutal-shadow-sm">
            <Zap size={18} strokeWidth={3} color="#fff" />
          </div>
          <div>
            <p className="font-display font-black text-lg tracking-tighter leading-none">TASKFLOW</p>
            <p className="tab-label text-neutral-500 mt-1">v1.0</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <p className="tab-label text-neutral-500 px-3 pt-2 pb-2">Overview</p>
          <NavLink data-testid={SHELL.navDashboard} to="/dashboard" className={navLinkCls} end>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          {workspaceId && (
            <NavLink data-testid={SHELL.navBoard} to={`/board/${workspaceId}`} className={navLinkCls}>
              <KanbanSquare size={18} /> Board
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-b border-neutral-200 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="tab-label text-neutral-500">Workspaces</p>
            <button
              data-testid={SHELL.workspaceSwitcher}
              onClick={() => setShowCreate(true)}
              className="w-6 h-6 flex items-center justify-center border border-neutral-900 hover:bg-[#FF4500] hover:text-white"
              aria-label="Create workspace"
            >
              <Plus size={14} />
            </button>
          </div>
          <ul className="space-y-1">
            {workspaces.map((w) => (
              <li key={w.id}>
                <NavLink
                  to={`/board/${w.id}`}
                  className={({isActive}) => `block px-3 py-2 text-sm border-l-2 ${isActive ? 'border-[#FF4500] bg-white font-semibold' : 'border-transparent text-neutral-700 hover:bg-white'}`}
                >
                  <span className="flex items-center gap-2">
                    <Circle size={8} className="fill-current" />
                    <span className="truncate">{w.name}</span>
                  </span>
                </NavLink>
              </li>
            ))}
            {workspaces.length === 0 && (
              <li className="text-xs text-neutral-500 px-3">No workspaces yet</li>
            )}
          </ul>
        </div>

        <div className="p-4 border-t border-neutral-900">
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00C853]' : 'bg-neutral-400'}`} />
            {connected ? 'Live sync on' : 'Reconnecting…'}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="h-16 border-b border-neutral-900 bg-white/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
          <div>
            <p className="tab-label text-neutral-500">Signed in as</p>
            <p className="font-display font-bold text-base leading-none mt-1">{user?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  data-testid={SHELL.notificationsBtn}
                  className="relative w-10 h-10 flex items-center justify-center border border-neutral-900 hover:bg-[#FF4500] hover:text-white"
                >
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-[#FF4500] text-white text-[10px] font-bold flex items-center justify-center border border-neutral-900">
                      {unread}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                data-testid={SHELL.notificationsPanel}
                align="end"
                sideOffset={8}
                className="w-96 p-0 rounded-none border-2 border-neutral-900 brutal-shadow-lg bg-white"
              >
                <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
                  <p className="font-display font-bold text-lg">NOTIFICATIONS</p>
                  <button
                    data-testid={SHELL.markAllReadBtn}
                    onClick={markAllRead}
                    className="tab-label text-neutral-600 hover:text-[#FF4500]"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="p-6 text-sm text-neutral-500 text-center">All caught up.</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { markRead(n.id); if (n.workspace_id) nav(`/board/${n.workspace_id}`); }}
                      className={`w-full text-left px-4 py-3 border-b border-neutral-200 hover:bg-neutral-100 flex gap-3 ${n.read ? 'opacity-60' : ''}`}
                    >
                      <span className={`mt-1.5 w-2 h-2 shrink-0 ${n.read ? 'bg-neutral-300' : 'bg-[#FF4500]'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-900 truncate">{n.message}</p>
                        <p className="text-xs text-neutral-500 mt-1">{fmtTime(n.created_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={SHELL.userMenu}
                  className="flex items-center gap-2 pr-3 pl-1 py-1 border border-neutral-900 hover:bg-neutral-100"
                >
                  <span
                    className="w-8 h-8 flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: user?.avatar_color || '#FF4500' }}
                  >
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline">{user?.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none border-2 border-neutral-900 brutal-shadow-sm">
                <DropdownMenuLabel className="font-display">{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid={SHELL.logoutBtn} onClick={() => { logout(); nav('/login'); }}>
                  <LogOut size={14} className="mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Outlet context={{ workspaces, refreshWorkspaces: loadWorkspaces, openCreateWorkspace: () => setShowCreate(true) }} />
        </div>
      </main>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent data-testid={WORKSPACE.createDialog}>
          <DialogClose onClose={() => setShowCreate(false)} />
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl tracking-tighter uppercase">New Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div>
              <label className="tab-label block mb-2">Name</label>
              <input
                data-testid={WORKSPACE.nameInput}
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                required
                autoFocus
                className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]"
                placeholder="e.g. Q1 Launch"
              />
            </div>
            <div>
              <label className="tab-label block mb-2">Description</label>
              <textarea
                data-testid={WORKSPACE.descInput}
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                rows={3}
                className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]"
                placeholder="Optional"
              />
            </div>
            <button
              data-testid={WORKSPACE.submitBtn}
              type="submit"
              disabled={creating}
              className="w-full bg-[#FF4500] text-white font-bold uppercase tracking-wider py-3 border border-neutral-900 brutal-shadow hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 transition-transform"
            >
              {creating ? 'Creating…' : 'Create workspace'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
