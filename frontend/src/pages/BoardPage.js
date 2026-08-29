import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { BOARD, WORKSPACE } from '@/constants/testIds';
import { Plus, Users, UserPlus } from 'lucide-react';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, closestCorners } from '@dnd-kit/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import TaskModal from '@/components/TaskModal';

const COLUMNS = [
  { key: 'todo', title: 'To Do', accent: '#525252' },
  { key: 'in_progress', title: 'In Progress', accent: '#007AFF' },
  { key: 'done', title: 'Done', accent: '#00C853' },
];

const PRIORITY_COLORS = {
  low: '#94A3B8',
  medium: '#FFB300',
  high: '#FF7A00',
  urgent: '#FF3B30',
};

function TaskCard({ task, members, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  const assignee = members.find(m => m.id === task.assignee_id);
  const style = { opacity: isDragging ? 0.4 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={BOARD.card(task.id)}
      onClick={onClick}
      className="brutal-card p-4 cursor-grab active:cursor-grabbing select-none touch-none"
    >
      <div className="flex items-start gap-2 justify-between">
        <p className="font-semibold text-sm leading-snug flex-1">{task.title}</p>
        <span
          className="tab-label px-1.5 py-0.5 text-white shrink-0"
          style={{ background: PRIORITY_COLORS[task.priority] || '#94A3B8' }}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{task.description}</p>
      )}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {task.labels.map((l) => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 font-medium">
              #{l}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between">
        {task.due_date ? (
          <span className={`text-xs font-mono ${new Date(task.due_date) < new Date(new Date().toISOString().slice(0,10)) && task.status !== 'done' ? 'text-[#FF3B30] font-bold' : 'text-neutral-500'}`}>
            {task.due_date}
          </span>
        ) : <span />}
        {assignee ? (
          <span
            title={assignee.name}
            className="w-7 h-7 flex items-center justify-center text-white font-bold text-xs border border-neutral-900"
            style={{ background: assignee.avatar_color || '#FF4500' }}
          >
            {assignee.name?.[0]?.toUpperCase()}
          </span>
        ) : (
          <span className="w-7 h-7 flex items-center justify-center text-neutral-400 border border-dashed border-neutral-400 text-xs">?</span>
        )}
      </div>
    </div>
  );
}

function Column({ col, tasks, members, onOpenTask, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      data-testid={BOARD.column(col.key)}
      className={`min-w-[320px] max-w-[340px] flex-1 bg-neutral-50 border border-neutral-300 p-4 flex flex-col gap-3 ${isOver ? 'ring-2 ring-[#FF4500]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3" style={{ background: col.accent }} />
          <h3 className="font-display font-bold text-lg uppercase tracking-tight">{col.title}</h3>
          <span className="tab-label bg-white border border-neutral-900 px-2 py-0.5">{tasks.length}</span>
        </div>
        {col.key === 'todo' && (
          <button
            onClick={() => onAddTask(col.key)}
            className="w-7 h-7 flex items-center justify-center border border-neutral-900 hover:bg-[#FF4500] hover:text-white"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 min-h-[80px]">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} members={members} onClick={() => onOpenTask(t)} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-neutral-400 text-center py-6 border border-dashed border-neutral-300">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const { refreshWorkspaces } = useOutletContext();

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    try {
      const [wsRes, tasksRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/workspaces/${workspaceId}/tasks`),
      ]);
      setWorkspace(wsRes.data);
      setMembers(wsRes.data.members || []);
      setTasks(tasksRes.data);
    } catch (e) { toast.error(apiError(e)); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe((msg) => {
      if (msg.type === 'task_created' && msg.data.workspace_id === workspaceId) {
        setTasks((prev) => prev.some(t => t.id === msg.data.id) ? prev : [msg.data, ...prev]);
      } else if (msg.type === 'task_updated' && msg.data.workspace_id === workspaceId) {
        setTasks((prev) => prev.map((t) => t.id === msg.data.id ? msg.data : t));
        setOpenTask((cur) => cur && cur.id === msg.data.id ? msg.data : cur);
      } else if (msg.type === 'task_deleted' && msg.data.workspace_id === workspaceId) {
        setTasks((prev) => prev.filter((t) => t.id !== msg.data.id));
        setOpenTask((cur) => cur && cur.id === msg.data.id ? null : cur);
      }
    });
  }, [subscribe, workspaceId]);

  const tasksByStatus = useMemo(() => {
    const out = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => { (out[t.status] || out.todo).push(t); });
    return out;
  }, [tasks]);

  const activeTask = tasks.find(t => t.id === activeId);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const newStatus = over.id;
    const task = tasks.find(t => t.id === active.id);
    if (!task || task.status === newStatus) return;
    // Optimistic
    setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch (e) {
      toast.error(apiError(e));
      setTasks((prev) => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const openCreate = (status = 'todo') => {
    setOpenTask({ __new: true, status, priority: 'medium', labels: [], workspace_id: workspaceId });
  };

  const invite = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail });
      setMembers((prev) => [...prev, data.member]);
      setInviteEmail('');
      setInviteOpen(false);
      toast.success('Member added');
      refreshWorkspaces?.();
    } catch (e) { toast.error(apiError(e)); }
  };

  if (!workspace) return <div className="p-10 text-neutral-500">Loading workspace…</div>;

  return (
    <div data-testid={BOARD.root} className="p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="tab-label text-[#FF4500]">Workspace</p>
          <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-1 uppercase">{workspace.name}</h1>
          {workspace.description && <p className="text-neutral-600 mt-2 max-w-2xl text-sm">{workspace.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="w-9 h-9 flex items-center justify-center text-white font-bold text-sm border-2 border-white ring-1 ring-neutral-900"
                style={{ background: m.avatar_color || '#FF4500' }}
              >
                {m.name?.[0]?.toUpperCase()}
              </span>
            ))}
            {members.length > 5 && (
              <span className="w-9 h-9 flex items-center justify-center text-xs font-bold bg-neutral-200 border-2 border-white ring-1 ring-neutral-900">
                +{members.length - 5}
              </span>
            )}
          </div>
          <button
            data-testid={WORKSPACE.inviteBtn}
            onClick={() => setInviteOpen(true)}
            className="border border-neutral-900 py-2 px-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:bg-neutral-900 hover:text-white"
          >
            <UserPlus size={16} /> Invite
          </button>
          <button
            data-testid={BOARD.addTaskBtn}
            onClick={() => openCreate('todo')}
            className="bg-[#FF4500] text-white font-bold uppercase tracking-wider py-2 px-4 border border-neutral-900 brutal-shadow hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2 transition-transform"
          >
            <Plus size={18} strokeWidth={3} /> New task
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-8">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              tasks={tasksByStatus[col.key] || []}
              members={members}
              onOpenTask={setOpenTask}
              onAddTask={openCreate}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="brutal-card p-4 rotate-2 shadow-[12px_12px_0px_0px_rgba(10,10,10,1)] w-[300px]">
              <p className="font-semibold text-sm">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskModal
          task={openTask}
          members={members}
          workspaceId={workspaceId}
          onClose={() => setOpenTask(null)}
          onSaved={(t) => {
            setTasks((prev) => {
              const exists = prev.some(x => x.id === t.id);
              return exists ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev];
            });
            setOpenTask(t);
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter(x => x.id !== id));
            setOpenTask(null);
          }}
        />
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl tracking-tighter uppercase">Invite member</DialogTitle>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div>
              <label className="tab-label block mb-2">User email</label>
              <input
                data-testid={WORKSPACE.inviteInput}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-neutral-900 bg-white px-4 py-3 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500]"
                placeholder="teammate@work.com"
              />
              <p className="text-xs text-neutral-500 mt-2">User must already have a TaskFlow account.</p>
            </div>
            <button
              data-testid={WORKSPACE.inviteSubmit}
              type="submit"
              className="w-full bg-[#FF4500] text-white font-bold uppercase tracking-wider py-3 border border-neutral-900 brutal-shadow-sm"
            >
              Add member
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
