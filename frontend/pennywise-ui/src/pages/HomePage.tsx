import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LineChart,
  PieChart,
  Shield,
  Sparkles,
  TrendingDown,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { summaryApi, userApi, type DashboardSummary } from "@/lib/api";

const DEMO_USER = {
  username: "Demo User",
  email: "demo@pennywise.app",
};

export default function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const getActiveUserId = useCallback(async () => {
    if (userId) return userId;

    const existingUser = await userApi.getByEmail(DEMO_USER.email);
    if (existingUser) {
      setUserId(existingUser.id);
      return existingUser.id;
    }

    const createdUser = await userApi.create(DEMO_USER);
    setUserId(createdUser.id);
    return createdUser.id;
  }, [userId]);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeUserId = await getActiveUserId();
      const data = await summaryApi.getDashboard(activeUserId);
      setSummary(data);
    } catch (err) {
      console.error("Error loading summary:", err);
      setError("We couldn't load your summary right now.");
    } finally {
      setLoading(false);
    }
  }, [getActiveUserId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const hasSummaryData =
    summary != null &&
    (summary.monthTracked > 0 ||
      summary.averageTicket > 0 ||
      summary.activeCategories > 0 ||
      summary.recentTransactions.length > 0);

  const highlightCards =
    summary && hasSummaryData
      ? [
          {
            label: "Tracked this month",
            value: formatCurrency(summary.monthTracked),
            hint:
              summary.monthChangePercent !== 0
                ? `${formatPercent(summary.monthChangePercent)} vs last month`
                : "No previous month data yet",
          },
          {
            label: "Average ticket",
            value: formatCurrency(summary.averageTicket),
            hint:
              summary.averageTicket > 0
                ? "Across your logged spend"
                : "Add a transaction to see insights",
          },
          {
            label: "Categories tuned",
            value: `${summary.activeCategories} active`,
            hint:
              summary.activeCategories > 0
                ? "Based on your categorized spend"
                : "Capture expenses to activate categories",
          },
        ]
      : [];

  const hasTransactions = (summary?.recentTransactions.length ?? 0) > 0;
  const cashflowBadge = loading ? "Loading" : error ? "Offline" : "Synced";

  const features = [
    {
      icon: TrendingDown,
      title: "Live spend radar",
      copy: "Spot burn rates early with trending views and weekly digest summaries.",
      badge: "Control",
    },
    {
      icon: BarChart3,
      title: "Clarity dashboards",
      copy: "Purpose-built reports for cash flow, recurring spend, and category drift.",
      badge: "Visibility",
    },
    {
      icon: PieChart,
      title: "Smart categories",
      copy: "Adaptive rules keep new expenses organized without manual cleanup.",
      badge: "Automation",
    },
    {
      icon: Zap,
      title: "Capture in seconds",
      copy: "Forward a receipt, tap add, or paste a link—Pennywise normalizes it.",
      badge: "Speed",
    },
    {
      icon: Shield,
      title: "Secure vault",
      copy: "Encrypted by default with audit-friendly exports for your records.",
      badge: "Trust",
    },
    {
      icon: Wallet,
      title: "Envelope guardrails",
      copy: "Create envelopes for trips or teams and keep spend aligned to intent.",
      badge: "Discipline",
    },
  ];

  const workflow = [
    {
      icon: Clock3,
      title: "Capture once",
      copy: "Drop a receipt, quick-add on mobile, or import from your card feed.",
    },
    {
      icon: LineChart,
      title: "Auto-classify",
      copy: "Rules apply tags, merchants, and budgets so every dollar is contextual.",
    },
    {
      icon: CheckCircle2,
      title: "Decide faster",
      copy: "Answers for 'Can we afford it?' or 'Where did it go?' in two clicks.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <Wallet className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pennywise
              </p>
              <p className="text-lg font-semibold">
                Feel in control of your finances
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="hover:text-foreground" href="#features">
              Platform
            </a>
            <a className="hover:text-foreground" href="#workflow">
              How it works
            </a>
            <Link to="/expenses" className="hover:text-foreground">
              Expenses
            </Link>
            <Link to="/categories" className="hover:text-foreground">
              Categories
            </Link>
            <ThemeToggle />
            <Link to="/dashboard">
              <Button className="bg-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400">
                Launch app
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3 md:hidden">
            <Link to="/dashboard">
              <Button
                size="sm"
                className="bg-emerald-500 text-primary-foreground hover:bg-emerald-400"
              >
                Launch
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-4 pb-20 pt-14 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm shadow-emerald-500/20 backdrop-blur">
                <Sparkles className="h-4 w-4 text-amber-300" />
                Intentional money management
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                  A calmer home for your spending
                </h1>
                <p className="text-lg text-muted-foreground">
                  Pennywise keeps every transaction organized, contextual, and
                  ready to answer the questions that matter: where did it go,
                  and what happens next.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                  >
                    Open dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/expenses">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                  >
                    Add an expense
                  </Button>
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-border/40"
                    >
                      <p className="text-sm text-muted-foreground">Loading...</p>
                      <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted/40" />
                      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted/30" />
                    </div>
                  ))
                ) : error ? (
                  <div className="sm:col-span-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-border/40">
                    <p className="text-sm font-semibold text-foreground">
                      Unable to load your highlights.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Check your connection or try again in a moment.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 border-border/60 bg-card/70 text-foreground"
                      onClick={loadSummary}
                    >
                      Retry
                    </Button>
                  </div>
                ) : hasSummaryData ? (
                  highlightCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-border/40"
                    >
                      <p className="text-sm text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {item.value}
                      </p>
                      <p className="text-xs text-emerald-200/90">{item.hint}</p>
                    </div>
                  ))
                ) : (
                  <div className="sm:col-span-3 rounded-2xl border border-dashed border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-border/40">
                    <p className="text-sm font-semibold text-foreground">
                      No spending to show yet.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add an expense to see your live highlights appear here.
                    </p>
                    <Link to="/expenses" className="inline-block">
                      <Button
                        size="sm"
                        className="mt-3 bg-emerald-500 text-primary-foreground shadow-emerald-500/30 hover:bg-emerald-400"
                      >
                        Capture an expense
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-400/20 blur-3xl" />
              <Card className="relative overflow-hidden border-border/60 bg-card/80 text-foreground shadow-2xl backdrop-blur">
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-foreground">
                      Live cashflow
                    </CardTitle>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        error
                          ? "bg-destructive/15 text-destructive-foreground"
                          : "bg-emerald-500/20 text-emerald-100"
                      }`}
                    >
                      {cashflowBadge}
                    </span>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    {loading
                      ? "Fetching your latest totals..."
                      : error
                        ? "We couldn't sync right now."
                        : hasSummaryData
                          ? "Updated from your recent activity"
                          : "Add an expense to see live cashflow"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="space-y-4 text-muted-foreground">
                      <div className="h-6 w-24 animate-pulse rounded bg-muted/30" />
                      <div className="h-16 w-full animate-pulse rounded bg-muted/20" />
                      <div className="h-24 w-full animate-pulse rounded bg-muted/20" />
                    </div>
                  ) : error ? (
                    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        We couldn't load your cashflow.
                      </p>
                      <p>Check your connection and try again.</p>
                      <Button
                        variant="outline"
                        className="mt-3 border-border/60 bg-card/70 text-foreground"
                        onClick={loadSummary}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total tracked
                            </p>
                            <p className="text-3xl font-semibold text-foreground">
                              {formatCurrency(summary?.totalTracked ?? 0)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                          >
                            {summary
                              ? `${formatPercent(
                                  summary.monthChangePercent,
                                )} this month`
                              : "No data yet"}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="rounded-xl border border-border/50 bg-card/80 p-3">
                            <p className="flex items-center justify-between text-xs text-muted-foreground">
                              Spent{" "}
                              <span className="text-emerald-200">
                                {formatPercent(summary?.monthChangePercent ?? 0)}
                              </span>
                            </p>
                            <p className="text-xl font-semibold text-foreground">
                              {formatCurrency(summary?.monthTracked ?? 0)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-card/80 p-3">
                            <p className="flex items-center justify-between text-xs text-muted-foreground">
                              Remaining{" "}
                              <span className="text-emerald-200">
                                {summary &&
                                summary.monthTracked + summary.remainingThisMonth > 0
                                  ? `${Math.round(
                                      (summary.remainingThisMonth /
                                        Math.max(
                                          summary.monthTracked + summary.remainingThisMonth,
                                          1,
                                        )) *
                                        100,
                                    )}%`
                                  : "0%"}
                              </span>
                            </p>
                            <p className="text-xl font-semibold text-foreground">
                              {formatCurrency(summary?.remainingThisMonth ?? 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {hasTransactions ? (
                          (summary?.recentTransactions ?? []).map((line) => {
                            const isOutflow = line.amount >= 0;
                            const displayAmount = `${isOutflow ? "-" : "+"}${formatCurrency(
                              Math.abs(line.amount),
                            )}`;

                            return (
                              <div
                                key={line.id}
                                className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/80 px-4 py-3 text-sm text-muted-foreground"
                              >
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {line.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(line.date).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className="rounded-full bg-card/70 px-3 py-1 text-xs text-muted-foreground"
                                    style={
                                      line.categoryColor
                                        ? {
                                            backgroundColor: `${line.categoryColor}22`,
                                            color: line.categoryColor,
                                            borderColor: line.categoryColor,
                                            borderWidth: 1,
                                          }
                                        : undefined
                                    }
                                  >
                                    {line.category ?? "Uncategorized"}
                                  </span>
                                  <p
                                    className={`text-base font-semibold ${
                                      isOutflow ? "text-rose-200" : "text-emerald-200"
                                    }`}
                                  >
                                    {displayAmount}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border/60 bg-card/80 px-4 py-6 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">
                              No recent transactions yet.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Capture an expense to see it flow into your live view.
                            </p>
                            <Link to="/expenses" className="inline-block">
                              <Button
                                size="sm"
                                className="mt-3 bg-emerald-500 text-primary-foreground hover:bg-emerald-400"
                              >
                                Add expense
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 pb-20">
          <div className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">
                Platform
              </p>
              <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
                Designed for clarity
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                The Pennywise home base blends live insights, crisp
                visualizations, and automation so you can get to confident
                decisions faster.
              </p>
            </div>
            <Link to="/dashboard">
              <Button
                variant="secondary"
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
              >
                View a sample dashboard
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 via-background to-card/50 p-px shadow-lg shadow-black/30"
              >
                <div className="h-full rounded-[22px] bg-background/90 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card/80 text-foreground">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.copy}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    Learn more
                    <ArrowRight className="h-4 w-4 transition duration-150 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="container mx-auto px-4 pb-20">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-r from-background via-card/70 to-card/50 p-8 shadow-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">
                  Flow
                </p>
                <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
                  From capture to clarity
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                  The Pennywise loop is built to keep you proactive—no dusty
                  spreadsheets or surprise bills.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                  <CircleDollarSign className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Built for teams and households that want answers on demand.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm shadow-black/20 backdrop-blur"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <Card className="relative overflow-hidden border-border/60 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-cyan-400/10 text-foreground shadow-2xl">
            <div className="absolute inset-0 opacity-40 blur-3xl">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-emerald-500/50 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-cyan-400/40 to-transparent" />
            </div>
            <CardContent className="relative z-10 px-6 py-12 md:px-12">
              <div className="grid items-center gap-10 md:grid-cols-[2fr,1fr]">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">
                    Get started
                  </p>
                  <h3 className="text-3xl font-semibold md:text-4xl">
                    Bring Pennywise into your week and stay two steps ahead.
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    Spin up your dashboard, set envelopes for the month, and
                    watch every transaction land exactly where it belongs.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to="/dashboard">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-background text-foreground shadow-lg shadow-black/30 transition hover:-translate-y-0.5"
                      >
                        Go to dashboard
                      </Button>
                    </Link>
                    <Link to="/expenses">
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full sm:w-auto border-border/60 bg-card/70 text-foreground hover:bg-card/80"
                      >
                        Capture an expense
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="rounded-3xl border border-border/60 bg-card/70 p-5 text-sm text-muted-foreground shadow-lg backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      In sync
                    </span>
                    <span className="rounded-full bg-card/70 px-3 py-1 text-xs text-foreground">
                      Realtime
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Recurring
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          Bills cleared
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-emerald-100">
                        92%
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          On budget
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          Envelope health
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-amber-100">
                        88%
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-card/70 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Time saved
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          Manual cleanup
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-cyan-100">
                        -12 hr/mo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background/80">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-300" />
              <p className="font-semibold text-foreground">Pennywise</p>
            </div>
            <p>
              Built with React, TypeScript, and a secure .NET + PostgreSQL
              stack.
            </p>
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} Pennywise
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
