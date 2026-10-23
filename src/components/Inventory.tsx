import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, Upload, Download, FileUp, ArrowUpDown, ArrowUp, ArrowDown, History, ArrowUpRight, ArrowDownRight, Calendar, AlertCircle, Barcode, Printer, Sparkles, X } from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';
import { useStore } from '../StoreContext';
import { BarcodeLabelModal } from './BarcodeLabelModal';

type SortField = 'name' | 'category' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc';

export default function Inventory() {
  const { formatCurrency, storeProfile } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', cost_price: '', stock: '', category: '', description: '', image_url: '', low_stock_threshold: '10', unit: 'pc', expiration_date: '', barcode: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [stockError, setStockError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({ quantity_change: 0, reason: '' });
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showBarcodeLabelModal, setShowBarcodeLabelModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const stockCsvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stockValue = Number(newProduct.stock);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setStockError('Stock Level must be a positive integer');
      return;
    }
    setStockError('');

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          cost_price: parseFloat(newProduct.cost_price) || 0,
          stock: parseInt(newProduct.stock, 10),
          category: newProduct.category,
          description: newProduct.description,
          image_url: newProduct.image_url,
          low_stock_threshold: parseInt(newProduct.low_stock_threshold, 10),
          unit: newProduct.unit || 'pc',
          expiration_date: newProduct.expiration_date || null,
          barcode: newProduct.barcode || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingProduct(null);
        setNewProduct({ name: '', price: '', cost_price: '', stock: '', category: '', description: '', image_url: '', low_stock_threshold: '10', unit: 'pc', expiration_date: '', barcode: '' });
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to save product', error);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product', error);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      cost_price: product.cost_price?.toString() || '0',
      stock: product.stock.toString(),
      category: product.category,
      description: product.description || '',
      image_url: product.image_url || '',
      low_stock_threshold: product.low_stock_threshold?.toString() || '10',
      unit: product.unit || 'pc',
      expiration_date: product.expiration_date || '',
      barcode: product.barcode || '',
    });
    setStockError('');
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', price: '', cost_price: '', stock: '', category: '', description: '', image_url: '', low_stock_threshold: '10', unit: 'pc', expiration_date: '', barcode: '' });
    setStockError('');
    setShowAddModal(true);
  };

  const updateStock = async (id: number, newStock: number) => {
    try {
      await fetch(`/api/products/${id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      fetchProducts();
    } catch (error) {
      console.error('Failed to update stock', error);
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost_price: p.cost_price || 0,
      stock: p.stock,
      category: p.category,
      description: p.description || '',
      image_url: p.image_url || '',
      low_stock_threshold: p.low_stock_threshold || 10,
      unit: p.unit || 'pc',
      expiration_date: p.expiration_date || ''
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          const importedProducts = results.data.map((row: any) => ({
            id: row.id ? parseInt(row.id, 10) : undefined,
            name: row.name,
            price: parseFloat(row.price),
            cost_price: parseFloat(row.cost_price) || 0,
            stock: parseInt(row.stock, 10),
            category: row.category,
            description: row.description,
            image_url: row.image_url,
            low_stock_threshold: row.low_stock_threshold ? parseInt(row.low_stock_threshold, 10) : 10,
            unit: row.unit || 'pc',
            expiration_date: row.expiration_date || null
          })).filter(p => p.name && !isNaN(p.price) && !isNaN(p.stock));

          if (importedProducts.length === 0) {
            alert('No valid products found in CSV.');
            setIsImporting(false);
            return;
          }

          const res = await fetch('/api/products/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: importedProducts }),
          });

          if (res.ok) {
            alert(`Successfully imported ${importedProducts.length} products.`);
            fetchProducts();
          } else {
            alert('Failed to import products.');
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('An error occurred during import.');
        } finally {
          setIsImporting(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Failed to parse CSV file.');
        setIsImporting(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  const handleImportStockCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdatingStock(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const stockUpdates = results.data.map((row: any) => ({
            id: row.id ? parseInt(row.id, 10) : undefined,
            stock: row.stock ? parseInt(row.stock, 10) : undefined
          })).filter(u => !isNaN(u.id as number) && !isNaN(u.stock as number));

          if (stockUpdates.length === 0) {
            alert('No valid stock updates found in CSV. Ensure "id" and "stock" columns exist.');
            setIsUpdatingStock(false);
            return;
          }

          const res = await fetch('/api/products/bulk-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: stockUpdates }),
          });

          if (res.ok) {
            alert(`Successfully updated stock for ${stockUpdates.length} products.`);
            fetchProducts();
          } else {
            alert('Failed to update stock.');
          }
        } catch (error) {
          console.error('Stock update error:', error);
          alert('An error occurred during stock update.');
        } finally {
          setIsUpdatingStock(false);
          if (stockCsvInputRef.current) stockCsvInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Failed to parse CSV file.');
        setIsUpdatingStock(false);
        if (stockCsvInputRef.current) stockCsvInputRef.current.value = '';
      }
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    fetch(`/api/products/${adjustingProduct.id}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustmentData)
    })
      .then(res => res.json())
      .then(() => {
        fetchProducts();
        setShowAdjustModal(false);
        setAdjustingProduct(null);
        setAdjustmentData({ quantity_change: 0, reason: '' });
      });
  };

  const viewHistory = (product: Product) => {
    setAdjustingProduct(product);
    fetch(`/api/products/${product.id}/adjustments`)
      .then(res => res.json())
      .then(data => {
        setAdjustmentHistory(data);
        setShowHistory(true);
      });
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return expDate <= thirtyDaysFromNow && expDate >= today;
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    return expDate < today;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchesExpiring = !showExpiringOnly || isExpiringSoon(p.expiration_date) || isExpired(p.expiration_date);
    const matchesLowStock = !showLowStockOnly || p.stock <= (p.low_stock_threshold || 10);
    return matchesSearch && matchesCategory && matchesExpiring && matchesLowStock;
  });

  const categories = ['All Categories', ...new Set(products.map(p => p.category))];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const lowStockProducts = products.filter((p) => p.stock <= (p.low_stock_threshold || 10));
  const expiringProducts = products.filter((p) => isExpiringSoon(p.expiration_date) || isExpired(p.expiration_date));

  const toggleSelectProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    sortedProducts.length > 0 &&
    sortedProducts.every(p => selectedProductIds.includes(p.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(sortedProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const merged = new Set([...selectedProductIds, ...sortedProducts.map(p => p.id)]);
      setSelectedProductIds(Array.from(merged));
    }
  };

  const openLabelStudioForSingle = (product: Product) => {
    setSelectedProductIds([product.id]);
    setShowBarcodeLabelModal(true);
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-slate-400">Loading inventory...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Management</h2>
          <p className="text-slate-500 mt-1">Manage your products, stock levels, and pricing.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm border ${
                showLowStockOnly 
                  ? 'bg-rose-600 text-white border-rose-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm border ${
                showExpiringOnly 
                  ? 'bg-amber-600 text-white border-amber-600' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Expiring
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              ref={csvInputRef}
              className="hidden"
            />
            <input
              type="file"
              accept=".csv"
              onChange={handleImportStockCSV}
              ref={stockCsvInputRef}
              className="hidden"
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <FileUp className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => stockCsvInputRef.current?.click()}
              disabled={isUpdatingStock}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <FileUp className="w-4 h-4" />
              {isUpdatingStock ? 'Updating...' : 'Update Stock (CSV)'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowBarcodeLabelModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
              title="Generate & Print PDF Barcode Labels (ဘားကုဒ်စတစ်ကာ ထုတ်ရန်)"
            >
              <Barcode className="w-4 h-4 text-indigo-300" />
              <span>Barcode Labels</span>
              {selectedProductIds.length > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-indigo-500 text-white rounded-full">
                  {selectedProductIds.length}
                </span>
              )}
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        </div>
      </header>

      {lowStockProducts.length > 0 && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-900">Low Stock Alert</h3>
            <p className="text-sm text-rose-700 mt-1">
              {lowStockProducts.length} product{lowStockProducts.length === 1 ? ' is' : 's are'} running low on stock:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockProducts.map(p => (
                <span key={p.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                  {p.name} ({p.stock} {p.unit || 'pc'} left)
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="text-xs font-semibold text-rose-700 hover:underline"
          >
            {showLowStockOnly ? 'Show All' : 'Filter These'}
          </button>
        </div>
      )}

      {expiringProducts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">Expiration Alerts</h3>
            <p className="text-sm text-amber-700 mt-1">
              {expiringProducts.length} product{expiringProducts.length === 1 ? ' is' : 's are'} nearing or past expiration:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiringProducts.map(p => {
                const expired = isExpired(p.expiration_date);
                return (
                  <span key={p.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    expired ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {p.name} ({expired ? 'Expired' : `Expires: ${p.expiration_date}`})
                  </span>
                );
              })}
            </div>
          </div>
          <button 
            onClick={() => setShowExpiringOnly(!showExpiringOnly)}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            {showExpiringOnly ? 'Show All' : 'Filter These'}
          </button>
        </div>
      )}

      {selectedProductIds.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-indigo-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-extrabold">
              {selectedProductIds.length} Selected
            </span>
            <span className="text-xs sm:text-sm text-indigo-100 font-medium">
              Ready to generate printable A4 PDF or thermal barcode labels (ဘားကုဒ်စတစ်ကာ ထုတ်ရန် အသင့်ဖြစ်ပါပြီ)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-200 hover:text-white hover:bg-indigo-900 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={() => setShowBarcodeLabelModal(true)}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate PDF / Print Barcode Labels</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
              <tr>
                <th className="pl-6 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    title="Select all products"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Product Name
                    {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-2">
                    Category
                    {sortField === 'category' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price
                    {sortField === 'price' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center gap-2">
                    Stock
                    {sortField === 'stock' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProducts.map((product) => {
                const isLowStock = product.stock <= (product.low_stock_threshold || 10);
                const expiringSoon = isExpiringSoon(product.expiration_date);
                const expired = isExpired(product.expiration_date);
                const isSelected = selectedProductIds.includes(product.id);
                
                return (
                  <tr key={product.id} className={`group hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/40' : isLowStock ? 'bg-rose-50/30' : ''} ${expired ? 'bg-rose-100/50' : expiringSoon ? 'bg-amber-50/50' : ''}`}>
                    <td className="pl-6 pr-2 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      {product.barcode && (
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400">Barcode:</span>
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">{product.barcode}</span>
                        </div>
                      )}
                      {product.description && <div className="text-sm text-slate-500 font-normal mt-0.5 max-w-xs">{product.description}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-900 font-medium">
                        {product.stock} {product.unit || 'pc'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateStock(product.id, Math.max(0, product.stock - 1))}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateStock(product.id, product.stock + 1)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      product.stock > (product.low_stock_threshold || 10) 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : product.stock > 0 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-rose-100 text-rose-700'
                    }`}>
                      {product.stock > (product.low_stock_threshold || 10) 
                        ? 'In Stock' 
                        : product.stock > 0 
                          ? 'Low Stock' 
                          : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.expiration_date ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expired ? 'bg-rose-100 text-rose-800' :
                        expiringSoon ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {product.expiration_date}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openLabelStudioForSingle(product)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Print PDF Barcode Label"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => viewHistory(product)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Stock History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingProduct(product);
                          setAdjustmentData({ quantity_change: 0, reason: '' });
                          setShowAdjustModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Adjust Stock"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(product)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="product-form" onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="e.g. Wireless Mouse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Photo</label>
                  <div className="flex items-center gap-4">
                    {newProduct.image_url ? (
                      <img src={newProduct.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photo
                      </button>
                      <p className="text-xs text-slate-500 mt-2">Or provide an image URL below</p>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    className="w-full px-4 py-2.5 mt-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price ({storeProfile?.currency_symbol || 'MMK'})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="29.99"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price ({storeProfile?.currency_symbol || 'MMK'})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.cost_price}
                      onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="15.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={newProduct.stock}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, stock: e.target.value });
                        setStockError('');
                      }}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${stockError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-colors`}
                      placeholder="50"
                    />
                    {stockError && <p className="mt-1 text-xs text-rose-500">{stockError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="e.g. Electronics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit / Option</label>
                    <input
                      type="text"
                      list="unit-options"
                      required
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="e.g. pc, kg, size, color"
                    />
                    <datalist id="unit-options">
                      <option value="pc" />
                      <option value="kg" />
                      <option value="feet" />
                      <option value="set" />
                      <option value="pkg" />
                      <option value="size" />
                      <option value="color" />
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Alert At</label>
                    <input
                      type="number"
                      required
                      value={newProduct.low_stock_threshold}
                      onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date (Optional)</label>
                    <input
                      type="date"
                      value={newProduct.expiration_date}
                      onChange={(e) => setNewProduct({ ...newProduct, expiration_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Barcode (EAN-13 / UPC / SKU)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
                        setNewProduct({ ...newProduct, barcode: `88500${randomDigits}` });
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono transition-colors"
                    placeholder="e.g. 885012300007"
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Adjust Stock</h3>
              <p className="text-sm text-slate-500 mt-1">{adjustingProduct.name} (Current: {adjustingProduct.stock})</p>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Quantity Change (+/-)</label>
                <input
                  required
                  type="number"
                  value={adjustmentData.quantity_change}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity_change: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="e.g. 10 or -5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <textarea
                  required
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="e.g. Damaged goods, Stock count correction..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Stock Adjustment History</h3>
                <p className="text-sm text-slate-500 mt-1">{adjustingProduct.name}</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Change</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustmentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">No adjustment history found</td>
                    </tr>
                  ) : (
                    adjustmentHistory.map((adj) => (
                      <tr key={adj.id}>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(adj.created_at).toLocaleString('en-US', { timeZone: storeProfile?.timezone || 'UTC' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1 font-bold ${adj.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {adj.quantity_change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {adj.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowHistory(false)}
                className="w-full px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable PDF Barcode Label Generator Modal */}
      <BarcodeLabelModal
        isOpen={showBarcodeLabelModal}
        onClose={() => setShowBarcodeLabelModal(false)}
        allProducts={products}
        initialSelectedIds={selectedProductIds}
        onProductsUpdated={fetchProducts}
      />
    </div>
  );
}
