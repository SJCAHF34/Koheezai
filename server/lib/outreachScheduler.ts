import cron from "node-cron";
import { storage } from "../storage";
import { sendSms } from "./clerkchatClient";
import { sendEmail } from "./outlookClient";
import type { RetentionPatient } from "@shared/schema";

const DAY1_SMS = "This is AHF Pharmacy. Please call us at your earliest convenience regarding your prescription. Reply STOP to opt out.";
const DAY3_SMS = "Reminder from AHF Pharmacy. Please contact us today regarding your prescription. Reply STOP to opt out.";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / 86400000);
}

async function processPatient(patient: RetentionPatient): Promise<void> {
  const today = todayISO();

  let daysSinceLast: number;
  if (patient.sequenceDay === 0) {
    // Day 1 is always eligible as soon as outreach is enabled
    daysSinceLast = 1;
  } else {
    if (!patient.lastOutreachDate) return;
    daysSinceLast = daysBetween(patient.lastOutreachDate, today);
  }

  if (daysSinceLast < 1) return;

  const nextDay = patient.sequenceDay + 1;
  let sent = false;

  try {
    if (nextDay === 1) {
      // Step 1: Primary SMS
      if (!patient.phone1) {
        console.log(`[Outreach] Patient ${patient.id} skipped Day 1 — no phone1`);
        return;
      }
      sent = await sendSms(patient.phone1, DAY1_SMS);
    } else if (nextDay === 2) {
      // Step 2: Email
      if (!patient.email) {
        console.log(`[Outreach] Patient ${patient.id} skipped Day 2 — no email`);
        return;
      }
      sent = await sendEmail(
        patient.email,
        "AHF Pharmacy — Prescription Follow-Up",
        "Dear Patient,\n\nThis is AHF Pharmacy following up regarding your prescription. Please contact us at your earliest convenience so we can assist you.\n\nThis message is sent via encrypted delivery per our privacy policy.\n\nThank you,\nAHF Pharmacy Team"
      );
    } else if (nextDay === 3) {
      // Step 3: Secondary SMS
      if (!patient.phone2) {
        console.log(`[Outreach] Patient ${patient.id} skipped Day 3 — no phone2`);
        return;
      }
      sent = await sendSms(patient.phone2, DAY3_SMS);
    } else if (nextDay === 4) {
      // Step 4: Case Manager
      if (!patient.caseManagerContact) {
        console.log(`[Outreach] Patient ${patient.id} skipped Day 4 — no caseManagerContact`);
        return;
      }
      sent = await sendEmail(
        patient.caseManagerContact,
        "AHF Pharmacy — Patient Contact Request",
        `Hello,\n\nAHF Pharmacy is attempting to reach a patient with initials ${patient.initials} regarding their prescription. We have been unable to make contact and are requesting your assistance in facilitating communication.\n\nPlease contact AHF Pharmacy at your earliest convenience.\n\nThis message is sent via encrypted delivery per our privacy policy.\n\nThank you,\nAHF Pharmacy Team`
      );
    } else {
      return;
    }
  } catch (err) {
    console.error(`[Outreach] Unexpected error sending for patient ${patient.id} Day ${nextDay}:`, err);
    return;
  }

  if (!sent) {
    console.log(`[Outreach] Patient ${patient.id} (${patient.initials}) — Day ${nextDay} NOT sent; sequence state unchanged`);
    return;
  }

  const isComplete = nextDay >= 4;
  const updated: RetentionPatient = {
    ...patient,
    sequenceDay: nextDay,
    lastOutreachDate: today,
    outreachComplete: isComplete,
    sequenceStartDate: patient.sequenceStartDate ?? today,
  };
  await storage.updatePatient(updated);
  console.log(`[Outreach] Patient ${patient.id} (${patient.initials}) — Day ${nextDay} sent and recorded${isComplete ? " (sequence complete)" : ""}`);
}

export async function runOutreachNow(): Promise<void> {
  console.log("[Outreach] Running outreach scheduler pass");
  try {
    const patients = await storage.getAllActivePatients();
    console.log(`[Outreach] Found ${patients.length} active patient(s) with outreach enabled`);
    for (const patient of patients) {
      await processPatient(patient);
    }
  } catch (err) {
    console.error("[Outreach] Scheduler error:", err);
  }
}

export function startOutreachScheduler(): void {
  const cronExpr = process.env.OUTREACH_CRON || "0 9 * * *";
  console.log(`[Outreach] Scheduler starting with cron: ${cronExpr}`);
  cron.schedule(cronExpr, () => {
    runOutreachNow().catch((err) => console.error("[Outreach] Unhandled error:", err));
  });
}
