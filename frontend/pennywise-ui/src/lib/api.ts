// API client for Pennywise backend

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/api';

// Types matching backend DTOs
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUser {
  username: string;
  email: string;
}

export interface UpdateUser {
  username?: string;
  email?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

export interface CreateTag {
  name: string;
  color?: string;
}

export interface UpdateTag {
  name?: string;
  color?: string;
}

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  tags: Tag[];
}

export interface CreateExpense {
  title: string;
  description?: string;
  amount: number;
  date: string;
  userId: number;
  categoryId: number;
  tagIds?: number[];
}

export interface UpdateExpense {
  title?: string;
  description?: string;
  amount?: number;
  date?: string;
  categoryId?: number;
  tagIds?: number[];
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  search?: string;
  tagIds?: number[];
}

export interface ExpenseImportRowResult {
  rowNumber: number;
  status: string;
  message?: string;
}

export interface ExpenseImportResponse {
  fileName: string;
  dryRun: boolean;
  duplicateStrategy: string;
  timezone?: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ExpenseImportRowResult[];
}

export interface AssetSnapshotImportRowResult {
  rowNumber: number;
  status: string;
  message?: string;
}

export interface AssetSnapshotImportResponse {
  fileName: string;
  dryRun: boolean;
  duplicateStrategy: string;
  timezone?: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: AssetSnapshotImportRowResult[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export interface CreateCategory {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategory {
  name?: string;
  description?: string;
  color?: string;
}

export interface DashboardSummary {
  totalTracked: number;
  monthTracked: number;
  monthChangePercent: number;
  averageTicket: number;
  activeCategories: number;
  remainingThisMonth: number;
  recentTransactions: TransactionSummary[];
}

export interface TransactionSummary {
  id: number;
  title: string;
  amount: number;
  date: string;
  category?: string;
  categoryColor?: string;
}

// Year-over-Year Comparison Types
export interface YearOverYearComparison {
  comparisonMode: string;
  currentPeriod: YearOverYearPeriod;
  previousPeriod: YearOverYearPeriod;
  totalDifference: number;
  percentageChange: number;
  categoryComparisons: YearOverYearCategoryComparison[];
  monthlyData: YearOverYearMonthlyData[];
}

export interface YearOverYearPeriod {
  year: number;
  month?: number;
  label: string;
  total: number;
  transactionCount: number;
  hasData: boolean;
}

export interface YearOverYearCategoryComparison {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  currentAmount: number;
  previousAmount: number;
  difference: number;
  percentageChange: number;
  isNewCategory: boolean;
}

export interface YearOverYearMonthlyData {
  month: number;
  monthName: string;
  currentYearAmount: number;
  previousYearAmount: number;
  difference: number;
}

// Average Expenses Types
export interface AverageExpenses {
  viewMode: string;
  selectedYears: number[];
  totalAverage: number;
  monthlyAverages: AverageExpensesByMonth[];
  categoryAverages: AverageExpensesByCategory[];
  yearlyData: YearlyExpenseData[];
}

export interface AverageExpensesByMonth {
  month: number;
  monthName: string;
  average: number;
  min: number;
  max: number;
}

export interface AverageExpensesByCategory {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  average: number;
  min: number;
  max: number;
}

export interface YearlyExpenseData {
  year: number;
  total: number;
  monthlyData: MonthlyExpenseData[];
  categoryData: CategoryExpenseData[];
}

export interface MonthlyExpenseData {
  month: number;
  monthName: string;
  amount: number;
}

export interface CategoryExpenseData {
  categoryId: number;
  categoryName: string;
  categoryColor?: string;
  amount: number;
}

// Helper for handling API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// User API
export const userApi = {
  async getById(id: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      credentials: 'include',
    });
    return handleResponse<User>(response);
  },

  async getByEmail(email: string): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(email)}`, {
      credentials: 'include',
    });
    if (response.status === 404) return null;
    return handleResponse<User>(response);
  },

  async create(user: CreateUser): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      credentials: 'include',
    });
    return handleResponse<User>(response);
  },

  async update(id: number, user: UpdateUser): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      credentials: 'include',
    });
    return handleResponse<User>(response);
  },
};

export function buildExpenseQuery(filters?: ExpenseFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set('startDate', filters.startDate);
  }

  if (filters.endDate) {
    params.set('endDate', filters.endDate);
  }

  if (filters.categoryId !== undefined) {
    params.set('categoryId', filters.categoryId.toString());
  }

  const searchValue = filters.search?.trim();
  if (searchValue) {
    params.set('search', searchValue);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    params.set('tagIds', filters.tagIds.join(','));
  }

  return params.toString();
}

// Expense API
export const expenseApi = {
  async getAll(userId: number, filters?: ExpenseFilters): Promise<Expense[]> {
    const filterQuery = buildExpenseQuery(filters);
    const url = filterQuery
      ? `${API_BASE_URL}/expenses/user/${userId}?${filterQuery}`
      : `${API_BASE_URL}/expenses/user/${userId}`;
    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<Expense[]>(response);
  },

  async getById(id: number, userId: number): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<Expense>(response);
  },

  async getByDateRange(userId: number, startDate: string, endDate: string): Promise<Expense[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    const response = await fetch(`${API_BASE_URL}/expenses/user/${userId}/daterange?${params}`, {
      credentials: 'include',
    });
    return handleResponse<Expense[]>(response);
  },

  async getByCategory(userId: number, categoryId: number): Promise<Expense[]> {
    const response = await fetch(`${API_BASE_URL}/expenses/user/${userId}/category/${categoryId}`, {
      credentials: 'include',
    });
    return handleResponse<Expense[]>(response);
  },

  async create(expense: CreateExpense): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      credentials: 'include',
    });
    return handleResponse<Expense>(response);
  },

  async update(id: number, userId: number, expense: UpdateExpense): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      credentials: 'include',
    });
    return handleResponse<Expense>(response);
  },

  async delete(id: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}/user/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },

  async export(
    userId: number,
    format: 'csv' | 'xlsx',
    filters?: ExpenseFilters
  ): Promise<{ blob: Blob; filename: string }> {
    const filterQuery = buildExpenseQuery(filters);
    const queryParts = [`userId=${userId}`, `format=${format}`];
    if (filterQuery) {
      queryParts.push(filterQuery);
    }

    const url = `${API_BASE_URL}/expenses/export?${queryParts.join('&')}`;
    const accept =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    const response = await fetch(url, {
      headers: {
        Accept: accept,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to export expenses');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    // Robust filename extraction: RFC 5987, quoted, and unquoted
    const match = disposition.match(
      /filename\*=([^']+)''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i
    );
    const filename = match?.[2]
      ? decodeURIComponent(match[2])
      : match?.[3] || match?.[4] || `expenses.${format}`;

    return {
      blob,
      filename,
    };
  },

  async downloadTemplate(format: 'csv' | 'xlsx'): Promise<{ blob: Blob; filename: string }> {
    const response = await fetch(`${API_BASE_URL}/expenses/template?format=${format}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to download template');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(
      /filename\*=([^']+)''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i
    );
    const filename = match?.[2]
      ? decodeURIComponent(match[2])
      : match?.[3] || match?.[4] || `expenses-template.${format}`;

    return { blob, filename };
  },

