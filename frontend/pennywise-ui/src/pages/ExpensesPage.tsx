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
import { expenseApi, categoryApi } from '@/lib/api';
import type { Expense, Category, CreateExpense, UpdateExpense } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

// For demo purposes, using userId = 1
const DEMO_USER_ID = 1;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        expenseApi.getAll(DEMO_USER_ID),
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
    
    try {
      if (editingExpense) {
        // Update existing expense
        const updateData: UpdateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date).toISOString(),
          categoryId: parseInt(formData.categoryId),
        };
        
        await expenseApi.update(editingExpense.id, DEMO_USER_ID, updateData);
        toast({
          title: 'Success',
          description: 'Expense updated successfully.',
        });
      } else {
        // Create new expense
        const createData: CreateExpense = {
          title: formData.title,
          description: formData.description || undefined,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date).toISOString(),
          userId: DEMO_USER_ID,
          categoryId: parseInt(formData.categoryId),
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
      await expenseApi.delete(id, DEMO_USER_ID);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Wallet className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Pennywise</h1>
              </div>
            </div>
            <nav className="flex items-center space-x-2">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Expense Management</h2>
              <p className="text-muted-foreground mt-1">
                Track and manage all your expenses in one place
              </p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingExpense 
                        ? 'Update the expense details below.'
                        : 'Fill in the details to create a new expense record.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g., Grocery shopping"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
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
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingExpense ? 'Update' : 'Create'} Expense
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
              <CardDescription>
                A complete list of all your expense records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading expenses...
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No expenses found.</p>
                  <p className="text-sm mt-2">Click "Add Expense" to create your first expense record.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell>{expense.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              style={expense.categoryColor ? {
                                backgroundColor: expense.categoryColor + '20',
                                color: expense.categoryColor,
                                borderColor: expense.categoryColor,
                              } : undefined}
                            >
                              {expense.categoryName || 'Uncategorized'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {expense.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this expense? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}
