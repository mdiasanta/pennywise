import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

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
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-gradient-1 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-gradient-2 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-3 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand ring-1 ring-primary/30">
              <Wallet className="h-6 w-6 text-brand-muted" />
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
            <ThemeToggle />
            <GoogleSignInButton />
          </nav>

          <div className="flex items-center gap-3 md:hidden">
            <GoogleSignInButton />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-4 pb-20 pt-14 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm shadow-primary/20 backdrop-blur">
              <Sparkles className="h-4 w-4 text-warning" />
              Intentional money management
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                A calmer home for your spending
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Pennywise keeps every transaction organized, contextual, and
                ready to answer the questions that matter: where did it go,
                and what happens next.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <GoogleSignInButton />
            </div>

            {/* Feature highlights */}
            <div className="grid gap-4 pt-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4 shadow-sm shadow-border/40">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-brand text-brand-foreground mb-3">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Track spending in real-time
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  See where every dollar goes with live dashboards and alerts
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4 shadow-sm shadow-border/40">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-info text-info-foreground mb-3">
                  <PieChart className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Smart categorization
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto-organize expenses into meaningful categories
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4 shadow-sm shadow-border/40">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-success text-success-foreground mb-3">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Insightful reports
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Make better financial decisions with clear visualizations
                </p>
              </div>
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
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.copy}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-success-foreground">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
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
          <Card className="relative overflow-hidden border-border/60 bg-gradient-to-r from-primary/20 via-primary/10 to-info/10 text-foreground shadow-2xl">
            <div className="absolute inset-0 opacity-40 blur-3xl">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary/50 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-info/40 to-transparent" />
            </div>
            <CardContent className="relative z-10 px-6 py-12 md:px-12">
              <div className="grid items-center gap-10 md:grid-cols-[2fr,1fr]">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-success-foreground">
                    Get started
                  </p>
                  <h3 className="text-3xl font-semibold md:text-4xl">
                    Bring Pennywise into your week and stay two steps ahead.
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    Sign in to access your dashboard, set up envelopes for the month, and
                    watch every transaction land exactly where it belongs.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <GoogleSignInButton />
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
                      <p className="text-lg font-semibold text-success-foreground">
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
                      <p className="text-lg font-semibold text-warning-foreground">
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
                      <p className="text-lg font-semibold text-info-foreground">
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
              <Wallet className="h-5 w-5 text-brand-muted" />
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
