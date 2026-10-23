import React, { useEffect, useState } from 'react';
import { Plus, Search, Eye, CheckCircle2, XCircle, Truck, Calendar, User, Package, ChevronRight, ArrowLeft, Trash2, ClipboardList } from 'lucide-react';
import { PurchaseOrder, Supplier, Product, PurchaseOrderItem } from '../types';
import { useStore } from '../StoreContext';

export default function Purchases() {
  const { formatCurrency } = useStore();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  
  // Create PO state
  const [newPo, setNewPo] = useState({
    supplier_id: 0,
    notes: '',
    items: [] as { product_id: number; quantity: number; cost_price: number }[]
  });

  useEffect(() => {
    fetchPos();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPos = () => {
    setLoading(true);
    fetch('/api/purchase-orders')
      .then(res => res.json())
      .then(data => {
        setPos(data);
        setLoading(false);
      });
  };

  const fetchSuppliers = () => {
    fetch('/api/suppliers').then(res => res.json()).then(setSuppliers);
  };

  const fetchProducts = () => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  };

  const fetchPoDetails = (id: number) => {
    fetch(`/api/purchase-orders/${id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedPo(data);
        setView('details');
      });
  };

  const handleCreatePo = () => {
    if (newPo.supplier_id === 0 || newPo.items.length === 0) {
      alert('Please select a supplier and add at least one item.');
      return;
    }

    const total_amount = newPo.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

    fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPo, total_amount })
    })
      .then(res => res.json())
      .then(() => {
        fetchPos();
        setView('list');
        setNewPo({ supplier_id: 0, notes: '', items: [] });
      });
  };

  const handleUpdateStatus = (id: number, status: string) => {
    if (status === 'received' && !confirm('Marking as received will increase product stock. Continue?')) return;

    fetch(`/api/purchase-orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(() => {
        if (view === 'details') fetchPoDetails(id);
        fetchPos();
      });
  };

  const addItem = () => {
    setNewPo({
      ...newPo,
      items: [...newPo.items, { product_id: 0, quantity: 1, cost_price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const items = [...newPo.items];
    items.splice(index, 1);
    setNewPo({ ...newPo, items });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newPo.items];
    (items[index] as any)[field] = value;
    
    // Auto-fill cost price if product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        items[index].cost_price = product.cost_price || product.price * 0.7; // Fallback if cost_price not set
      }
    }
    
    setNewPo({ ...newPo, items });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ordered': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (view === 'create') {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create Purchase Order</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Select Supplier *</label>
              <select
                value={newPo.supplier_id}
                onChange={(e) => setNewPo({ ...newPo, supplier_id: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value={0}>Choose a supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notes</label>
              <input
                type="text"
                value={newPo.notes}
                onChange={(e) => setNewPo({ ...newPo, notes: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Order Items</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {newPo.items.map((item, index) => (
                <div key={index} className="flex items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value={0}>Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} in stock)</option>)}
                    </select>
                  </div>
                  <div className="w-24 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.cost_price}
                      onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all mb-0.5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {newPo.items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  No items added yet. Click "Add Item" to start.
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
            <div className="text-slate-600">
              Total Amount: <span className="text-2xl font-bold text-slate-900 ml-2">
                {formatCurrency(newPo.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0))}
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setView('list')}
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePo}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'details' && selectedPo) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">PO #{selectedPo.id}</h2>
              <p className="text-slate-500">Created on {new Date(selectedPo.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border text-sm font-bold uppercase tracking-wider ${getStatusColor(selectedPo.status)}`}>
            {selectedPo.status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Order Items
                </h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedPo.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{item.product_name}</p>
                        <p className="text-xs text-slate-500">Unit: {item.unit}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.cost_price)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.cost_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                    <td className="px-6 py-4 text-right text-xl font-bold text-indigo-600">{formatCurrency(selectedPo.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedPo.notes && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-2">Notes</h3>
                <p className="text-slate-600 text-sm">{selectedPo.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h3 className="font-bold text-slate-900">Supplier Details</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {selectedPo.supplier_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-bold text-slate-900">{selectedPo.supplier_name}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900">Actions</h3>
              {selectedPo.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedPo.id, 'ordered')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
                >
                  <Truck className="w-5 h-5" />
                  Mark as Ordered
                </button>
              )}
              {selectedPo.status === 'ordered' && (
                <button
                  onClick={() => handleUpdateStatus(selectedPo.id, 'received')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Received
                </button>
              )}
              {(selectedPo.status === 'pending' || selectedPo.status === 'ordered') && (
                <button
                  onClick={() => handleUpdateStatus(selectedPo.id, 'cancelled')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-all"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Order
                </button>
              )}
              {selectedPo.status === 'received' && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Order received on {new Date(selectedPo.received_at!).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Orders</h2>
          <p className="text-slate-500 mt-1">Manage procurement and stock replenishment from suppliers.</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          New Purchase Order
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No purchase orders found</td>
                </tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">PO #{po.id}</p>
                          <p className="text-xs text-slate-500">{new Date(po.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">{po.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{formatCurrency(po.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => fetchPoDetails(po.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
