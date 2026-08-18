"use client";

import { markOpsAlertRead } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import type { OpsAlert } from "@/lib/types";

export function OpsAlertsBanner({ alerts }: { alerts: OpsAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-semibold">Alertas operativas (Visor)</p>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                {alert.kind}
              </span>
              {" · "}
              {alert.message}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void markOpsAlertRead(alert.id);
              }}
            >
              Ok
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
