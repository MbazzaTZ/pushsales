import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function AdminTLManagement() {
  // Fetch TLs with their data
  const { data: teamLeaders = [], isLoading } = useQuery({
    queryKey: ['team-leaders-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_leaders')
        .select(`
          id,
          monthly_target,
          created_at,
          profiles!inner(full_name, email, phone, is_approved),
          regions(name, code)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get team and DSR counts for each TL
      const tlsWithCounts = await Promise.all(
        (data || []).map(async (tl) => {
          const { count: teamCount } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('tl_id', tl.id);

          const { count: dsrCount } = await supabase
            .from('dsrs')
            .select('*', { count: 'exact', head: true })
            .eq('tl_id', tl.id);

          const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('tl_id', tl.id);

          return {
            ...tl,
            teamCount: teamCount || 0,
            dsrCount: dsrCount || 0,
            salesCount: salesCount || 0,
          };
        })
      );

      return tlsWithCounts;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Leader Management</h1>
        <p className="text-muted-foreground">View and manage all Team Leaders</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Leaders ({teamLeaders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamLeaders.length === 0 ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamLeaders.map((tl: any) => (
                    <TableRow key={tl.id}>
                      <TableCell className="font-medium">{tl.profiles?.full_name}</TableCell>
                      <TableCell>{tl.profiles?.email}</TableCell>
                      <TableCell>
                        {tl.regions ? (
                          <Badge variant="outline">{tl.regions.name}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{tl.teamCount}</TableCell>
                      <TableCell>{tl.dsrCount}</TableCell>
                      <TableCell>{tl.salesCount}</TableCell>
                      <TableCell>{tl.monthly_target}</TableCell>
                      <TableCell>
                        <Badge className={tl.profiles?.is_approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                          {tl.profiles?.is_approved ? 'Active' : 'Pending'}
                        </Badge>
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
  );
}