  async importExpenses(
    userId: number,
    file: File,
    options?: {
      duplicateStrategy?: 'skip' | 'update';
      timezone?: string;
      dryRun?: boolean;
      externalBatchId?: string;
    }
  ): Promise<ExpenseImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId.toString());

    if (options?.duplicateStrategy) {
      formData.append('duplicateStrategy', options.duplicateStrategy);
    }

    if (options?.timezone) {
      formData.append('timezone', options.timezone);
    }

    formData.append('dryRun', options?.dryRun === false ? 'false' : 'true');

    if (options?.externalBatchId) {
      formData.append('externalBatchId', options.externalBatchId);
    }

    const response = await fetch(`${API_BASE_URL}/expenses/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to import expenses');
    }

    return response.json() as Promise<ExpenseImportResponse>;
  },

  async getEarliestDate(userId: number): Promise<string | null> {
    const response = await fetch(`${API_BASE_URL}/expenses/user/${userId}/earliest-date`, {
      credentials: 'include',
    });
    const date = await handleResponse<string | null>(response);
    return date;
  },
};

// Category API
export const categoryApi = {
  async getAll(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      credentials: 'include',
    });
    return handleResponse<Category[]>(response);
  },

  async getById(id: number): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      credentials: 'include',
    });
    return handleResponse<Category>(response);
  },

  async create(category: CreateCategory): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
      credentials: 'include',
    });
    return handleResponse<Category>(response);
  },

  async update(id: number, category: UpdateCategory): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
      credentials: 'include',
    });
    return handleResponse<Category>(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },
};

// Summary API
export const summaryApi = {
  async getDashboard(userId: number): Promise<DashboardSummary> {
    const response = await fetch(`${API_BASE_URL}/summary/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<DashboardSummary>(response);
  },

  async getYearOverYearComparison(
    userId: number,
    options?: {
      mode?: 'month' | 'year';
      currentYear?: number;
      currentMonth?: number;
      previousYear?: number;
      previousMonth?: number;
    }
  ): Promise<YearOverYearComparison> {
    const params = new URLSearchParams();
    if (options?.mode) params.set('mode', options.mode);
    if (options?.currentYear) params.set('currentYear', options.currentYear.toString());
    if (options?.currentMonth) params.set('currentMonth', options.currentMonth.toString());
    if (options?.previousYear) params.set('previousYear', options.previousYear.toString());
    if (options?.previousMonth) params.set('previousMonth', options.previousMonth.toString());

    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/summary/user/${userId}/year-over-year?${query}`
      : `${API_BASE_URL}/summary/user/${userId}/year-over-year`;

    const response = await fetch(url, {
      credentials: 'include',
    });
    return handleResponse<YearOverYearComparison>(response);
  },

  async getAverageExpenses(
    userId: number,
    options?: {
      viewMode?: 'month' | 'category';
      years?: number[];
    }
  ): Promise<AverageExpenses> {
    const params = new URLSearchParams();
    if (options?.viewMode) params.set('viewMode', options.viewMode);
    if (options?.years && options.years.length > 0) {
      params.set('years', options.years.join(','));
    }

    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/summary/user/${userId}/average-expenses?${query}`
      : `${API_BASE_URL}/summary/user/${userId}/average-expenses`;

    const response = await fetch(url, {
      credentials: 'include',
    });
    return handleResponse<AverageExpenses>(response);
  },
};

