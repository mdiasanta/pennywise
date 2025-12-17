import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Asset, NetWorthSummary } from '@/lib/api';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from './constants';

interface NetWorthSummaryCardsProps {
  summary: NetWorthSummary | null;
  assets: Asset[];
  loading: boolean;
}

export function NetWorthSummaryCards({ summary, assets, loading }: NetWorthSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {loading ? '...' : formatCurrency(summary?.netWorth || 0)}
          </div>
          {summary && summary.changePercent !== 0 && (
            <div
              className={`mt-1 flex items-center text-xs ${
                summary.changeFromLastPeriod >= 0 ? 'text-success-foreground' : 'text-destructive'
              }`}
            >
              {summary.changeFromLastPeriod >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {formatCurrency(Math.abs(summary.changeFromLastPeriod))} (
              {summary.changePercent.toFixed(1)}%)
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-success-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {loading ? '...' : formatCurrency(summary?.totalAssets || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {assets.filter((a) => !a.isLiability).length} accounts
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Liabilities
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <TrendingDown className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {loading ? '...' : formatCurrency(summary?.totalLiabilities || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {assets.filter((a) => a.isLiability).length} accounts
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Change</CardTitle>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              (summary?.changeFromLastPeriod || 0) >= 0
                ? 'bg-success text-success-foreground'
                : 'bg-destructive text-destructive-foreground'
            }`}
          >
            {(summary?.changeFromLastPeriod || 0) >= 0 ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {loading ? '...' : formatCurrency(Math.abs(summary?.changeFromLastPeriod || 0))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">vs 30 days ago</p>
        </CardContent>
      </Card>
    </div>
  );
}
