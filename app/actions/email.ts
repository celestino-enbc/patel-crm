"use server";

import {
  notifyNewComment,
  notifyNewTask,
  notifyStatusChange,
} from "@/lib/email";
import type { AssigneeKind, ClientKind, TaskStatus } from "@/lib/types";

export async function sendTaskCreatedEmail(input: {
  title: string;
  assigneeKind: AssigneeKind;
  actorName: string;
  actorKind: ClientKind;
  actorClientName: string;
  clientName: string;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
  categoryName: string;
}) {
  await notifyNewTask(input);
}

export async function sendStatusChangedEmail(input: {
  title: string;
  status: TaskStatus;
  actorName: string;
  actorKind: ClientKind;
  actorClientName: string;
  clientName: string;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
}) {
  await notifyStatusChange(input);
}

export async function sendCommentEmail(input: {
  title: string;
  comment: string;
  actorName: string;
  actorKind: ClientKind;
  actorClientName: string;
  clientName: string;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
}) {
  await notifyNewComment(input);
}
