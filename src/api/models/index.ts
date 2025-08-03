import { z } from 'zod';

// Common response structure
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  pagination: z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }).optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

// User models
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_login_at: z.string().datetime().optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  refresh_token: z.string(),
});

// Account models
export const AccountSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  account_type: z.string(),
  group_name: z.string().optional(),
  currency: z.string().length(3),
  platform_id: z.string().uuid().optional(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateAccountSchema = z.object({
  name: z.string().min(1),
  account_type: z.string().default('SECURITIES'),
  group_name: z.string().optional(),
  currency: z.string().length(3).optional(),
  platform_id: z.string().uuid().optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const UpdateAccountSchema = CreateAccountSchema.partial();

// Asset models
export const AssetSchema = z.object({
  id: z.string().uuid(),
  isin: z.string().optional(),
  name: z.string().optional(),
  asset_type: z.string().optional(),
  symbol: z.string(),
  symbol_mapping: z.string().optional(),
  asset_class: z.string().optional(),
  asset_sub_class: z.string().optional(),
  notes: z.string().optional(),
  countries: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  sectors: z.array(z.string()).optional(),
  currency: z.string().length(3),
  data_source: z.string(),
  url: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UpdateAssetSchema = z.object({
  name: z.string().optional(),
  asset_type: z.string().optional(),
  symbol_mapping: z.string().optional(),
  asset_class: z.string().optional(),
  asset_sub_class: z.string().optional(),
  notes: z.string().optional(),
  countries: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  sectors: z.array(z.string()).optional(),
  data_source: z.string().optional(),
  url: z.string().optional(),
});

// Activity models
export const ActivitySchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  activity_type: z.string(),
  activity_date: z.string().datetime(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  currency: z.string().length(3),
  fee: z.number().default(0),
  amount: z.number().optional(),
  is_draft: z.boolean().default(false),
  comment: z.string().optional(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateActivitySchema = z.object({
  account_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  activity_type: z.string(),
  activity_date: z.string().datetime(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  currency: z.string().length(3),
  fee: z.number().default(0),
  amount: z.number().optional(),
  is_draft: z.boolean().default(false),
  comment: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateActivitySchema = CreateActivitySchema.partial();

// Goal models
export const GoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  target_amount: z.number(),
  is_achieved: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  target_amount: z.number().positive(),
  is_achieved: z.boolean().default(false),
});

export const UpdateGoalSchema = CreateGoalSchema.partial();

// Quote models
export const QuoteSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  timestamp: z.string().datetime(),
  open_price: z.number().optional(),
  high_price: z.number().optional(),
  low_price: z.number().optional(),
  close_price: z.number().optional(),
  adj_close_price: z.number().optional(),
  volume: z.number().optional(),
  currency: z.string().length(3),
  data_source: z.string(),
  created_at: z.string().datetime(),
});

export const CreateQuoteSchema = z.object({
  symbol: z.string(),
  timestamp: z.string().datetime(),
  open_price: z.number().optional(),
  high_price: z.number().optional(),
  low_price: z.number().optional(),
  close_price: z.number().optional(),
  adj_close_price: z.number().optional(),
  volume: z.number().optional(),
  currency: z.string().length(3),
  data_source: z.string(),
});

// Settings models
export const UserSettingsSchema = z.object({
  user_id: z.string().uuid(),
  theme: z.string().default('light'),
  font_family: z.string().default('Inter'),
  base_currency: z.string().length(3).default('USD'),
  privacy_mode: z.boolean().default(false),
  date_format: z.string().default('MM/DD/YYYY'),
  number_format: z.string().default('US'),
  timezone: z.string().default('UTC'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UpdateUserSettingsSchema = z.object({
  theme: z.string().optional(),
  font_family: z.string().optional(),
  base_currency: z.string().length(3).optional(),
  privacy_mode: z.boolean().optional(),
  date_format: z.string().optional(),
  number_format: z.string().optional(),
  timezone: z.string().optional(),
});

// Exchange rate models
export const ExchangeRateSchema = z.object({
  id: z.string(),
  base_currency: z.string().length(3),
  target_currency: z.string().length(3),
  rate: z.number().positive(),
  last_updated: z.string().datetime(),
  source: z.string(),
});

export const CreateExchangeRateSchema = z.object({
  base_currency: z.string().length(3),
  target_currency: z.string().length(3),
  rate: z.number().positive(),
  source: z.string().default('MANUAL'),
});

// Contribution limit models
export const ContributionLimitSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  group_name: z.string(),
  contribution_year: z.number(),
  limit_amount: z.number().positive(),
  account_ids: z.string().optional(), // JSON string
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateContributionLimitSchema = z.object({
  group_name: z.string().min(1),
  contribution_year: z.number().int().positive(),
  limit_amount: z.number().positive(),
  account_ids: z.array(z.string().uuid()).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const UpdateContributionLimitSchema = CreateContributionLimitSchema.partial();

// Goal allocation models
export const GoalAllocationSchema = z.object({
  id: z.string().uuid(),
  goal_id: z.string().uuid(),
  account_id: z.string().uuid(),
  percent_allocation: z.number().min(0).max(100),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateGoalAllocationSchema = z.object({
  account_id: z.string().uuid(),
  percent_allocation: z.number().min(0).max(100),
});

// Market data provider models
export const MarketDataProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  is_active: z.boolean(),
  supports_search: z.boolean(),
  supports_historical: z.boolean(),
  supports_realtime: z.boolean(),
  rate_limit: z.string(),
  data_sources: z.array(z.string()),
});

// Pagination
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// Export all types
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type CreateAccount = z.infer<typeof CreateAccountSchema>;
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type CreateActivity = z.infer<typeof CreateActivitySchema>;
export type UpdateActivity = z.infer<typeof UpdateActivitySchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type CreateGoal = z.infer<typeof CreateGoalSchema>;
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type CreateQuote = z.infer<typeof CreateQuoteSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;
export type CreateExchangeRate = z.infer<typeof CreateExchangeRateSchema>;
export type ContributionLimit = z.infer<typeof ContributionLimitSchema>;
export type CreateContributionLimit = z.infer<typeof CreateContributionLimitSchema>;
export type UpdateContributionLimit = z.infer<typeof UpdateContributionLimitSchema>;
export type GoalAllocation = z.infer<typeof GoalAllocationSchema>;
export type CreateGoalAllocation = z.infer<typeof CreateGoalAllocationSchema>;
export type MarketDataProvider = z.infer<typeof MarketDataProviderSchema>;