import { useState, useEffect } from 'react';
import { Search, RotateCcw, Plus, Calendar, Package, ChevronRight, History, X, CheckCircle2 } from 'lucide-react';
import { useStore } from '../StoreContext';
import { Sale, SaleReturn } from '../types';

export default function SaleReturns() {
  const { formatCurrency, storeProfile } = useStore();
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [slipSearch, setSlipSearch] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ product_id: number; product_name: string; quantity: number; refund_amount: number; max_quantity: number }[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [resalable, setResalable] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await fetch('/api/returns');
      const data = await res.json();
      setReturns(data);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchSale = async () => {
    if (!slipSearch.trim()) return;
    try {
      const res = await fetch(`/api/orders`);
      const allOrders: Sale[] = await res.json();
      const sale = allOrders.find(o => o.slip_number === slipSearch || `TX-${88000 + o.id}` === slipSearch);
      
      if (sale) {
        setFoundSale(sale);
        setReturnItems(sale.items?.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: 0,
          refund_amount: item.price,
          max_quantity: item.quantity
        })) || []);
      } else {
        alert('Sale not found. Please check the slip number.');
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleReturnQuantityChange = (productId: number, qty: number) => {
    setReturnItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: Math.min(item.max_quantity, Math.max(0, qty)) }
        : item
    ));
  };

  const submitReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_id: foundSale?.id,
          items: itemsToReturn,
          reason: returnReason,
          resalable
        })
      });

      if (res.ok) {
        fetchReturns();
        setShowAddModal(false);
        resetForm();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to process return');
      }
    } catch (error) {
      console.error('Return failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSlipSearch('');
    setFoundSale(null);
    setReturnItems([]);
    setReturnReason('');
    setResalable(true);
  };

  const filteredReturns = returns.filter(r => 
    r.slip_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `RET-${r.id}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sale Returns</h2>
          <p className="text-slate-500 mt-1">Manage product returns and customer refunds.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search returns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Process Return
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
              <tr>
                <th className="px-6 py-4">Return ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Sale Slip</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Refund Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 animate-pulse">Loading returns...</td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No returns found.</td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600">RET-{ret.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(ret.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{ret.slip_number}</td>
                    <td className="px-6 py-4">{ret.customer_name || 'Guest'}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate" title={ret.items?.map(i => `${i.product_name} (x${i.quantity})`).join(', ')}>
                        {ret.items?.map(i => `${i.product_name} (x${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">
                      {formatCurrency(ret.total_refund)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Return Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Process New Return</h3>
                <p className="text-sm text-slate-500">Search for a sale to initiate a return.</p>
              </div>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {!foundSale ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Sale Slip Number or Transaction ID</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={slipSearch}
                          onChange={(e) => setSlipSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchSale()}
                          placeholder="e.g. SLP-000001 or TX-88001"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <button
                        onClick={searchSale}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Sale Found</p>
                      <p className="text-sm font-bold text-slate-900">{foundSale.slip_number} - {foundSale.customer_name || 'Guest'}</p>
                      <p className="text-xs text-slate-500">{new Date(foundSale.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setFoundSale(null)} className="text-xs font-semibold text-indigo-600 hover:underline">
                      Change Sale
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Select Items to Return</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Purchased</th>
                            <th className="px-4 py-3">Return Qty</th>
                            <th className="px-4 py-3 text-right">Refund/Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {returnItems.map((item) => (
                            <tr key={item.product_id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                              <td className="px-4 py-3 text-slate-500">{item.max_quantity}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.max_quantity}
                                  value={item.quantity}
                                  onChange={(e) => handleReturnQuantityChange(item.product_id, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.refund_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Reason for Return</label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        placeholder="e.g. Defective, Wrong item..."
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="resalable-return"
                          checked={resalable}
                          onChange={(e) => setResalable(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="resalable-return" className="text-sm font-medium text-slate-700 cursor-pointer">
                          Items are resalable (restock)
                        </label>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-rose-900">Total Refund:</span>
                          <span className="text-lg font-bold text-rose-600">
                            {formatCurrency(returnItems.reduce((sum, i) => sum + (i.refund_amount * i.quantity), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {foundSale && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReturn}
                  disabled={isProcessing || returnItems.every(i => i.quantity === 0)}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
