import type { SupabaseClient } from "@supabase/supabase-js";

import { computeAllowance } from "@/lib/allowance";
import { budgetRatio, budgetThreshold } from "@/lib/budget";
import { hourWIB, monthRange, todayWIB } from "@/lib/dates";
import {
  buildBudgetAlertMessage,
  buildDigestMessage,
  isWithinActiveWindow,
  slotPosition,
  type MessageKind,
  type SlotPosition,
} from "@/lib/digest";
import {
  PROFILE_COLUMNS,
  balancesFromSnapshot,
  fetchFinanceSnapshot,
  fetchRecurring,
  normalizeProfile,
} from "@/lib/finance-data";
import {
  sendToSubscriptions,
  type PushPayload,
  type PushSender,
  type PushSubscriptionRow,
} from "@/lib/push";
import { expectData, expectRows, isUniqueViolation, SupabaseQueryError } from "@/lib/supabase/query";

// Orchestrates one hourly digest run (PLAN.md section 7). The route only
// handles auth/params; everything here is testable with a fake client.

type PreferenceRow = {
  user_id: string;
  digest_enabled: boolean;
  digest_every_hours: number;
  active_start: number;
  active_end: number;
  hide_amounts: boolean;
};

type SubscriptionRow = PushSubscriptionRow & { user_id: string };

export type PlannedMessage = {
  kind: MessageKind;
  title: string;
  body: string;
  tag: string;
  /** Devices that would receive it (dry run) or were targeted (live run). */
  devices: number;
  alreadySent: number;
  categoryId?: string;
  threshold?: number;
};

export type DigestUserPlan = {
  userId: string;
  locale: string;
  slot: SlotPosition | null;
  messages: PlannedMessage[];
};

export type DigestReport = {
  dry: boolean;
  date: string;
  hour: number;
  eligibleUsers: number;
  sent: number;
  skippedDuplicates: number;
  removedSubscriptions: number;
  failed: number;
  errors: string[];
  plan: DigestUserPlan[];
};

export type RunDigestOptions = {
  client: SupabaseClient;
  now?: Date;
  /** Only honoured together with dry (enforced by the route). */
  hourOverride?: number;
  dry: boolean;
  send?: PushSender;
};

const PREFERENCE_COLUMNS = "user_id,digest_enabled,digest_every_hours,active_start,active_end,hide_amounts";

function schedule(pref: PreferenceRow) {
  return {
    digest_every_hours: pref.digest_every_hours,
    active_start: pref.active_start,
    active_end: pref.active_end,
  };
}

type BudgetCandidate = { categoryId: string; categoryName: string; ratio: number; threshold: 80 | 100 };

async function loadUserContext(client: SupabaseClient, userId: string, today: string) {
  const month = today.slice(0, 7);
  const [profileRow, snapshot, recurring, budgets, categories] = await Promise.all([
    client.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
    fetchFinanceSnapshot(client, userId),
    fetchRecurring(client, userId, { activeOnly: true }),
    client.from("monthly_budgets").select("category_id,amount").eq("user_id", userId).eq("month", month).gt("amount", 0),
    client.from("categories").select("id,name").eq("user_id", userId).eq("type", "expense"),
  ]);

  const profile = normalizeProfile(expectData<Record<string, unknown>>("profiles", profileRow), null);
  const allowance = computeAllowance({
    today,
    walletsAtStartOfToday: balancesFromSnapshot(snapshot, { before: today }),
    transactions: snapshot.transactions,
    recurring,
    reserveSavings: profile.reserve_savings,
    monthlySavingsGoal: Number(profile.monthly_savings_goal ?? 0),
  });
  const hasRecordsToday = snapshot.transactions.some((t) => t.transaction_date === today);

  const { start, end } = monthRange(month);
  const spentByCategory = new Map<string, number>();
  for (const t of snapshot.transactions) {
    if (t.type !== "expense" || !t.category_id || t.transaction_date < start || t.transaction_date > end) continue;
    spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + t.amount);
  }
  const names = new Map(
    expectRows<{ id: string; name: string }>("categories", categories).map((c) => [c.id, c.name]),
  );
  const budgetCandidates: BudgetCandidate[] = [];
  for (const budget of expectRows<{ category_id: string; amount: number }>("monthly_budgets", budgets)) {
    const ratio = budgetRatio(spentByCategory.get(budget.category_id) ?? 0, Number(budget.amount));
    const threshold = budgetThreshold(ratio);
    if (threshold) {
      budgetCandidates.push({
        categoryId: budget.category_id,
        categoryName: names.get(budget.category_id) ?? "Kategori",
        ratio,
        threshold,
      });
    }
  }

  return { profile, allowance, hasRecordsToday, budgetCandidates, month };
}

