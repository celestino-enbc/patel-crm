import nodemailer from "nodemailer";
import type { AssigneeKind, ClientKind, TaskStatus } from "@/lib/types";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Falta configuración SMTP. Define SMTP_HOST, SMTP_USER y SMTP_PASS."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function fromAddress() {
  const email = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  const name = process.env.EMAIL_FROM_NAME ?? "Patel CRM";
  if (!email) {
    throw new Error("Falta EMAIL_FROM o SMTP_USER para el remitente.");
  }
  return `"${name}" <${email}>`;
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fffaf3;border:1px solid #e7dcc8;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#1f2933;color:#f8f1e3;">
                <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">Patel CRM</p>
                <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#3f3a32;font-size:15px;line-height:1.6;">
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendMail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
  });
}

function hubNotifyEmail(hubEmail: string | null): string | null {
  return hubEmail || process.env.NOTIFY_VISOR_EMAIL || null;
}

function counterpartEmail(input: {
  actorKind: ClientKind;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
}): string | null {
  if (input.actorKind === "hub") {
    return input.clientNotifyEmail;
  }
  return hubNotifyEmail(input.hubNotifyEmail);
}

export async function notifyNewTask(input: {
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
  const to = counterpartEmail(input);
  if (!to) return;

  const assigneeLabel = input.assigneeKind === "hub" ? "Visor" : input.clientName;

  await sendMail(
    to,
    `Nueva petición (${input.clientName}): ${input.title}`,
    wrapHtml(
      "Nueva petición registrada",
      `<p><strong>${input.actorName}</strong> (${input.actorClientName}) creó una petición para <strong>${input.clientName}</strong>.</p>
       <p><strong>Título:</strong> ${input.title}<br/>
       <strong>Categoría:</strong> ${input.categoryName}<br/>
       <strong>Responsable:</strong> ${assigneeLabel}</p>
       <p>Revísala en el tablero Kanban de Patel CRM.</p>`
    )
  );
}

export async function notifyStatusChange(input: {
  title: string;
  status: TaskStatus;
  actorName: string;
  actorKind: ClientKind;
  actorClientName: string;
  clientName: string;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
}) {
  if (input.status !== "en_revision" && input.status !== "hecho") return;

  const to = counterpartEmail(input);
  if (!to) return;

  const statusLabel = input.status === "en_revision" ? "En revisión" : "Hecho";

  await sendMail(
    to,
    `Estado actualizado (${statusLabel}) · ${input.clientName}: ${input.title}`,
    wrapHtml(
      `La petición pasó a «${statusLabel}»`,
      `<p><strong>${input.actorName}</strong> (${input.actorClientName}) actualizó una petición de <strong>${input.clientName}</strong>:</p>
       <p><strong>${input.title}</strong></p>
       <p>Nuevo estado: <strong>${statusLabel}</strong>.</p>`
    )
  );
}

export async function notifyNewComment(input: {
  title: string;
  comment: string;
  actorName: string;
  actorKind: ClientKind;
  actorClientName: string;
  clientName: string;
  clientNotifyEmail: string | null;
  hubNotifyEmail: string | null;
}) {
  const to = counterpartEmail(input);
  if (!to) return;

  await sendMail(
    to,
    `Nuevo comentario · ${input.clientName}: ${input.title}`,
    wrapHtml(
      "Nuevo comentario en una petición",
      `<p><strong>${input.actorName}</strong> (${input.actorClientName}) comentó en una petición de <strong>${input.clientName}</strong>:</p>
       <p><strong>${input.title}</strong></p>
       <blockquote style="margin:16px 0;padding:12px 16px;background:#f3eee4;border-left:3px solid #c4b39a;">${input.comment}</blockquote>`
    )
  );
}
