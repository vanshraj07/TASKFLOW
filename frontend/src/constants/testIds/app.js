export const SHELL = {
  sidebar: 'app-sidebar',
  navDashboard: 'nav-dashboard',
  navBoard: 'nav-board',
  logoutBtn: 'logout-btn',
  notificationsBtn: 'notifications-btn',
  notificationsPanel: 'notifications-panel',
  markAllReadBtn: 'mark-all-read-btn',
  userMenu: 'user-menu',
  workspaceSwitcher: 'workspace-switcher',
};

export const DASHBOARD = {
  root: 'dashboard-root',
  statTotal: 'stat-total',
  statTodo: 'stat-todo',
  statInProgress: 'stat-inprogress',
  statDone: 'stat-done',
  createWorkspaceBtn: 'create-workspace-btn',
  workspaceCard: 'workspace-card',
};

export const WORKSPACE = {
  createDialog: 'create-workspace-dialog',
  nameInput: 'workspace-name-input',
  descInput: 'workspace-desc-input',
  submitBtn: 'workspace-submit-btn',
  inviteBtn: 'workspace-invite-btn',
  inviteInput: 'workspace-invite-input',
  inviteSubmit: 'workspace-invite-submit',
};

export const BOARD = {
  root: 'board-root',
  addTaskBtn: 'add-task-btn',
  column: (status) => `board-column-${status}`,
  card: (id) => `task-card-${id}`,
};

export const TASK_MODAL = {
  root: 'task-modal-root',
  titleInput: 'task-title-input',
  descInput: 'task-desc-input',
  prioritySelect: 'task-priority-select',
  statusSelect: 'task-status-select',
  assigneeSelect: 'task-assignee-select',
  dueDatePicker: 'task-due-date-picker',
  labelInput: 'task-label-input',
  addLabelBtn: 'task-add-label-btn',
  saveBtn: 'task-save-btn',
  deleteBtn: 'task-delete-btn',
  commentInput: 'task-comment-input',
  commentSubmit: 'task-comment-submit',
};
