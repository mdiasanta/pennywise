import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wallet, 
  TrendingDown, 
  PieChart, 
  Shield, 
  Zap, 
  BarChart3 
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Pennywise</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/dashboard">
              <Button variant="default">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Take Control of Your
            <span className="text-primary"> Finances</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track expenses, analyze spending patterns, and achieve your financial goals with Pennywise - 
            your personal finance companion.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                <BarChart3 className="mr-2 h-5 w-5" />
                View Dashboard
              </Button>
            </Link>
            <Link to="/expenses">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <TrendingDown className="mr-2 h-5 w-5" />
                Manage Expenses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Everything you need to manage expenses</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make expense tracking simple and effective
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Expense Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Easily record and categorize all your expenses. Keep track of where your money goes 
                with detailed descriptions and custom categories.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Visual Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Beautiful charts and graphs help you understand your spending patterns. 
                See where you're spending the most at a glance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Dashboard Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get instant insights with your personalized dashboard. View daily, monthly, 
                and yearly expense summaries all in one place.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add, edit, or delete expenses in seconds. Our intuitive interface makes 
                managing your finances effortless and fast.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Secure & Reliable</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your financial data is stored securely with enterprise-grade database technology. 
                Built with .NET and PostgreSQL for reliability.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Category Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize expenses with custom categories. Create, edit, and color-code 
                categories to match your personal financial structure.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center space-y-6">
            <h3 className="text-3xl font-bold">Ready to get started?</h3>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Start tracking your expenses today and gain control over your financial future.
            </p>
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="mt-4">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built with React, TypeScript, .NET, and PostgreSQL</p>
            <p className="mt-2">© 2024 Pennywise - Personal Finance Application</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