// Asset Category Types
export interface AssetCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isLiability: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetCategory {
  name: string;
  description?: string;
  color?: string;
  isLiability: boolean;
  sortOrder: number;
}

export interface UpdateAssetCategory {
  name?: string;
  description?: string;
  color?: string;
  isLiability?: boolean;
  sortOrder?: number;
}

// Asset Types
export interface Asset {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  assetCategoryId: number;
  assetCategoryName?: string;
  isLiability: boolean;
  currentBalance?: number;
  lastUpdated?: string;
}

export interface CreateAsset {
  name: string;
  description?: string;
  color?: string;
  userId: number;
  assetCategoryId: number;
  initialBalance?: number;
}

export interface UpdateAsset {
  name?: string;
  description?: string;
  color?: string;
  assetCategoryId?: number;
}

// Asset Snapshot Types
export interface AssetSnapshot {
  id: number;
  balance: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assetId: number;
  assetName?: string;
}

export interface CreateAssetSnapshot {
  balance: number;
  date: string;
  notes?: string;
  assetId: number;
}

export interface UpdateAssetSnapshot {
  balance?: number;
  date?: string;
  notes?: string;
}

export interface BulkSnapshotEntry {
  balance: number;
  date: string;
  notes?: string;
}

export interface BulkCreateAssetSnapshot {
  assetId: number;
  entries: BulkSnapshotEntry[];
}

export interface BulkCreateAssetSnapshotResult {
  created: number;
  updated: number;
  snapshots: AssetSnapshot[];
}

// Net Worth Types
export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  changeFromLastPeriod: number;
  changePercent: number;
  assetsByCategory: AssetCategorySummary[];
  history: NetWorthHistoryPoint[];
}

