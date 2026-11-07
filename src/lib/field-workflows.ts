import { apiUrl } from "@/lib/api";

export type FieldWorkflowPayload = Record<string, unknown>;
export type IntegrationResult = { accepted: boolean; reference?: string; status?: string };

export type DiagnosticPrediction = {
  label: string;
  confidence: number;
};

export type DiagnosticInferenceProvider = {
  predict: (image: Blob) => Promise<DiagnosticPrediction[]>;
};

// Set an actual browser/server inference provider here when a model endpoint is deployed.
export const diagnosticInferenceProvider: DiagnosticInferenceProvider | null = null;

const reportEndpoint = import.meta.env["VITE_SURVEILLANCE_API_PATH"];
const advisoryEndpoint = import.meta.env["VITE_ADVISORY_API_PATH"];
const notificationEndpoint = import.meta.env["VITE_NOTIFICATION_API_PATH"];

async function postConfigured(endpoint: string | undefined, payload: FieldWorkflowPayload): Promise<IntegrationResult> {
  if (!endpoint) throw new Error("This service is not configured. Your information has not been submitted to the server.");
  const response = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`The server rejected the request (${response.status}).`);
  return (await response.json()) as IntegrationResult;
}

export const submitSurveillanceReport = (payload: FieldWorkflowPayload) => postConfigured(reportEndpoint, payload);
export const saveAdvisory = (payload: FieldWorkflowPayload) => postConfigured(advisoryEndpoint, payload);

export type NotificationChannel = "email" | "sms" | "in-app";
export type NotificationProvider = {
  channel: NotificationChannel;
  send: (recipient: string, message: string) => Promise<void>;
};

export async function notify(channel: NotificationChannel, recipient: string, message: string) {
  if (!notificationEndpoint) throw new Error(`No ${channel} notification provider is configured; no notification was sent.`);
  const response = await fetch(apiUrl(notificationEndpoint), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ channel, recipient, message }),
  });
  if (!response.ok) throw new Error(`Notification service returned ${response.status}; delivery is unconfirmed.`);
}

export function saveLocalDraft(key: string, draft: FieldWorkflowPayload) {
  const drafts = JSON.parse(localStorage.getItem(key) || "[]") as FieldWorkflowPayload[];
  const updated = [draft, ...drafts.filter((item) => item["localId"] !== draft["localId"])];
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function readLocalDrafts<T extends FieldWorkflowPayload>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}
