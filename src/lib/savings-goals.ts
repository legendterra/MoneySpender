export type SavingsGoalRecord = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  wallet_id: string | null;
  is_archived: boolean;
};

export type SavingsGoalProgress = {
  id: string;
  name: string;
  target: number;
  current: number;
  remaining: number;
  percent: number;
  reached: boolean;
  monthlyNeeded: number | null;
};

export function computeSavingsGoalProgress(goal: SavingsGoalRecord, todayKey: string): SavingsGoalProgress {
  const target = Math.max(1, Math.round(goal.target_amount));
  const current = Math.max(0, Math.round(goal.current_amount));
  const remaining = Math.max(0, target - current);
  const percent = Math.min(100, Math.round((current / target) * 100));
  const reached = current >= target;

  let monthlyNeeded: number | null = null;
  if (!reached && goal.target_date) {
    const tMatch = /^(\d{4})-(\d{2})/.exec(todayKey);
    const gMatch = /^(\d{4})-(\d{2})/.exec(goal.target_date);
    if (tMatch && gMatch) {
      const monthsLeft = (Number(gMatch[1]) - Number(tMatch[1])) * 12 + (Number(gMatch[2]) - Number(tMatch[2])) + 1;
      if (monthsLeft > 0) {
        monthlyNeeded = Math.ceil(remaining / monthsLeft);
      }
    }
  }

  return { id: goal.id, name: goal.name, target, current, remaining, percent, reached, monthlyNeeded };
}
