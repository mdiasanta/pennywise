import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Pencil, Trash2, Home, BarChart3, ArrowLeft } from 'lucide-react';
import { expenseApi, categoryApi, userApi } from '@/lib/api';
import type { Expense, Category, CreateExpense, UpdateExpense } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { ThemeToggle } from '@/components/ThemeToggle';

const DEMO_USER = {
  username: 'Demo User',
  email: 'demo@pennywise.app',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const getActiveUserId = async () => {
    if (userId) return userId;

    const existingUser = await userApi.getByEmail(DEMO_USER.email);
    if (existingUser) {
      setUserId(existingUser.id);
      return existingUser.id;
    }

    const newUser = await userApi.create(DEMO_USER);
    setUserId(newUser.id);
    return newUser.id;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const activeUserId = await getActiveUserId();
      const [expensesData, categoriesData] = await Promise.all([
        expenseApi.getAll(activeUserId),
        categoryApi.getAll(),
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data. Please try again.',
      });
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
    });
    setEditingExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    const parsedCategoryId = parseInt(formData.categoryId, 10);

    if (Number.isNaN(parsedAmount) || Number.isNaN(parsedCategoryId)) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter an amount and choose a category before saving.',
      });
      return;
    }
    
    try {
      const activeUserId = await getActiveUserId();

      if (editingExpense) {
        // Update existing expense
        const updateData: UpdateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parsedAmount,
          date: new Date(formData.date).toISOString(),
          categoryId: parsedCategoryId,
        };
        
        await expenseApi.update(editingExpense.id, activeUserId, updateData);
        toast({
          title: 'Success',
          description: 'Expense updated successfully.',
        });
      } else {
        // Create new expense
        const createData: CreateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parsedAmount,
          date: new Date(formData.date).toISOString(),
          userId: activeUserId,
          categoryId: parsedCategoryId,
        };
        
        await expenseApi.create(createData);
        toast({
          title: 'Success',
          description: 'Expense created successfully.',
        });
      }
      
      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save expense. Please try again.',
      });
      console.error('Error saving expense:', error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split('T')[0],
      categoryId: expense.categoryId.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const activeUserId = await getActiveUserId();
      await expenseApi.delete(id, activeUserId);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully.',
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete expense. Please try again.',
      });
      console.error('Error deleting expense:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="border border-border/60 text-foreground hover:bg-card/70"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Wallet className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pennywise</p>
                <p className="text-lg font-semibold text-foreground">Expense workspace</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-card/70">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <ThemeToggle />
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 text-primary-foreground shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:bg-emerald-400">
                  <Plus className="mr-2 h-4 w-4" />
                  Add expense
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border/60 bg-card text-foreground">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {editingExpense
                        ? 'Update the expense details below.'
                        : 'Fill in the details to create a new expense record.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-muted-foreground">Title *</Label>
                      <Input
                        id="title"
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g., Grocery shopping"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-muted-foreground">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-muted-foreground">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        className="border-border/60 bg-card text-foreground"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-muted-foreground">Category *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                        required
                      >
                        <SelectTrigger className="border-border/60 bg-card text-foreground">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="border-border/60 bg-card text-foreground">
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground">Description</Label>
                      <Textarea
                        id="description"
                        className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Add any additional details..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-500 text-primary-foreground hover:bg-emerald-400"
                    >
                      {editingExpense ? 'Update' : 'Create'} Expense
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </nav>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-black/20 backdrop-blur md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expenses</p>
                <h1 className="text-3xl font-semibold md:text-4xl">Control every line item</h1>
                <p className="max-w-2xl text-muted-foreground">
                  Capture, edit, and audit expenses with the same glassy workspace as your dashboard.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Total spend</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Entries</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{expenses.length}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/10">
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{categories.length}</p>
                </div>
              </div>
            </div>
          </section>

          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
              <CardDescription className="text-muted-foreground">
                A complete list of all your expense records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading expenses...
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No expenses found.</p>
                  <p className="mt-2 text-sm">Click "Add expense" to create your first expense record.</p>
                </div>
              ) : (
                <Table className="text-foreground">
                  <TableHeader className="[&_tr]:border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Title</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="border-border/60 hover:bg-card/80"
                      >
                        <TableCell className="font-medium text-foreground">
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell className="text-foreground">{expense.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="border-border/60 bg-card/70 text-foreground"
                            style={expense.categoryColor ? {
                              backgroundColor: expense.categoryColor + '22',
                              color: expense.categoryColor,
                              borderColor: expense.categoryColor,
                            } : undefined}
                          >
                            {expense.categoryName || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {expense.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-foreground hover:bg-card/70"
                              onClick={() => handleEdit(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-border/60 bg-card text-foreground">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete this expense? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(expense.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}
