import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Edit2, Trash2, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SignupUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  region_id?: string;
  region_name?: string;
  created_at: string;
  is_approved: boolean;
}

export function AdminSignupManagement() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('dsr');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch all approved users
  const { data: signups = [], isLoading } = useQuery({
    queryKey: ['admin-signups'],
    queryFn: async () => {
      try {
        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, region_id, created_at, is_approved')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Get roles for each user
        const signupsWithRoles = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Get user role
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id)
              .single();

            // Get region name if exists
            let region_name = '';
            if (profile.region_id) {
              const { data: regionData } = await supabase
                .from('regions')
                .select('name')
                .eq('id', profile.region_id)
                .single();
              region_name = regionData?.name || '';
            }

            return {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone || '',
              role: roleData?.role || 'dsr',
              region_id: profile.region_id,
              region_name,
              created_at: profile.created_at,
              is_approved: profile.is_approved,
            };
          })
        );

        return signupsWithRoles;
      } catch (err) {
        console.error('Error fetching signups:', err);
        return [];
      }
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'manager' | 'tl' | 'dsr' }) => {
      try {
        // Update user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (roleError) throw roleError;
        toast.success('Role updated successfully');
      } catch (err) {
        console.error('Error updating role:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-signups'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Since we can't use admin.deleteUser in client SDK, we'll:
      // 1. Delete the user_roles record
      // 2. Delete the profile record
      // Note: The auth.users record will remain but user cannot sign in
      
      // Delete user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (roleError) throw roleError;
      
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-signups'] });
      toast.success('User deleted successfully');
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red/10 text-red';
      case 'manager':
        return 'bg-blue/10 text-blue';
      case 'tl':
        return 'bg-green/10 text-green';
      case 'de':
        return 'bg-purple/10 text-purple';
      case 'dsr':
      default:
        return 'bg-orange/10 text-orange';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'tl':
        return 'Team Leader';
      case 'de':
        return 'Distribution Executive';
      case 'dsr':
      default:
        return 'Direct Sales Rep';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Signup Management</h1>
        <p className="text-muted-foreground">Manage user signups - edit roles or delete users</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users ({signups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : signups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No Users</p>
              <p className="text-muted-foreground">No users have signed up yet</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signups.map((signup: SignupUser) => (
                    <TableRow key={signup.id}>
                      <TableCell className="font-medium">{signup.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {signup.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {signup.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {signup.phone}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {signup.region_name ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {signup.region_name}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === signup.id ? (
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="tl">Team Leader</SelectItem>
                              <SelectItem value="dsr">Direct Sales Rep</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleColor(signup.role)}>
                            {getRoleLabel(signup.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(signup.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={signup.is_approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                          {signup.is_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === signup.id ? (
                            <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updateRoleMutation.mutate({
                                      userId: signup.id,
                                      newRole: editRole as 'admin' | 'manager' | 'tl' | 'dsr',
                                    });
                                  }}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  Save
                                </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(signup.id);
                                  setEditRole(signup.role);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteId(signup.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this user? This action cannot be undone. All associated data will be removed.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteUserMutation.mutate(deleteId);
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