export interface AssetCategorySummary {
  categoryId: number;
  categoryName: string;
  color?: string;
  isLiability: boolean;
  totalBalance: number;
  assets: AssetSummary[];
}

export interface AssetSummary {
  assetId: number;
  assetName: string;
  color?: string;
  balance: number;
  lastUpdated?: string;
}

export interface NetWorthHistoryPoint {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalExpenses?: number;
}

export interface ExpenseHistoryPoint {
  date: string;
  totalExpenses: number;
}

export interface NetWorthComparison {
  netWorthHistory: NetWorthHistoryPoint[];
  expenseHistory: ExpenseHistoryPoint[];
}

export interface NetWorthProjectionPoint {
  date: string;
  projectedNetWorth: number;
  isHistorical: boolean;
}

export interface NetWorthGoal {
  goalAmount: number;
  estimatedGoalDate?: string;
  monthsToGoal?: number;
  isAchievable: boolean;
}

export interface RecurringTransferSummary {
  id: number;
  description: string;
  assetName: string;
  amount: number;
  frequency: string;
  monthlyEquivalent: number;
}

export interface CustomProjectionItem {
  description: string;
  amount: number;
  date?: string;
  isRecurring: boolean;
  frequency?: string;
  monthlyEquivalent?: number;
}

export interface ProjectionCalculationDescription {
  averageMonthlyExpenses: string;
  averageMonthlyNetChange: string;
  recurringTransfersMonthlyTotal: string;
  customItemsTotal: string;
  projectedMonthlyChange: string;
  projection: string;
}

export interface NetWorthProjection {
  currentNetWorth: number;
  averageMonthlyExpenses: number;
  averageMonthlyNetChange: number;
  recurringTransfersMonthlyTotal: number;
  customItemsMonthlyTotal: number;
  projectedMonthlyChange: number;
  includesRecurringTransfers: boolean;
  includesAverageExpenses: boolean;
  projectedHistory: NetWorthProjectionPoint[];
  recurringTransfers: RecurringTransferSummary[];
  customItems: CustomProjectionItem[];
  goal?: NetWorthGoal;
  calculationDescriptions: ProjectionCalculationDescription;
}

// Liability Payoff Types
export interface LiabilityPayoffEstimate {
  liabilities: LiabilityPayoffItem[];
  totalLiabilities: number;
  totalMonthlyPayment: number;
  overallPayoffDate?: string;
  monthsToPayoff?: number;
}

export interface LiabilityPayoffItem {
  assetId: number;
  name: string;
  color?: string;
  currentBalance: number;
  monthlyPayment: number;
  interestRate?: number;
  estimatedPayoffDate?: string;
  monthsToPayoff?: number;
  totalInterestPaid: number;
  payoffSchedule: LiabilityPayoffPoint[];
  hasRecurringPayment: boolean;
}

export interface LiabilityPayoffPoint {
  date: string;
  balance: number;
  payment: number;
  interest: number;
  principal: number;
}

export interface LiabilityPayoffSettings {
  assetId: number;
  monthlyPayment?: number;
  interestRate?: number;
}

// Asset Category API
export const assetCategoryApi = {
  async getAll(): Promise<AssetCategory[]> {
    const response = await fetch(`${API_BASE_URL}/assetcategories`, {
      credentials: 'include',
    });
    return handleResponse<AssetCategory[]>(response);
  },

  async getById(id: number): Promise<AssetCategory> {
    const response = await fetch(`${API_BASE_URL}/assetcategories/${id}`, {
      credentials: 'include',
    });
    return handleResponse<AssetCategory>(response);
  },

  async create(category: CreateAssetCategory): Promise<AssetCategory> {
    const response = await fetch(`${API_BASE_URL}/assetcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
      credentials: 'include',
    });
    return handleResponse<AssetCategory>(response);
  },

  async update(id: number, category: UpdateAssetCategory): Promise<AssetCategory> {
    const response = await fetch(`${API_BASE_URL}/assetcategories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
      credentials: 'include',
    });
    return handleResponse<AssetCategory>(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assetcategories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },
};

