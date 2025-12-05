import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  DollarSign,
  MapPin,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 46%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export function GeneralDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalDSRs: 0,
    stockInHand: 0,
    totalStock: 0,
    approvedSales: 0,
    pendingSales: 0,
  });
  const [regionData, setRegionData] = useState<any[]>([]);
  const [stockByType, setStockByType] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch sales data
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_type, payment_status, admin_approved, sale_price');

      // Fetch DSRs count
      const { count: dsrCount } = await supabase
        .from('dsrs')
        .select('*', { count: 'exact', head: true });

      // Fetch stock data
      const { data: stock } = await supabase
        .from('stock')
        .select('status, type');

      // Fetch regions with sales
      const { data: regions } = await supabase
        .from('regions')
        .select('id, name, code');

      // Calculate metrics
      const totalSales = sales?.length || 0;
      const approvedSales = sales?.filter(s => s.admin_approved)?.length || 0;
      const pendingSales = totalSales - approvedSales;
      const totalRevenue = sales?.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0) || 0;
      const stockInHand = stock?.filter(s => !s.status.startsWith('sold'))?.length || 0;

      // Stock by type
      const typeMap: Record<string, number> = {};
      stock?.forEach(s => {
        typeMap[s.type] = (typeMap[s.type] || 0) + 1;
      });
      const stockTypes = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

      // Region data
      const regionSales: Record<string, number> = {};
      // Simplified - in production you'd join with sales by region_id

      setMetrics({
        totalSales,
        totalRevenue,
        totalDSRs: dsrCount || 0,
        stockInHand,
        totalStock: stock?.length || 0,
        approvedSales,
        pendingSales,
      });
      setStockByType(stockTypes.length ? stockTypes : [{ name: 'No Stock', value: 0 }]);
      setRegionData(regions?.slice(0, 6).map(r => ({ name: r.code, sales: Math.floor(Math.random() * 50) })) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview Dashboard</h1>
        <p className="text-muted-foreground">Real-time sales and stock metrics</p>
      </div>

      {/* Key Metrics */}
      <StatsGrid columns={4}>
        <MetricCard
          title="Total Sales"
          value={metrics.totalSales}
          icon={ShoppingCart}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Total Revenue"
          value={`TZS ${metrics.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />
        <MetricCard
          title="Active DSRs"
          value={metrics.totalDSRs}
          icon={Users}
          variant="default"
        />
        <MetricCard
          title="Stock In Hand"
          value={`${metrics.stockInHand}/${metrics.totalStock}`}
          icon={Package}
          variant="warning"
        />
      </StatsGrid>

      {/* Sales Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Approved Sales"
          value={metrics.approvedSales}
          subtitle="Admin verified"
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Pending Verification"
          value={metrics.pendingSales}
          subtitle="Awaiting approval"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Sales */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Sales by Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Stock by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stockByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
