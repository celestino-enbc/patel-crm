export const TASK_STATUSES = [
  "solicitado",
  "en_revision",
  "hecho",
  "quitar",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CLIENT_KINDS = ["hub", "client"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const ASSIGNEE_KINDS = ["hub", "client"] as const;
export type AssigneeKind = (typeof ASSIGNEE_KINDS)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Client {
  id: string;
  name: string;
  slug: string;
  kind: ClientKind;
  notify_email: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  client: Client;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  archived_at: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface CommentAuthor {
  id: string;
  full_name: string;
  email: string;
  client_id: string;
  client: Pick<Client, "id" | "name" | "slug" | "kind">;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: CommentAuthor;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category_id: string;
  client_id: string;
  status: TaskStatus;
  assignee_kind: AssigneeKind;
  priority: TaskPriority;
  due_date: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  category: Category;
  client: Pick<Client, "id" | "name" | "slug" | "kind">;
  creator: CommentAuthor;
  attachments: TaskAttachment[];
  comments: Comment[];
  comment_count: number;
  attachment_count: number;
}

export interface TaskBoardItem {
  id: string;
  title: string;
  description: string;
  category_id: string;
  client_id: string;
  status: TaskStatus;
  assignee_kind: AssigneeKind;
  priority: TaskPriority;
  due_date: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  category: Pick<Category, "id" | "name" | "slug">;
  client: Pick<Client, "id" | "name" | "slug" | "kind">;
  comment_count: number;
  attachment_count: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  categoryId: string;
  clientId: string;
  assigneeKind: AssigneeKind;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  assigneeKind: AssigneeKind;
  priority: TaskPriority;
  dueDate?: string | null;
}

export interface CreateClientInput {
  name: string;
  notifyEmail?: string;
}

export interface UpdateClientInput {
  id: string;
  name: string;
  notifyEmail?: string;
}

export interface OpsAlert {
  id: string;
  kind: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

export function isHubProfile(profile: Pick<Profile, "client">): boolean {
  return profile.client.kind === "hub";
}

export function slugifyClientName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