// Asset API
export const assetApi = {
  async getAll(userId: number): Promise<Asset[]> {
    const response = await fetch(`${API_BASE_URL}/assets/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<Asset[]>(response);
  },

  async getById(id: number, userId: number): Promise<Asset> {
    const response = await fetch(`${API_BASE_URL}/assets/${id}/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<Asset>(response);
  },

  async getByCategory(userId: number, categoryId: number): Promise<Asset[]> {
    const response = await fetch(`${API_BASE_URL}/assets/user/${userId}/category/${categoryId}`, {
      credentials: 'include',
    });
    return handleResponse<Asset[]>(response);
  },

  async create(asset: CreateAsset): Promise<Asset> {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
      credentials: 'include',
    });
    return handleResponse<Asset>(response);
  },

  async update(id: number, userId: number, asset: UpdateAsset): Promise<Asset> {
    const response = await fetch(`${API_BASE_URL}/assets/${id}/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
      credentials: 'include',
    });
    return handleResponse<Asset>(response);
  },

  async delete(id: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assets/${id}/user/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },
};

// Asset Snapshot API
export const assetSnapshotApi = {
  async getByAsset(
    assetId: number,
    startDate?: string,
    endDate?: string
  ): Promise<AssetSnapshot[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/assetsnapshots/asset/${assetId}?${query}`
      : `${API_BASE_URL}/assetsnapshots/asset/${assetId}`;
    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<AssetSnapshot[]>(response);
  },

  async getById(id: number): Promise<AssetSnapshot> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots/${id}`, {
      credentials: 'include',
    });
    return handleResponse<AssetSnapshot>(response);
  },

  async getLatest(assetId: number): Promise<AssetSnapshot | null> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots/asset/${assetId}/latest`, {
      credentials: 'include',
    });
    if (response.status === 404) return null;
    return handleResponse<AssetSnapshot>(response);
  },

  async create(snapshot: CreateAssetSnapshot): Promise<AssetSnapshot> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      credentials: 'include',
    });
    return handleResponse<AssetSnapshot>(response);
  },

  async createBulk(bulkSnapshot: BulkCreateAssetSnapshot): Promise<BulkCreateAssetSnapshotResult> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkSnapshot),
      credentials: 'include',
    });
    return handleResponse<BulkCreateAssetSnapshotResult>(response);
  },

  async update(id: number, snapshot: UpdateAssetSnapshot): Promise<AssetSnapshot> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      credentials: 'include',
    });
    return handleResponse<AssetSnapshot>(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assetsnapshots/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },

  async downloadTemplate(
    format: 'csv' | 'xlsx',
    assetId?: number,
    userId?: number
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams({ format });
    if (assetId) params.set('assetId', assetId.toString());
    if (userId) params.set('userId', userId.toString());

    const response = await fetch(`${API_BASE_URL}/assetsnapshots/template?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to download template');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(
      /filename\*=([^']+)''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i
    );
    const filename = match?.[2]
      ? decodeURIComponent(match[2])
      : match?.[3] || match?.[4] || `balances-template.${format}`;

    return { blob, filename };
  },

  async importBalances(
    assetId: number,
    userId: number,
    file: File,
    options?: {
      duplicateStrategy?: 'skip' | 'update';
      timezone?: string;
      dryRun?: boolean;
    }
  ): Promise<AssetSnapshotImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetId', assetId.toString());
    formData.append('userId', userId.toString());

    if (options?.duplicateStrategy) {
      formData.append('duplicateStrategy', options.duplicateStrategy);
    }

    if (options?.timezone) {
      formData.append('timezone', options.timezone);
    }

    formData.append('dryRun', options?.dryRun === false ? 'false' : 'true');

    const response = await fetch(`${API_BASE_URL}/assetsnapshots/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to import balances');
    }

    return response.json() as Promise<AssetSnapshotImportResponse>;
  },

  async export(
    userId: number,
    format: 'csv' | 'xlsx',
    options?: {
      assetId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams({
      userId: userId.toString(),
      format,
    });
    if (options?.assetId) params.set('assetId', options.assetId.toString());
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);

    const accept =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    const response = await fetch(`${API_BASE_URL}/assetsnapshots/export?${params}`, {
      headers: { Accept: accept },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to export balances');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(
      /filename\*=([^']+)''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i
    );
    const filename = match?.[2]
      ? decodeURIComponent(match[2])
      : match?.[3] || match?.[4] || `balances.${format}`;

    return { blob, filename };
  },

  async downloadBulkTemplate(
    format: 'csv' | 'xlsx',
    userId: number
  ): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams({ format, userId: userId.toString() });

    const response = await fetch(`${API_BASE_URL}/assetsnapshots/bulk-template?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to download template');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(
      /filename\*=([^']+)''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i
    );
    const filename = match?.[2]
      ? decodeURIComponent(match[2])
      : match?.[3] || match?.[4] || `all-accounts-balances-template.${format}`;

    return { blob, filename };
  },

  async bulkImportBalances(
    userId: number,
    file: File,
    options?: {
      duplicateStrategy?: 'skip' | 'update';
      timezone?: string;
      dryRun?: boolean;
    }
  ): Promise<AssetSnapshotImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId.toString());

    if (options?.duplicateStrategy) {
      formData.append('duplicateStrategy', options.duplicateStrategy);
    }

    if (options?.timezone) {
      formData.append('timezone', options.timezone);
    }

    formData.append('dryRun', options?.dryRun === false ? 'false' : 'true');

    const response = await fetch(`${API_BASE_URL}/assetsnapshots/bulk-import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to import balances');
    }

    return response.json() as Promise<AssetSnapshotImportResponse>;
  },
};

// Net Worth API
export const netWorthApi = {
  async getSummary(userId: number, asOfDate?: string): Promise<NetWorthSummary> {
    const params = new URLSearchParams();
    if (asOfDate) params.set('asOfDate', asOfDate);
    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/networth/user/${userId}/summary?${query}`
      : `${API_BASE_URL}/networth/user/${userId}/summary`;
    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<NetWorthSummary>(response);
  },

  async getHistory(
    userId: number,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<NetWorthHistoryPoint[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      groupBy,
    });
    const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/history?${params}`, {
      credentials: 'include',
    });
    return handleResponse<NetWorthHistoryPoint[]>(response);
  },

  async getComparison(
    userId: number,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<NetWorthComparison> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      groupBy,
    });
    const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/comparison?${params}`, {
      credentials: 'include',
    });
    return handleResponse<NetWorthComparison>(response);
  },

  async getProjection(
    userId: number,
    goalAmount?: number,
    projectionMonths: number = 12,
    includeRecurringTransfers: boolean = true,
    includeAverageExpenses: boolean = false,
    customItems?: CustomProjectionItem[]
  ): Promise<NetWorthProjection> {
    const params = new URLSearchParams();
    if (goalAmount !== undefined) {
      params.set('goalAmount', goalAmount.toString());
    }
    params.set('projectionMonths', projectionMonths.toString());
    params.set('includeRecurringTransfers', includeRecurringTransfers.toString());
    params.set('includeAverageExpenses', includeAverageExpenses.toString());

    // Use POST if custom items provided, GET otherwise
    if (customItems && customItems.length > 0) {
      const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/projection?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customItems),
        credentials: 'include',
      });
      return handleResponse<NetWorthProjection>(response);
    }

    const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/projection?${params}`, {
      credentials: 'include',
    });
    return handleResponse<NetWorthProjection>(response);
  },

  async getLiabilityPayoff(
    userId: number,
    settings?: LiabilityPayoffSettings[]
  ): Promise<LiabilityPayoffEstimate> {
    // Use POST if settings provided, GET otherwise
    if (settings && settings.length > 0) {
      const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/liability-payoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      return handleResponse<LiabilityPayoffEstimate>(response);
    }

    const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/liability-payoff`, {
      credentials: 'include',
    });
    return handleResponse<LiabilityPayoffEstimate>(response);
  },

  async getEarliestDate(userId: number): Promise<string | null> {
    const response = await fetch(`${API_BASE_URL}/networth/user/${userId}/earliest-date`, {
      credentials: 'include',
    });
    return handleResponse<string | null>(response);
  },
};

// Recurring Transaction types
export interface RecurringTransaction {
  id: number;
  assetId: number;
  assetName: string;
  amount: number;
  description: string;
  frequency: 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  dayOfWeek?: string;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  interestRate?: number; // Annual rate as percentage (e.g., 3.5 for 3.5%)
  isCompounding: boolean; // True = APY, False = APR
}

export interface CreateRecurringTransaction {
  assetId: number;
  amount: number;
  description: string;
  frequency: 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  dayOfWeek?: string;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  interestRate?: number; // Annual rate as percentage (e.g., 3.5 for 3.5%)
  isCompounding?: boolean; // True = APY, False = APR
}

export interface UpdateRecurringTransaction {
  amount?: number;
  description?: string;
  frequency?: 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  dayOfWeek?: string;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  interestRate?: number; // Annual rate as percentage (e.g., 3.5 for 3.5%)
  isCompounding?: boolean; // True = APY, False = APR
}

// Recurring Transaction API
export const recurringTransactionApi = {
  async getByUser(userId: number): Promise<RecurringTransaction[]> {
    const response = await fetch(`${API_BASE_URL}/recurringtransactions/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<RecurringTransaction[]>(response);
  },

  async getByAsset(assetId: number, userId: number): Promise<RecurringTransaction[]> {
    const response = await fetch(
      `${API_BASE_URL}/recurringtransactions/asset/${assetId}/user/${userId}`,
      { credentials: 'include' }
    );
    return handleResponse<RecurringTransaction[]>(response);
  },

  async getById(id: number, userId: number): Promise<RecurringTransaction> {
    const response = await fetch(`${API_BASE_URL}/recurringtransactions/${id}/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<RecurringTransaction>(response);
  },

  async create(
    userId: number,
    transaction: CreateRecurringTransaction
  ): Promise<RecurringTransaction> {
    const response = await fetch(`${API_BASE_URL}/recurringtransactions/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
      credentials: 'include',
    });
    return handleResponse<RecurringTransaction>(response);
  },

  async update(
    id: number,
    userId: number,
    transaction: UpdateRecurringTransaction
  ): Promise<RecurringTransaction> {
    const response = await fetch(`${API_BASE_URL}/recurringtransactions/${id}/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
      credentials: 'include',
    });
    return handleResponse<RecurringTransaction>(response);
  },

  async delete(id: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/recurringtransactions/${id}/user/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },
};

// Tag API
export const tagApi = {
  async getAll(userId: number): Promise<Tag[]> {
    const response = await fetch(`${API_BASE_URL}/tags/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<Tag[]>(response);
  },

  async getById(id: number, userId: number): Promise<Tag> {
    const response = await fetch(`${API_BASE_URL}/tags/${id}/user/${userId}`, {
      credentials: 'include',
    });
    return handleResponse<Tag>(response);
  },

  async create(userId: number, tag: CreateTag): Promise<Tag> {
    const response = await fetch(`${API_BASE_URL}/tags/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
      credentials: 'include',
    });
    return handleResponse<Tag>(response);
  },

  async update(id: number, userId: number, tag: UpdateTag): Promise<Tag> {
    const response = await fetch(`${API_BASE_URL}/tags/${id}/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
      credentials: 'include',
    });
    return handleResponse<Tag>(response);
  },

  async delete(id: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tags/${id}/user/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<void>(response);
  },
};

