import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Asset } from '@/lib/api';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ASSET_COLOR_PALETTE, formatCurrency } from './constants';

interface ChartDataPoint {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  expenses: number;
}

interface AccountsChartDataPoint {
  date: string;
  [assetName: string]: number | string;
}

interface NetWorthChartsProps {
  chartData: ChartDataPoint[];
  accountsChartData: AccountsChartDataPoint[];
  assets: Asset[];
  loading: boolean;
  timeRangeLabel: string;
}

const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
};

export function NetWorthCharts({
  chartData,
  accountsChartData,
  assets,
  loading,
  timeRangeLabel,
}: NetWorthChartsProps) {
  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading net worth data...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p>No historical data found for the selected time period.</p>
            <p className="mt-2 text-sm">Add accounts and update their balances to see trends.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
      <CardHeader>
        <CardTitle>Net Worth Over Time</CardTitle>
        <CardDescription className="text-muted-foreground">
          Track your financial progress - {timeRangeLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="networth" className="w-full">
          <TabsList className="mb-4 bg-card/60 text-foreground">
            <TabsTrigger
              value="networth"
              className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
            >
              Net Worth
            </TabsTrigger>
            <TabsTrigger
              value="breakdown"
              className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
            >
              Assets vs Liabilities
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
            >
              Accounts
            </TabsTrigger>
            <TabsTrigger
              value="comparison"
              className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
            >
              vs Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="networth">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#8884d8"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="breakdown">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Line
                  type="monotone"
                  dataKey="assets"
                  name="Assets"
                  stroke="#00C49F"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  name="Liabilities"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="accounts">
            {accountsChartData.length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                <p>No account history data available. Update account balances to see trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={accountsChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#cbd5f5' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: '#cbd5f5' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                  {assets.map((asset) => (
                    <Line
                      key={asset.id}
                      type="monotone"
                      dataKey={asset.name}
                      name={asset.name}
                      stroke={
                        asset.color ||
                        ASSET_COLOR_PALETTE[assets.indexOf(asset) % ASSET_COLOR_PALETTE.length]
                      }
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray={asset.isLiability ? '5 5' : undefined}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="comparison">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: '#cbd5f5' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#FFBB28"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
