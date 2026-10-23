import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, User, History, ChevronRight, Download, FileUp } from 'lucide-react';
import Papa from 'papaparse';
import { Customer } from '../types';
import { useStore } from '../StoreContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PurchaseHistory {
  sale_id: number;
  total_amount: number;
  created_at: string;
  items: { product_name: string; quantity: number; price: number; unit: string; category: string }[];
}

export default function Customers() {
  const { formatCurrency, storeProfile } = useStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = () => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data);
        setLoading(false);
      });
  };

  const fetchHistory = async (id: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/customers/${id}/history`);
      const data = await res.json();
      setPurchaseHistory(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingCustomer(null);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
        fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to save customer', error);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCustomers();
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete customer', error);
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
    setShowAddModal(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchHistory(customer.id);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...customers.map(customer => [
        `"${customer.name}"`,
        `"${customer.email || ''}"`,
        `"${customer.phone || ''}"`,
        `"${customer.address || ''}"`,
        `"${new Date(customer.created_at).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowExportMenu(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Customer List', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ['Name', 'Email', 'Phone', 'Address', 'Joined Date'];
    const tableRows = customers.map(customer => [
      customer.name,
      customer.email || '-',
      customer.phone || '-',
      customer.address || '-',
      new Date(customer.created_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`customers_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedCustomers = results.data.map((row: any) => ({
            id: row.id ? parseInt(row.id, 10) : undefined,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            address: row.address || null
          })).filter(c => c.name);

          if (importedCustomers.length === 0) {
            alert('No valid customers found in CSV. Make sure you have at least a "name" column.');
            setIsImporting(false);
            return;
          }

          const res = await fetch('/api/customers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customers: importedCustomers }),
          });

          if (res.ok) {
            alert(`Successfully imported ${importedCustomers.length} customers.`);
            fetchCustomers();
          } else {
            const error = await res.json();
            alert(`Failed to import customers: ${error.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('An error occurred during import.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Failed to parse CSV file.');
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  if (loading) {
    return <div className="p-8 animate-pulse text-slate-400">Loading customers...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h2>
          <p className="text-slate-500 mt-1">Manage customer profiles and view purchase history.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <FileUp className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                  <button
                    onClick={exportCSV}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={exportPDF}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Customer List */}
        <div className="w-1/2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            {filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors border ${
                  selectedCustomer?.id === customer.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedCustomer?.id === customer.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                    <p className="text-sm text-slate-500">{customer.email || customer.phone || 'No contact info'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className={`w-5 h-5 ml-2 ${selectedCustomer?.id === customer.id ? 'text-indigo-600' : 'text-slate-300'}`} />
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No customers found.
              </div>
            )}
          </div>
        </div>

        {/* Customer Details & History */}
        <div className="w-1/2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {selectedCustomer ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                    <p className="text-slate-500 text-sm">Customer since {new Date(selectedCustomer.created_at).toLocaleDateString('en-US', { timeZone: storeProfile?.timezone || 'UTC' })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Email</span>
                    <span className="font-medium text-slate-900">{selectedCustomer.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Phone</span>
                    <span className="font-medium text-slate-900">{selectedCustomer.phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">Address</span>
                    <span className="font-medium text-slate-900">{selectedCustomer.address || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Purchase History
                </h3>
                
                {loadingHistory ? (
                  <div className="animate-pulse text-slate-400">Loading history...</div>
                ) : purchaseHistory.length > 0 ? (
                  <div className="space-y-4">
                    {purchaseHistory.map((sale) => (
                      <div key={sale.sale_id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-900">Order #{sale.sale_id}</span>
                            <span className="text-slate-500 text-sm ml-3">
                              {new Date(sale.created_at).toLocaleDateString('en-US', { timeZone: storeProfile?.timezone || 'UTC' })} at {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeProfile?.timezone || 'UTC' })}
                            </span>
                          </div>
                          <span className="font-bold text-indigo-600">{formatCurrency(sale.total_amount)}</span>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex justify-between">
                            <span>Product</span>
                            <span className="text-right">Total</span>
                          </div>
                          <ul className="space-y-3">
                            {sale.items.map((item, idx) => (
                              <li key={idx} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium text-slate-900 block">
                                    {item.product_name}
                                  </span>
                                  <span className="text-slate-500 text-xs mt-0.5 block">
                                    {item.category} &bull; {item.quantity} {item.unit || 'pc'} @ {formatCurrency(item.price)}
                                  </span>
                                </div>
                                <span className="text-slate-700 font-medium">{formatCurrency(item.quantity * item.price)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                            <span className="text-slate-500">
                              {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items total
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    No purchase history found for this customer.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-600 mb-1">No Customer Selected</p>
              <p className="text-sm">Select a customer from the list to view their details and purchase history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
            </div>
            <div className="p-6">
              <form id="customer-form" onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="123 Main St, City, Country"
                    rows={3}
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="customer-form"
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