export async function runDigest(options: RunDigestOptions): Promise<DigestReport> {
  const { client, dry } = options;
  const now = options.now ?? new Date();
  const today = todayWIB(now);
  const hour = options.hourOverride ?? hourWIB(now);
  if (!dry && !options.send) throw new Error("runDigest: a push sender is required unless dry=true.");

  const report: DigestReport = {
    dry,
    date: today,
    hour,
    eligibleUsers: 0,
    sent: 0,
    skippedDuplicates: 0,
    removedSubscriptions: 0,
    failed: 0,
    errors: [],
    plan: [],
  };

  const prefs = expectRows<PreferenceRow>(
    "reminder_preferences",
    await client.from("reminder_preferences").select(PREFERENCE_COLUMNS).eq("push_enabled", true),
  );
  // Budget alerts are evaluated every run but only sent inside the active window;
  // the digest additionally needs digest_enabled and a slot at this hour.
  const candidates = prefs.filter((pref) => isWithinActiveWindow(schedule(pref), hour));
  if (!candidates.length) return report;

  const subscriptions = expectRows<SubscriptionRow>(
    "push_subscriptions",
    await client
      .from("push_subscriptions")
      .select("user_id,endpoint,p256dh,auth")
      .in(
        "user_id",
        candidates.map((pref) => pref.user_id),
      ),
  );
  const devicesByUser = new Map<string, SubscriptionRow[]>();
  for (const sub of subscriptions) {
    devicesByUser.set(sub.user_id, [...(devicesByUser.get(sub.user_id) ?? []), sub]);
  }

  const gone = new Set<string>();

  for (const pref of candidates) {
    const devices = devicesByUser.get(pref.user_id) ?? [];
    if (!devices.length) continue;
    report.eligibleUsers += 1;

    try {
      const ctx = await loadUserContext(client, pref.user_id, today);
      const locale = ctx.profile.locale;
      const position = pref.digest_enabled ? slotPosition(schedule(pref), hour) : null;
      const userPlan: DigestUserPlan = { userId: pref.user_id, locale, slot: position, messages: [] };

      if (position) {
        const message = buildDigestMessage({
          locale,
          hideAmounts: Boolean(pref.hide_amounts),
          position,
          hour,
          hasRecordsToday: ctx.hasRecordsToday,
          allowance: ctx.allowance,
          currency: ctx.profile.currency_code ?? "IDR",
        });
        const payload: PushPayload = { ...message, url: "/dashboard", tag: `digest-${today}` };
        const planned: PlannedMessage = { ...payload, kind: message.kind, devices: 0, alreadySent: 0 };

        // Dedup per device: the unique (endpoint, local_date, local_hour) row is claimed before sending.
        const targets: PushSubscriptionRow[] = [];
        if (dry) {
          const logged = expectRows<{ endpoint: string }>(
            "notification_digest_logs",
            await client
              .from("notification_digest_logs")
              .select("endpoint")
              .in(
                "endpoint",
                devices.map((d) => d.endpoint),
              )
              .eq("local_date", today)
              .eq("local_hour", hour),
          );
          const loggedSet = new Set(logged.map((row) => row.endpoint));
          planned.alreadySent = devices.filter((d) => loggedSet.has(d.endpoint)).length;
          planned.devices = devices.length - planned.alreadySent;
        } else {
          for (const device of devices) {
            const claim = await client.from("notification_digest_logs").insert({
              user_id: pref.user_id,
              endpoint: device.endpoint,
              local_date: today,
              local_hour: hour,
              kind: message.kind,
            });
            if (claim.error) {
              if (isUniqueViolation(claim.error)) {
                planned.alreadySent += 1;
                report.skippedDuplicates += 1;
                continue;
              }
              throw new SupabaseQueryError("notification_digest_logs", "insert", claim.error);
            }
            targets.push(device);
          }
          planned.devices = targets.length;
          const result = await sendToSubscriptions(targets, payload, options.send!);
          report.sent += result.sent;
          report.failed += result.failed.length;
          result.gone.forEach((endpoint) => gone.add(endpoint));
          result.failed.forEach((f) => report.errors.push(`push ${f.endpoint} failed (${f.status}): ${f.message}`));
        }
        userPlan.messages.push(planned);
      }

      for (const alert of ctx.budgetCandidates) {
        const message = buildBudgetAlertMessage({
          locale,
          categoryName: alert.categoryName,
          ratio: alert.ratio,
          threshold: alert.threshold,
        });
        const payload: PushPayload = {
          ...message,
          url: "/dashboard",
          tag: `budget-${alert.categoryId}-${ctx.month}-${alert.threshold}`,
        };
        const planned: PlannedMessage = {
          ...payload,
          kind: message.kind,
          devices: 0,
          alreadySent: 0,
          categoryId: alert.categoryId,
          threshold: alert.threshold,
        };

        if (dry) {
          const existing = expectRows<{ id: string }>(
            "budget_notification_logs",
            await client
              .from("budget_notification_logs")
              .select("id")
              .eq("user_id", pref.user_id)
              .eq("category_id", alert.categoryId)
              .eq("month", ctx.month)
              .eq("threshold", alert.threshold),
          );
          if (existing.length) planned.alreadySent = devices.length;
          else planned.devices = devices.length;
        } else {
          const claim = await client.from("budget_notification_logs").insert({
            user_id: pref.user_id,
            category_id: alert.categoryId,
            month: ctx.month,
            threshold: alert.threshold,
          });
          if (claim.error) {
            if (!isUniqueViolation(claim.error)) {
              throw new SupabaseQueryError("budget_notification_logs", "insert", claim.error);
            }
            planned.alreadySent = devices.length;
            report.skippedDuplicates += 1;
          } else {
            const live = devices.filter((d) => !gone.has(d.endpoint));
            planned.devices = live.length;
            const result = await sendToSubscriptions(live, payload, options.send!);
            report.sent += result.sent;
            report.failed += result.failed.length;
            result.gone.forEach((endpoint) => gone.add(endpoint));
            result.failed.forEach((f) => report.errors.push(`push ${f.endpoint} failed (${f.status}): ${f.message}`));
          }
        }
        userPlan.messages.push(planned);
      }

      if (userPlan.messages.length) report.plan.push(userPlan);
    } catch (error) {
      report.errors.push(`user ${pref.user_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (gone.size && !dry) {
    const removed = await client.from("push_subscriptions").delete().in("endpoint", [...gone]);
    if (removed.error) {
      report.errors.push(new SupabaseQueryError("push_subscriptions", "delete", removed.error).message);
    } else {
      report.removedSubscriptions = gone.size;
    }
  }

  return report;
}

