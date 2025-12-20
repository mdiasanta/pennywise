import { AppLayout } from '@/components/AppLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useTags } from '@/hooks/use-tags';
import { useToast } from '@/hooks/use-toast';
import type { Tag } from '@/lib/api';
import { Pencil, Plus, RefreshCw, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';

const DEFAULT_COLOR = '#6366f1';
const COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export default function TagsPage() {
  const { isAuthenticated } = useAuth();
  const { tags, isLoading, isSaving, deletingId, error, refresh, createTag, updateTag, deleteTag } =
    useTags();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    color: DEFAULT_COLOR,
  });

  const resetForm = () => {
    setFormValues({
      name: '',
      color: DEFAULT_COLOR,
    });
    setActiveTag(null);
    setValidationError(null);
  };

  const startCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const startEdit = (tag: Tag) => {
    setFormValues({
      name: tag.name,
      color: tag.color || DEFAULT_COLOR,
    });
    setActiveTag(tag);
    setValidationError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = formValues.name.trim();
    const trimmedColor = formValues.color.trim();

    if (!trimmedName) {
      setValidationError('Name is required.');
      return;
    }

    if (!COLOR_PATTERN.test(trimmedColor)) {
      setValidationError('Color must be a valid hex code like #6366f1.');
      return;
    }

    try {
      if (activeTag) {
        await updateTag(activeTag.id, {
          name: trimmedName,
          color: trimmedColor,
        });
        toast({
          title: 'Tag updated',
          description: `${trimmedName} was updated successfully.`,
        });
      } else {
        await createTag({
          name: trimmedName,
          color: trimmedColor,
        });
        toast({
          title: 'Tag created',
          description: `${trimmedName} is ready to use.`,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save tag right now.',
      });
    }
  };

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag(tag.id);
      toast({
        title: 'Tag deleted',
        description: `${tag.name} has been removed.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete the tag right now.',
      });
    }
  };

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <AppLayout title="Tags" description="Create, edit, and manage expense tags">
        <div className="mx-auto max-w-2xl py-12">
          <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign in to manage tags</CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your account to create, edit, and organize your expense tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <GoogleSignInButton />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Tags" description="Create, edit, and manage expense tags">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Summary Cards and Add Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Total Tags</p>
              <p className="text-xl font-semibold text-foreground">{tags.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-black/10">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xl font-semibold text-foreground">
                {isLoading ? 'Loading...' : isSaving ? 'Saving...' : 'Ready'}
              </p>
            </div>
            {error && (
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add tag
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/60 bg-card text-foreground">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{activeTag ? 'Edit tag' : 'Add tag'}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {activeTag
                      ? 'Update this tag to keep your expenses organized.'
                      : 'Create a tag with a clear name and color for quick recognition.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={formValues.name}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      required
                      className="border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder="e.g., work, personal, urgent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-muted-foreground">
                      Color *
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="color"
                        type="color"
                        value={formValues.color}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        className="h-10 w-16 cursor-pointer border-border/60 bg-card"
                        required
                      />
                      <Input
                        value={formValues.color}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        pattern={COLOR_PATTERN.source}
                        className="flex-1 border-border/60 bg-card text-foreground placeholder:text-muted-foreground"
                        placeholder="#6366f1"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pick a color that will show up alongside expenses with this tag.
                    </p>
                  </div>

                  {validationError ? (
                    <p className="text-sm text-destructive">{validationError}</p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : activeTag ? 'Update tag' : 'Create tag'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-border/60 bg-card/80 text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="h-5 w-5" />
                All tags
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage tag names and colors. Tags can be added to expenses for additional
                organization.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border/60 bg-card/80 text-foreground hover:bg-card/70"
                onClick={() => refresh()}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90"
                onClick={startCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                New tag
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No tags yet.</p>
                <p className="mt-2 text-sm">
                  Create your first tag to add extra labels to your expenses.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[500px] text-foreground">
                  <TableHeader className="[&_tr]:border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Color</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id} className="border-border/60 hover:bg-card/80">
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="border-border/60 bg-card/70 text-foreground"
                              style={
                                tag.color
                                  ? {
                                      backgroundColor: tag.color + '22',
                                      color: tag.color,
                                      borderColor: tag.color,
                                    }
                                  : undefined
                              }
                            >
                              {tag.name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              className="h-6 w-6 rounded-full border border-border/60"
                              style={{
                                backgroundColor: tag.color || DEFAULT_COLOR,
                              }}
                              aria-label="Tag color"
                            />
                            <span className="text-sm text-muted-foreground">
                              {tag.color || DEFAULT_COLOR}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tag.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-foreground hover:bg-card/70"
                              onClick={() => startEdit(tag)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-border/60 bg-card text-foreground">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete tag</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    This will remove the tag "{tag.name}" from your workspace. Any
                                    expenses with this tag will have the tag removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border/60 bg-card/80 text-foreground hover:bg-card/70">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(tag)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deletingId === tag.id}
                                  >
                                    {deletingId === tag.id ? 'Deleting...' : 'Delete'}
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
    </AppLayout>
  );
}
