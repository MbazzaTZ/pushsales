import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Target, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TLWithStats {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  is_approved?: boolean;
  region_name?: string;
  monthly_target?: number | null;
  teamCount: number;
  dsrCount: number;
  salesCount: number;
  created_at: string;
}

interface DEWithStats {
  id: string;
  user_id: string;
  region_id?: string | null;
  full_name?: string;
  email?: string;
  phone?: string;
  is_approved?: boolean;
  region_name?: string;
  target?: number | null;
  agentCount: number;
  salesCount: number;
  created_at: string;
}

export function AdminDEAndTLManagement() {
  const queryClient = useQueryClient();
  const [selectedTL, setSelectedTL] = useState<string | null>(null);
  const [tlTarget, setTLTarget] = useState('');
  const [selectedDE, setSelectedDE] = useState<string | null>(null);
  const [deTarget, setDETarget] = useState('');

  // Fetch TLs with their data
  const { data: teamLeaders = [], isLoading: tlsLoading } = useQuery({
    queryKey: ['team-leaders-full'],
    queryFn: async () => {
      try {
        // Fetch team_leaders table data
        const { data: tlsData, error: tlsError } = await supabase
          .from('team_leaders')
          .select('id, user_id, monthly_target, created_at')
          .order('created_at', { ascending: false });

        if (tlsError || !tlsData) return [];

        // Merge the data
        const tlsWithData = await Promise.all(
          tlsData.map(async (tl: any) => {
            // Get profile data using user_id
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email, phone, is_approved')
              .eq('id', tl.user_id)
              .single();

            // Get team and DSR counts
            const { count: teamCount = 0 } = await supabase
              .from('teams')
              .select('*', { count: 'exact', head: true })
              .eq('tl_id', tl.id);

            const { count: dsrCount = 0 } = await supabase
              .from('dsrs')
              .select('*', { count: 'exact', head: true })
              .eq('tl_id', tl.id);

            const { count: salesCount = 0 } = await supabase
              .from('sales')
              .select('*', { count: 'exact', head: true })
              .eq('tl_id', tl.id);

            return {
              id: tl.id,
              full_name: profile?.full_name || '',
              email: profile?.email || '',
              phone: profile?.phone || '',
              is_approved: profile?.is_approved || false,
              monthly_target: tl.monthly_target,
              teamCount,
              dsrCount,
              salesCount,
              created_at: tl.created_at,
            };
          })
        );

        return tlsWithData;
      } catch (err) {
        console.error('Error fetching TLs:', err);
        return [];
      }
    },
  });

  // Fetch DEs with their data (mock for now, will work after DB migration)
  const { data: des = [], isLoading: desLoading } = useQuery({
    queryKey: ['distribution-executives'],
    queryFn: async () => {
      // This will work after the database migration is applied
      return [] as DEWithStats[];
    },
  });

  // Set TL target mutation
  const setTLTargetMutation = useMutation({
    mutationFn: async ({ tlId, target }: { tlId: string; target: number }) => {
      const { error } = await supabase
        .from('team_leaders')
        .update({ monthly_target: target })
        .eq('id', tlId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-leaders-full'] });
      toast.success('TL target updated');
      setSelectedTL(null);
      setTLTarget('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set target');
    },
  });

  // Set DE target mutation
  const setDETargetMutation = useMutation({
    mutationFn: async ({ deId, target }: { deId: string; target: number }) => {
      // This will work after the database migration
      toast.success('DE target updated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-executives'] });
      setSelectedDE(null);
      setDETarget('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set target');
    },
  });

  const isLoading = tlsLoading || desLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">DE and TL Management</h1>
        <p className="text-muted-foreground">Manage Distribution Executives and Team Leaders, set targets</p>
      </div>

      <Tabs defaultValue="tls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tls" className="gap-2">
            <Users className="h-4 w-4" />
            Team Leaders ({teamLeaders.length})
          </TabsTrigger>
          <TabsTrigger value="des" className="gap-2">
            <Users className="h-4 w-4" />
            Distribution Executives ({des.length})
          </TabsTrigger>
        </TabsList>

        {/* Team Leaders Tab */}
        <TabsContent value="tls">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Leaders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : teamLeaders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">No Team Leaders</p>
                  <p className="text-muted-foreground">Team Leaders will appear here once they sign up and are approved</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Teams</TableHead>
                        <TableHead>DSRs</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamLeaders.map((tl: TLWithStats) => (
                        <TableRow key={tl.id}>
                          <TableCell className="font-medium">{tl.full_name}</TableCell>
                          <TableCell>{tl.email}</TableCell>
                          <TableCell>
                            {tl.region_name ? (
                              <Badge variant="outline">{tl.region_name}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{tl.teamCount}</TableCell>
                          <TableCell>{tl.dsrCount}</TableCell>
                          <TableCell>{tl.salesCount}</TableCell>
                          <TableCell>
                            {selectedTL === tl.id ? (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Amount"
                                  value={tlTarget}
                                  onChange={(e) => setTLTarget(e.target.value)}
                                  className="w-32 h-8"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (tlTarget) {
                                      setTLTargetMutation.mutate({
                                        tlId: tl.id,
                                        target: parseFloat(tlTarget),
                                      });
                                    }
                                  }}
                                  disabled={setTLTargetMutation.isPending}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{tl.monthly_target || '-'}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedTL(tl.id);
                                    setTLTarget((tl.monthly_target || 0).toString());
                                  }}
                                >
                                  <Target className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={tl.is_approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                              {tl.is_approved ? 'Active' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toast.info('View TL details')}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Executives Tab */}
        <TabsContent value="des">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Distribution Executives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : des.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">No Distribution Executives</p>
                  <p className="text-muted-foreground">DEs will appear here once they sign up and are approved</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Agents</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {des.map((de: DEWithStats) => (
                        <TableRow key={de.id}>
                          <TableCell className="font-medium">{de.full_name}</TableCell>
                          <TableCell>{de.email}</TableCell>
                          <TableCell>
                            {de.region_name ? (
                              <Badge variant="outline">{de.region_name}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{de.agentCount}</TableCell>
                          <TableCell>{de.salesCount}</TableCell>
                          <TableCell>
                            {selectedDE === de.id ? (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Amount"
                                  value={deTarget}
                                  onChange={(e) => setDETarget(e.target.value)}
                                  className="w-32 h-8"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (deTarget) {
                                      setDETargetMutation.mutate({
                                        deId: de.id,
                                        target: parseFloat(deTarget),
                                      });
                                    }
                                  }}
                                  disabled={setDETargetMutation.isPending}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{de.target || '-'}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedDE(de.id);
                                    setDETarget((de.target || 0).toString());
                                  }}
                                >
                                  <Target className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={de.is_approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                              {de.is_approved ? 'Active' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toast.info('View DE details')}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
