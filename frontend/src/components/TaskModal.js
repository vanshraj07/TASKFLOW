import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TASK_MODAL } from '@/constants/testIds';
import { CalendarIcon, X, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#94A3B8' },
  { value: 'medium', label: 'Medium', color: '#FFB300' },
  { value: 'high', label: 'High', color: '#FF7A00' },
  { value: 'urgent', label: 'Urgent', color: '#FF3B30' },
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskModal({ task, members, workspaceId, onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const isNew = !!task.__new;
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    labels: task.labels || [],
    due_date: task.due_date || '',
    assignee_id: task.assignee_id || '',
  });
  const [labelInput, setLabelInput] = useState('');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      labels: task.labels || [],
      due_date: task.due_date || '',
      assignee_id: task.assignee_id || '',
    });
  }, [task.id]);

  const loadComments = useCallback(async () => {
    if (isNew || !task.id) return;
    try {
      const { data } = await api.get(`/tasks/${task.id}/comments`);
      setComments(data);
    } catch { /* ignore */ }
  }, [task.id, isNew]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const addLabel = () => {
    const l = labelInput.trim();
    if (!l) return;
    if (form.labels.includes(l)) { setLabelInput(''); return; }
    update('labels', [...form.labels, l]);
    setLabelInput('');
  };

  const removeLabel = (l) => update('labels', form.labels.filter(x => x !== l));

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
      };
      let data;
      if (isNew) {
        ({ data } = await api.post('/tasks', { workspace_id: workspaceId, ...payload }));
        toast.success('Task created');
      } else {
        ({ data } = await api.patch(`/tasks/${task.id}`, payload));
        toast.success('Task updated');
      }
      onSaved(data);
    } catch (e) { toast.error(apiError(e)); }
    setSaving(false);
  };

  const remove = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success('Task deleted');
      onDeleted(task.id);
    } catch (e) { toast.error(apiError(e)); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isNew) return;
    try {
      const { data } = await api.post(`/tasks/${task.id}/comments`, { body: commentText });
      setComments((prev) => [...prev, data]);
      setCommentText('');
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid={TASK_MODAL.root}
        className="max-w-3xl p-0 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="p-6 pb-4 border-b border-neutral-900">
          <DialogTitle asChild>
            <input
              data-testid={TASK_MODAL.titleInput}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Task title…"
              className="font-display font-black text-2xl sm:text-3xl tracking-tighter w-full bg-transparent border-0 outline-none focus:ring-0 p-0"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-5 gap-0">
          {/* Left: description + comments */}
          <div className="md:col-span-3 p-6 space-y-6 border-r border-neutral-200">
            <div>
              <label className="tab-label block mb-2">Description</label>
              <textarea
                data-testid={TASK_MODAL.descInput}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder="Add more detail…"
                className="w-full border border-neutral-900 bg-white px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm"
              />
            </div>

            <div>
              <label className="tab-label block mb-2">Labels</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.labels.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-neutral-900 bg-neutral-100">
                    #{l}
                    <button onClick={() => removeLabel(l)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  data-testid={TASK_MODAL.labelInput}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                  placeholder="Add label"
                  className="flex-1 border border-neutral-900 bg-white px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm"
                />
                <button
                  data-testid={TASK_MODAL.addLabelBtn}
                  onClick={addLabel}
                  className="px-3 py-2 border border-neutral-900 text-sm font-bold uppercase hover:bg-neutral-900 hover:text-white"
                >
                  Add
                </button>
              </div>
            </div>

            {!isNew && (
              <div>
                <label className="tab-label block mb-3">Comments ({comments.length})</label>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <span
                        className="w-8 h-8 shrink-0 flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: c.author_color || '#FF4500' }}
                      >{c.author_name?.[0]?.toUpperCase()}</span>
                      <div className="min-w-0 flex-1 border border-neutral-300 bg-neutral-50 p-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">{c.author_name}</span>
                          <span className="text-neutral-500 font-mono">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-xs text-neutral-500">Be the first to comment.</p>}
                </div>
                <form onSubmit={submitComment} className="mt-3 flex gap-2">
                  <input
                    data-testid={TASK_MODAL.commentInput}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 border border-neutral-900 bg-white px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm"
                  />
                  <button
                    data-testid={TASK_MODAL.commentSubmit}
                    type="submit"
                    className="px-3 py-2 border border-neutral-900 bg-[#0A0A0A] text-white font-bold text-sm flex items-center gap-1 hover:bg-[#FF4500]"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right: meta */}
          <div className="md:col-span-2 p-6 space-y-5 bg-neutral-50/70">
            <div>
              <label className="tab-label block mb-2">Status</label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger data-testid={TASK_MODAL.statusSelect} className="rounded-none border-neutral-900 focus:ring-[#FF4500]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-neutral-900">
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="tab-label block mb-2">Priority</label>
              <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                <SelectTrigger data-testid={TASK_MODAL.prioritySelect} className="rounded-none border-neutral-900 focus:ring-[#FF4500]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-neutral-900">
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2" style={{ background: p.color }} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="tab-label block mb-2">Assignee</label>
              <Select value={form.assignee_id || 'unassigned'} onValueChange={(v) => update('assignee_id', v === 'unassigned' ? '' : v)}>
                <SelectTrigger data-testid={TASK_MODAL.assigneeSelect} className="rounded-none border-neutral-900 focus:ring-[#FF4500]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-neutral-900">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="tab-label block mb-2">Due date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    data-testid={TASK_MODAL.dueDatePicker}
                    className="w-full border border-neutral-900 bg-white px-3 py-2 text-sm flex items-center justify-between hover:bg-neutral-100"
                  >
                    <span className={form.due_date ? '' : 'text-neutral-500'}>
                      {form.due_date || 'Pick a date'}
                    </span>
                    <CalendarIcon size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="rounded-none border-2 border-neutral-900 brutal-shadow-sm p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.due_date ? new Date(form.due_date) : undefined}
                    onSelect={(d) => update('due_date', d ? d.toISOString().slice(0,10) : '')}
                    initialFocus
                  />
                  {form.due_date && (
                    <div className="p-2 border-t border-neutral-900">
                      <button
                        onClick={() => update('due_date', '')}
                        className="text-xs text-[#FF3B30] font-bold uppercase"
                      >Clear</button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-900 bg-white flex items-center justify-between">
          <div>
            {!isNew && (
              <button
                data-testid={TASK_MODAL.deleteBtn}
                onClick={remove}
                className="border border-[#FF3B30] text-[#FF3B30] px-3 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[#FF3B30] hover:text-white flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="border border-neutral-900 px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              data-testid={TASK_MODAL.saveBtn}
              onClick={save}
              disabled={saving}
              className="bg-[#FF4500] text-white font-bold uppercase tracking-wider py-2 px-5 border border-neutral-900 brutal-shadow-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : (isNew ? 'Create task' : 'Save changes')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
