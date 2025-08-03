/**
 * Transform database results to ensure proper data types
 * SQLite stores booleans as integers (0/1), so we need to convert them
 */

export function transformAccount(account: any) {
  if (!account) return account;
  
  return {
    ...account,
    is_default: Boolean(account.is_default),
    is_active: Boolean(account.is_active),
  };
}

export function transformAccounts(accounts: any[]) {
  return accounts.map(transformAccount);
}

export function transformActivity(activity: any) {
  if (!activity) return activity;
  
  return {
    ...activity,
    is_draft: Boolean(activity.is_draft),
  };
}

export function transformActivities(activities: any[]) {
  return activities.map(transformActivity);
}

export function transformGoal(goal: any) {
  if (!goal) return goal;
  
  return {
    ...goal,
    is_achieved: Boolean(goal.is_achieved),
  };
}

export function transformGoals(goals: any[]) {
  return goals.map(transformGoal);
} 