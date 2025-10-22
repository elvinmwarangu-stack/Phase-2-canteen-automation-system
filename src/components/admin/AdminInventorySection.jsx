import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const AdminInventorySection = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsResponse, logsResponse] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, name, stock_quantity, category')
          .order('stock_quantity', { ascending: true }),
        supabase
          .from('inventory_logs')
          .select(`
            *,
            menu_items (name)
          `)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (itemsResponse.error) throw itemsResponse.error;
      if (logsResponse.error) throw logsResponse.error;

      setMenuItems(itemsResponse.data || []);
      setInventoryLogs(logsResponse.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedItem || !adjustmentReason) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide a reason for the adjustment',
        variant: 'destructive',
      });
      return;
    }

    const newStock = selectedItem.stock_quantity + adjustmentAmount;

    if (newStock < 0) {
      toast({
        title: 'Invalid Adjustment',
        description: 'Stock quantity cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          stock_quantity: newStock,
          is_available: newStock > 0
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Stock Updated',
        description: `Stock for ${selectedItem.name} has been updated`,
      });

      setIsDialogOpen(false);
      setSelectedItem(null);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    }
  };

  const lowStockItems = menuItems.filter(item => item.stock_quantity <= 10);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span>{item.name}</span>
                  <Badge variant="destructive">
                    {item.stock_quantity} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {item.category}
                  </Badge>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Stock</p>
                  <p className="text-3xl font-bold">{item.stock_quantity}</p>
                </div>
                <Dialog open={isDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setSelectedItem(null);
                    setAdjustmentAmount(0);
                    setAdjustmentReason('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedItem(item)}
                    >
                      Adjust Stock
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adjust Stock for {item.name}</DialogTitle>
                      <DialogDescription>
                        Current stock: {item.stock_quantity}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adjustment">Adjustment Amount</Label>
                        <Input
                          id="adjustment"
                          type="number"
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                          placeholder="Enter positive or negative number"
                        />
                        <p className="text-sm text-muted-foreground">
                          New stock will be: {item.stock_quantity + adjustmentAmount}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Input
                          id="reason"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="e.g., Restocking, Damaged goods"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAdjustment}>
                        Update Stock
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Inventory Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventoryLogs.map((log) => (
              <div key={log.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{log.menu_items.name}</p>
                  <p className="text-sm text-muted-foreground">{log.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'PPp')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={log.change_amount > 0 ? 'default' : 'secondary'}>
                    {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.previous_stock} → {log.new_stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