// Splitwise Types
export interface SplitwiseCurrentUser {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  displayName: string;
}

export interface SplitwiseStatus {
  isConfigured: boolean;
  user?: SplitwiseCurrentUser | null;
}

export interface SplitwiseGroupMember {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  displayName: string;
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  members: SplitwiseGroupMember[];
}

export interface SplitwiseGroupsResponse {
  groups: SplitwiseGroup[];
}

export interface SplitwiseExpensePreview {
  id: number;
  description: string;
  totalCost: number;
  userOwes: number;
  date: string;
  splitwiseCategory?: string;
  mappedCategoryId: number;
  mappedCategoryName: string;
  paidBy?: string;
  isPayment: boolean;
  isDuplicate: boolean;
  statusMessage?: string;
  canImport: boolean;
}

export interface SplitwiseImportResponse {
  dryRun: boolean;
  groupName: string;
  userName: string;
  startDate?: string;
  endDate?: string;
  totalExpenses: number;
  paymentsIgnored: number;
  duplicatesFound: number;
  importableCount: number;
  importedCount: number;
  totalAmount: number;
  expenses: SplitwiseExpensePreview[];
  availableCategories: Category[];
}

export interface SplitwiseImportRequest {
  groupId: number;
  splitwiseUserId: number;
  startDate?: string;
  endDate?: string;
  selectedExpenseIds?: number[];
  categoryOverrides?: Array<{ expenseId: number; categoryId: number }>;
}

// Splitwise API
export const splitwiseApi = {
  async getStatus(): Promise<SplitwiseStatus> {
    const response = await fetch(`${API_BASE_URL}/splitwise/status`, {
      credentials: 'include',
    });
    return handleResponse<SplitwiseStatus>(response);
  },

  async getGroups(): Promise<SplitwiseGroupsResponse> {
    const response = await fetch(`${API_BASE_URL}/splitwise/groups`, {
      credentials: 'include',
    });
    return handleResponse<SplitwiseGroupsResponse>(response);
  },

  async getGroupMembers(groupId: number): Promise<SplitwiseGroupMember[]> {
    const response = await fetch(`${API_BASE_URL}/splitwise/groups/${groupId}/members`, {
      credentials: 'include',
    });
    return handleResponse<SplitwiseGroupMember[]>(response);
  },

  async previewImport(request: SplitwiseImportRequest): Promise<SplitwiseImportResponse> {
    const response = await fetch(`${API_BASE_URL}/splitwise/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });
    return handleResponse<SplitwiseImportResponse>(response);
  },

  async importExpenses(request: SplitwiseImportRequest): Promise<SplitwiseImportResponse> {
    const response = await fetch(`${API_BASE_URL}/splitwise/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });
    return handleResponse<SplitwiseImportResponse>(response);
  },
};

// Capital One Types
export type CapitalOneCardType = 'QuickSilver' | 'VentureX';

export interface CapitalOneExpensePreview {
  rowNumber: number;
  transactionDate: string;
  postedDate: string;
  cardNumber: string;
  description: string;
  capitalOneCategory: string;
  amount: number;
  mappedCategoryId: number;
  mappedCategoryName: string;
  isCredit: boolean;
  isDuplicate: boolean;
  statusMessage?: string;
  canImport: boolean;
}

export interface CapitalOneExpenseCategoryOverride {
  rowNumber: number;
  categoryId: number;
}

export interface CapitalOneExpenseAmountSplit {
  rowNumber: number;
  splitBy: number;
}

export interface CapitalOneImportResponse {
  dryRun: boolean;
  cardType: string;
  fileName: string;
  totalTransactions: number;
  creditsSkipped: number;
  duplicatesFound: number;
  importableCount: number;
  importedCount: number;
  totalAmount: number;
  expenses: CapitalOneExpensePreview[];
  availableCategories: Category[];
}

// Capital One API
export const capitalOneApi = {
  async previewImport(file: File, cardType: CapitalOneCardType): Promise<CapitalOneImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cardType', cardType);

    const response = await fetch(`${API_BASE_URL}/capitalone/preview`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to preview import');
    }

    return response.json() as Promise<CapitalOneImportResponse>;
  },

  async importExpenses(
    file: File,
    cardType: CapitalOneCardType,
    selectedRowNumbers?: number[],
    categoryOverrides?: CapitalOneExpenseCategoryOverride[],
    amountSplits?: CapitalOneExpenseAmountSplit[]
  ): Promise<CapitalOneImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cardType', cardType);

    if (selectedRowNumbers && selectedRowNumbers.length > 0) {
      formData.append('selectedRowNumbers', selectedRowNumbers.join(','));
    }

    if (categoryOverrides && categoryOverrides.length > 0) {
      formData.append('categoryOverrides', JSON.stringify(categoryOverrides));
    }

    if (amountSplits && amountSplits.length > 0) {
      formData.append('amountSplits', JSON.stringify(amountSplits));
    }

    const response = await fetch(`${API_BASE_URL}/capitalone/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to import expenses');
    }

    return response.json() as Promise<CapitalOneImportResponse>;
  },
};
