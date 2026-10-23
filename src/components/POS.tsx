import React, { useEffect, useState, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  PackageOpen, 
  User, 
  UserPlus, 
  X, 
  RefreshCw, 
  Clock,
  Barcode,
  ScanBarcode,
  ScanLine,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  Check,
  Printer,
  Settings2,
  FileText,
  Store,
  Phone,
  MapPin,
  Image as ImageIcon,
  Sliders,
  ChevronRight,
  Upload,
  Wifi,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { Product, Customer, ReceiptData } from '../types';
import { useStore } from '../StoreContext';
import {
  useOfflineSync,
  saveOfflineSale,
  cachePOSDataLocally,
  getCachedPOSProducts,
  getCachedPOSCustomers,
  OfflineSaleRecord
} from '../utils/offlineSync';
import { OfflineSyncModal } from './OfflineSyncModal';
import { PWAInstallButton } from './PWAInstallButton';

interface CartItem extends Product {
  cartQuantity: number;
}

interface POSProps {
  user: { id: number; username: string; role: string };
}

export default function POS({ user }: POSProps) {
  const { formatCurrency, storeProfile, refreshStoreProfile, lang } = useStore();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const [showOfflineSyncModal, setShowOfflineSyncModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [saleType, setSaleType] = useState<'store' | 'online'>('store');
  const [slipNumber, setSlipNumber] = useState('');
  const [loading, setLoading] = useState(true);

  // Barcode Scanning Integration States
  const [barcodeInput, setBarcodeInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoFocusBarcode, setAutoFocusBarcode] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<{ product: Product; time: Date } | null>(null);
  const [scannedHighlightId, setScannedHighlightId] = useState<number | null>(null);
  const [showBarcodeTesterModal, setShowBarcodeTesterModal] = useState(false);
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    code?: string;
  } | null>(null);

  // Receipt Generation & Printing States
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [receiptModalTab, setReceiptModalTab] = useState<'preview' | 'customize'>('preview');

  // Custom Shop Details & Logo Form State
  const [customShop, setCustomShop] = useState({
    name: storeProfile?.name || 'ရတနာ (မော်လမြိုင်)',
    tagline: storeProfile?.tagline || 'အဆင့်မြင့် ကုန်စုံနှင့် ဆေးဝါးရောင်းဝယ်ရေး',
    phone: storeProfile?.phone || '09-250123456, 09-420987654',
    address: storeProfile?.address || 'အမှတ် (၁၂)၊ အောက်လမ်းမကြီး၊ မော်လမြိုင်မြို့',
    tax_id: storeProfile?.tax_id || 'TIN-98472015',
    receipt_footer: storeProfile?.receipt_footer || 'ဝယ်ယူအားပေးမှုအတွက် အထူးကျေးဇူးတင်ပါသည်\nဝယ်ပြီးပစ္စည်း ၃ ရက်အတွင်း ဘောင်ချာဖြင့် လဲလှယ်နိုင်ပါသည်',
    logo_url: storeProfile?.logo_url || ''
  });
  const [isSavingShopProfile, setIsSavingShopProfile] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // New Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => {
        if (!res.ok) throw new Error('Products fetch failed');
        return res.json();
      }).catch(() => getCachedPOSProducts() || []),
      fetch('/api/customers').then(res => {
        if (!res.ok) throw new Error('Customers fetch failed');
        return res.json();
      }).catch(() => getCachedPOSCustomers() || []),
      fetch('/api/sales/next-slip').then(res => {
        if (!res.ok) throw new Error('Slip fetch failed');
        return res.json();
      }).catch(() => ({ nextSlip: `OFF-${Date.now().toString().slice(-6)}` }))
    ]).then(([productsData, customersData, slipData]) => {
      const safeProducts = Array.isArray(productsData) ? productsData : (getCachedPOSProducts() || []);
      const safeCustomers = Array.isArray(customersData) ? customersData : (getCachedPOSCustomers() || []);
      setProducts(safeProducts);
      setCustomers(safeCustomers);
      cachePOSDataLocally(safeProducts, safeCustomers);
      if (slipData && slipData.nextSlip) {
        setSlipNumber(slipData.nextSlip);
      } else {
        setSlipNumber(`OFF-${Date.now().toString().slice(-6)}`);
      }
      setLoading(false);
    });
  }, []);

  const fetchProducts = () => {
    if (!isOnline) {
      const cached = getCachedPOSProducts();
      if (cached) setProducts(cached);
      return;
    }
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
          cachePOSDataLocally(data, customers);
        }
      })
      .catch(() => {
        const cached = getCachedPOSProducts();
        if (cached) setProducts(cached);
      });
  };

  const generateSlipNumber = async () => {
    if (!isOnline) {
      setSlipNumber(`OFF-${Date.now().toString().slice(-6)}`);
      return;
    }
    try {
      const res = await fetch('/api/sales/next-slip');
      const data = await res.json();
      if (data.nextSlip) {
        setSlipNumber(data.nextSlip);
      }
    } catch {
      setSlipNumber(`OFF-${Date.now().toString().slice(-6)}`);
    }
  };

  // Refresh products & slip number automatically when offline sales finish syncing
  useEffect(() => {
    const handleSyncDone = (e: Event) => {
      const customEvent = e as CustomEvent;
      const syncedCount = customEvent.detail?.syncedCount || 0;
      fetchProducts();
      generateSlipNumber();
      if (syncedCount > 0) {
        setScanToast({
          type: 'success',
          title: 'Offline Sales Synced (အော့ဖ်လိုင်းအရောင်းများ စာရင်းသွင်းပြီး)',
          message: `Successfully synced ${syncedCount} offline transaction(s) to database.`
        });
        setTimeout(() => setScanToast(null), 4000);
      }
    };
    window.addEventListener('pos-offline-sync-completed', handleSyncDone);
    return () => window.removeEventListener('pos-offline-sync-completed', handleSyncDone);
  }, [isOnline]);

  // Synchronize storeProfile with customShop state
  useEffect(() => {
    if (storeProfile) {
      setCustomShop((prev) => ({
        ...prev,
        name: storeProfile.name || prev.name,
        tagline: storeProfile.tagline !== undefined ? (storeProfile.tagline || '') : prev.tagline,
        phone: storeProfile.phone !== undefined ? (storeProfile.phone || '') : prev.phone,
        address: storeProfile.address !== undefined ? (storeProfile.address || '') : prev.address,
        tax_id: storeProfile.tax_id !== undefined ? (storeProfile.tax_id || '') : prev.tax_id,
        receipt_footer: storeProfile.receipt_footer !== undefined ? (storeProfile.receipt_footer || '') : prev.receipt_footer,
        logo_url: storeProfile.logo_url !== undefined ? (storeProfile.logo_url || '') : prev.logo_url,
      }));
    }
  }, [storeProfile]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, SVG or WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Image size exceeds 2MB limit. Please choose a smaller logo.');
      return;
    }

    setLogoUploadError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCustomShop((prev) => ({ ...prev, logo_url: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveShopProfile = async () => {
    setIsSavingShopProfile(true);
    try {
      const payload = {
        name: customShop.name || 'ရတနာ (မော်လမြိုင်)',
        website: storeProfile?.website || '',
        phone: customShop.phone,
        address: customShop.address,
        currency: storeProfile?.currency || 'MMK',
        currency_symbol: storeProfile?.currency_symbol || 'MMK',
        timezone: storeProfile?.timezone || 'UTC',
        logo_url: customShop.logo_url,
        tagline: customShop.tagline,
        tax_id: customShop.tax_id,
        receipt_footer: customShop.receipt_footer,
      };

      const res = await fetch('/api/store-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await refreshStoreProfile();
        setScanToast({
          type: 'success',
          title: 'Shop Details Saved',
          message: 'Receipt layout and store profile updated successfully.'
        });
        setTimeout(() => setScanToast(null), 3000);
        setReceiptModalTab('preview');
      } else {
        setScanToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Could not save shop profile. Please try again.'
        });
        setTimeout(() => setScanToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update store profile:', err);
      setScanToast({
        type: 'error',
        title: 'Error Saving Profile',
        message: 'A network error occurred while saving.'
      });
      setTimeout(() => setScanToast(null), 3000);
    } finally {
      setIsSavingShopProfile(false);
    }
  };

  const handlePrintReceipt = (receiptToPrint?: ReceiptData) => {
    const receipt = receiptToPrint || completedReceipt;
    if (!receipt) return;

    const is58 = receiptPaperWidth === '58mm';
    const widthMm = is58 ? '58mm' : '80mm';
    const printableWidth = is58 ? '48mm' : '72mm';

    let printIframe = document.getElementById('pos-receipt-print-frame') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'pos-receipt-print-frame';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!iframeDoc) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.slipNumber}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${widthMm} auto;
              margin: 0;
            }
            @media print {
              body {
                width: ${widthMm};
                margin: 0;
                padding: 3mm 2mm;
              }
            }
            body {
              font-family: 'Courier New', Courier, 'Pyidaungsu', monospace, sans-serif;
              font-size: ${is58 ? '10px' : '12px'};
              line-height: 1.3;
              color: #000;
              background: #fff;
              width: ${printableWidth};
              margin: 0 auto;
              padding: 8px 4px;
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .double-divider {
              border-top: 2px dashed #000;
              margin: 6px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
            }
            .items-table th {
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              font-size: ${is58 ? '9px' : '11px'};
            }
            .items-table td {
              padding: 3px 0;
              vertical-align: top;
            }
            .logo {
              max-height: 48px;
              max-width: 120px;
              display: block;
              margin: 0 auto 6px auto;
              filter: grayscale(100%);
            }
          </style>
        </head>
        <body>
          ${customShop.logo_url ? `<img src="${customShop.logo_url}" class="logo" alt="Store Logo" />` : ''}
          <div class="text-center font-bold" style="font-size: ${is58 ? '13px' : '16px'}; margin-bottom: 2px;">
            ${customShop.name || 'Store'}
          </div>
          ${customShop.tagline ? `<div class="text-center" style="font-size: ${is58 ? '9px' : '10px'}; margin-bottom: 3px; color: #333;">${customShop.tagline}</div>` : ''}
          ${customShop.address ? `<div class="text-center" style="font-size: ${is58 ? '8.5px' : '9.5px'}; margin-bottom: 2px;">${customShop.address}</div>` : ''}
          ${customShop.phone ? `<div class="text-center" style="font-size: ${is58 ? '8.5px' : '9.5px'}; margin-bottom: 2px;">📞 ${customShop.phone}</div>` : ''}
          ${customShop.tax_id ? `<div class="text-center" style="font-size: ${is58 ? '8px' : '9px'};">TIN: ${customShop.tax_id}</div>` : ''}

          <div class="divider"></div>

          <div class="row">
            <span>Slip: <strong>${receipt.slipNumber}</strong></span>
            <span>${new Date(receipt.date).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span>Time: ${new Date(receipt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Cashier: ${receipt.cashierName || 'Admin'}</span>
          </div>
          ${receipt.customerName ? `
          <div class="row">
            <span>Customer: ${receipt.customerName}</span>
            ${receipt.customerPhone ? `<span>${receipt.customerPhone}</span>` : ''}
          </div>` : ''}

          <div class="divider"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th align="left">Item</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
                <th align="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(it => `
                <tr>
                  <td style="word-break: break-word; max-width: ${is58 ? '65px' : '100px'};">${it.name}</td>
                  <td align="center">${it.quantity}</td>
                  <td align="right">${formatCurrency(it.price, true)}</td>
                  <td align="right">${formatCurrency(it.price * it.quantity, true)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="row">
            <span>Subtotal:</span>
            <span>${formatCurrency(receipt.subtotal)}</span>
          </div>
          ${receipt.discountAmount > 0 ? `
          <div class="row">
            <span>Discount:</span>
            <span>-${formatCurrency(receipt.discountAmount)}</span>
          </div>` : ''}
          ${receipt.taxAmount > 0 ? `
          <div class="row">
            <span>Tax (${((receipt.taxRate || 0) * 100).toFixed(0)}%):</span>
            <span>+${formatCurrency(receipt.taxAmount)}</span>
          </div>` : ''}

          <div class="double-divider"></div>

          <div class="row font-bold" style="font-size: ${is58 ? '13px' : '15px'};">
            <span>TOTAL:</span>
            <span>${formatCurrency(receipt.total)}</span>
          </div>

          <div class="row" style="margin-top: 4px; font-size: ${is58 ? '8.5px' : '9.5px'};">
            <span>Payment: ${receipt.paymentMethod || 'Cash'}</span>
            <span>${receipt.saleType || 'In-store'}</span>
          </div>

          <div class="divider"></div>

          <div class="text-center" style="margin: 8px 0 4px 0;">
            <div style="font-family: monospace; letter-spacing: 2px; font-weight: bold; font-size: 11px;">
              ||| | |||| | ||| || |||| | || |||
            </div>
            <div style="font-size: 8px; font-family: monospace; letter-spacing: 1px; color: #555;">
              *${receipt.slipNumber}*
            </div>
          </div>

          ${customShop.receipt_footer ? `
          <div class="text-center" style="font-size: ${is58 ? '8px' : '9px'}; white-space: pre-line; margin-top: 6px; color: #333;">
            ${customShop.receipt_footer}
          </div>` : ''}

          <div class="text-center font-bold" style="font-size: ${is58 ? '9px' : '10px'}; margin-top: 6px;">
            *** THANK YOU (ကျေးဇူးတင်ပါသည်) ***
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error:', e);
      }
    }, 250);
  };

  const handleReprintLastReceipt = async () => {
    if (completedReceipt) {
      setShowReceiptModal(true);
      setReceiptModalTab('preview');
      return;
    }

    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const orders = await res.json();
        if (orders && orders.length > 0) {
          const lastOrder = orders[0];
          const constructedReceipt: ReceiptData = {
            slipNumber: lastOrder.slip_number || `SLP-${lastOrder.id.toString().padStart(6, '0')}`,
            date: lastOrder.created_at || new Date().toISOString(),
            customerName: lastOrder.customer_name || lastOrder.customer_profile_name || 'Walk-in Customer (အထွေထွေဝယ်သူ)',
            cashierName: lastOrder.cashier_name || user.username || 'Cashier',
            items: (lastOrder.items || []).map((it: any) => ({
              name: it.product_name || 'Item',
              quantity: it.quantity || 1,
              price: it.price || 0,
              unit: it.unit || 'ခု'
            })),
            subtotal: (lastOrder.total_amount || 0) + (lastOrder.discount_amount || 0) - (lastOrder.tax_amount || 0),
            discountAmount: lastOrder.discount_amount || 0,
            taxAmount: lastOrder.tax_amount || 0,
            total: lastOrder.total_amount || 0,
            paymentMethod: lastOrder.payment_method === 'cash' ? 'Cash (ငွေသား)' : (lastOrder.payment_method || 'Cash'),
            saleType: lastOrder.sale_type === 'online' ? 'Online Delivery' : 'In-store POS'
          };
          setCompletedReceipt(constructedReceipt);
          setShowReceiptModal(true);
          setReceiptModalTab('preview');
        } else {
          setScanToast({
            type: 'warning',
            title: 'No Receipts Found',
            message: 'No completed transactions available to reprint yet.'
          });
          setTimeout(() => setScanToast(null), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to fetch last order for reprint:', err);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sound feedback using Web Audio API (zero external assets, 100% reliable)
  const playScanBeep = (success = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // High-pitch crisp retail beep (1760Hz - A6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
        osc.start();
        osc.stop(ctx.currentTime + 0.11);
      } else {
        // Low double-buzz for scan error
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {
      // Audio context may be restrained before first user interaction
    }
  };

  // Process a scanned or typed barcode
  const handleBarcodeScan = async (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    // 1. Search in local products state first for instant sub-millisecond response
    let matchedProduct = products.find((p) => 
      (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
      String(p.id) === code ||
      p.name.toLowerCase() === code.toLowerCase()
    );

    // 2. If not found in local memory, try looking up via backend API
    if (!matchedProduct) {
      try {
        const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`);
        if (res.ok) {
          matchedProduct = await res.json();
        }
      } catch (e) {
        console.error("Barcode lookup API error:", e);
      }
    }

    if (!matchedProduct) {
      playScanBeep(false);
      setScanToast({
        type: 'error',
        title: 'Barcode Not Found (ဘားကုဒ် မတွေ့ပါ)',
        message: `No item matched barcode "${code}".`,
        code
      });
      setTimeout(() => setScanToast(null), 3000);
      return;
    }

    // Check stock
    if (matchedProduct.stock <= 0) {
      playScanBeep(false);
      setScanToast({
        type: 'warning',
        title: 'Out of Stock (ပစ္စည်းလက်ကျန် မရှိပါ)',
        message: `${matchedProduct.name} is currently out of stock.`,
        code
      });
      setTimeout(() => setScanToast(null), 3000);
      return;
    }

    // Success: Play beep & trigger visual feedback
    playScanBeep(true);
    setScannedHighlightId(matchedProduct.id);
    setLastScannedItem({ product: matchedProduct, time: new Date() });
    setTimeout(() => setScannedHighlightId(null), 2000);

    const newStock = matchedProduct.stock - 1;

    // Update local products stock
    setProducts((prev) =>
      prev.map((p) => (p.id === matchedProduct.id ? { ...p, stock: newStock } : p))
    );

    // Update cart
    setCart((prev) => {
      const existing = prev.find((item) => item.id === matchedProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.id === matchedProduct.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...matchedProduct, cartQuantity: 1 }];
    });

    setScanToast({
      type: 'success',
      title: `✓ Scanned: ${matchedProduct.name}`,
      message: `${formatCurrency(matchedProduct.price)} • Barcode: ${matchedProduct.barcode || code}`,
      code
    });
    setTimeout(() => setScanToast(null), 2500);

    // Sync stock with backend when online
    if (isOnline) {
      fetch(`/api/products/${matchedProduct.id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      }).catch(() => {});
    }

    setBarcodeInput('');
    if (autoFocusBarcode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Hardware Barcode Scanner (Keyboard Wedge) Global Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing inside modal inputs
      if (showNewCustomerModal || showBarcodeTesterModal || showOfflineSyncModal || showReceiptModal) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const isInputFocused = document.activeElement === barcodeInputRef.current;

      // If user wasn't focused on the barcode box and gap was large (>120ms), start new buffer
      if (!isInputFocused && timeDiff > 120) {
        scanBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const buffer = scanBufferRef.current.trim();
        if (buffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          handleBarcodeScan(buffer);
          scanBufferRef.current = '';
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = '';
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, showNewCustomerModal, showBarcodeTesterModal, showOfflineSyncModal, showReceiptModal, soundEnabled, autoFocusBarcode]);

  const addToCart = async (product: Product) => {
    if (product.stock <= 0) {
      playScanBeep(false);
      setScanToast({
        type: 'warning',
        title: 'Out of Stock (ပစ္စည်းလက်ကျန် မရှိပါ)',
        message: `${product.name} is out of stock!`
      });
      setTimeout(() => setScanToast(null), 3000);
      return;
    }

    playScanBeep(true);
    setScannedHighlightId(product.id);
    setTimeout(() => setScannedHighlightId(null), 1500);

    const newStock = product.stock - 1;

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p))
    );

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });

    setScanToast({
      type: 'success',
      title: `✓ Added: ${product.name}`,
      message: `${formatCurrency(product.price)} (Stock left: ${newStock})`
    });
    setTimeout(() => setScanToast(null), 2000);

    if (isOnline) {
      fetch(`/api/products/${product.id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      }).catch(() => {});
    }
  };

  const updateQuantity = async (id: number, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQuantity = item.cartQuantity + delta;
    if (newQuantity < 1) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    if (delta > 0 && product.stock < delta) {
      playScanBeep(false);
      setScanToast({
        type: 'warning',
        title: 'Stock Warning',
        message: `Only ${product.stock} items available in stock.`
      });
      setTimeout(() => setScanToast(null), 3000);
      return;
    }

    const newStock = product.stock - delta;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
    );

    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, cartQuantity: newQuantity } : item
      )
    );

    if (isOnline) {
      fetch(`/api/products/${id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      }).catch(() => {});
    }
  };

  const removeFromCart = async (id: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const product = products.find(p => p.id === id);
    if (product) {
      const restoredStock = product.stock + item.cartQuantity;
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: restoredStock } : p))
      );
      if (isOnline) {
        fetch(`/api/products/${id}/stock`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: restoredStock })
        }).catch(() => {});
      }
    }

    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  
  const discountAmount = discountType === 'percentage' 
    ? subtotal * (discountValue / 100)
    : discountValue;
    
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;

  const handleOfflineCheckout = async () => {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const offlineRecord = await saveOfflineSale({
      totalAmount: total,
      discountAmount,
      taxAmount,
      customerName: selectedCustomer ? selectedCustomer.name : null,
      customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
      saleType,
      cashierName: user.username,
      paymentMethod: saleType === 'online' ? 'kpay' : 'cash',
      items: cart.map(item => ({
        product_id: item.id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price,
        cost_price: item.cost_price,
        unit: item.unit || 'ခု'
      }))
    });

    const receiptSnapshot: ReceiptData = {
      slipNumber: offlineRecord.offlineSlipNumber,
      date: offlineRecord.createdAt,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer (အထွေထွေဝယ်သူ)',
      customerPhone: selectedCustomer?.phone,
      cashierName: user.username,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price,
        unit: item.unit || 'ခု'
      })),
      subtotal,
      discountAmount,
      discountType,
      discountValue,
      taxAmount,
      taxRate,
      total,
      paymentMethod: saleType === 'online' ? 'KPay / Mobile Banking' : 'Cash (ငွေသား)',
      saleType: saleType === 'online' ? 'Online Delivery (Offline Queued)' : 'In-store POS (Offline Queued)'
    };

    setCompletedReceipt(receiptSnapshot);
    setShowReceiptModal(true);
    setReceiptModalTab('preview');

    setCart([]);
    setSelectedCustomerId('');
    setSlipNumber(`OFF-${Date.now().toString().slice(-6)}`);

    setScanToast({
      type: 'warning',
      title: 'Saved Offline (အော့ဖ်လိုင်း သိမ်းဆည်းပြီးပါပြီ)',
      message: `Receipt #${offlineRecord.offlineSlipNumber} cached locally & will auto-sync when online.`
    });
    setTimeout(() => setScanToast(null), 4000);
  };

  const handleViewOfflineReceipt = (record: OfflineSaleRecord) => {
    const itemSubtotal = record.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const receiptSnapshot: ReceiptData = {
      slipNumber: record.offlineSlipNumber,
      date: record.createdAt,
      customerName: record.customerName || 'Walk-in Customer (အထွေထွေဝယ်သူ)',
      cashierName: record.cashierName || user.username,
      items: record.items.map(it => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        unit: it.unit || 'ခု'
      })),
      subtotal: itemSubtotal,
      discountAmount: record.discountAmount,
      taxAmount: record.taxAmount,
      total: record.totalAmount,
      paymentMethod: record.paymentMethod === 'kpay' ? 'KPay / Mobile Banking' : 'Cash (ငွေသား)',
      saleType: record.saleType === 'online' ? 'Online Delivery' : 'In-store POS'
    };
    setShowOfflineSyncModal(false);
    setCompletedReceipt(receiptSnapshot);
    setShowReceiptModal(true);
    setReceiptModalTab('preview');
  };

  const checkout = async () => {
    if (cart.length === 0) return;

    if (!isOnline) {
      await handleOfflineCheckout();
      return;
    }

    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: total,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          customer_name: selectedCustomer ? selectedCustomer.name : null,
          customer_id: selectedCustomerId || null,
          sale_type: saleType,
          cashier_name: user.username,
          slip_number: slipNumber || null,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.cartQuantity,
            price: item.price,
          })),
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        const finalSlip = resData.slipNumber || slipNumber || `SLP-${Date.now().toString().slice(-6)}`;

        // Snapshot receipt data before cart clears
        const receiptSnapshot: ReceiptData = {
          slipNumber: finalSlip,
          date: new Date().toISOString(),
          customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer (အထွေထွေဝယ်သူ)',
          customerPhone: selectedCustomer?.phone,
          cashierName: user.username,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.cartQuantity,
            price: item.price,
            unit: item.unit || 'ခု'
          })),
          subtotal,
          discountAmount,
          discountType,
          discountValue,
          taxAmount,
          taxRate,
          total,
          paymentMethod: saleType === 'online' ? 'KPay / Mobile Banking' : 'Cash (ငွေသား)',
          saleType: saleType === 'online' ? 'Online Delivery' : 'In-store POS'
        };

        setCompletedReceipt(receiptSnapshot);
        setShowReceiptModal(true);
        setReceiptModalTab('preview');

        setCart([]);
        setSelectedCustomerId('');
        generateSlipNumber(); // Auto-generate next slip number
        fetchProducts(); // Refresh stock
        setScanToast({
          type: 'success',
          title: 'Sale Completed (အရောင်းပြီးစီးပါပြီ)',
          message: `Receipt #${finalSlip} ready to print.`
        });
        setTimeout(() => setScanToast(null), 3500);
      } else {
        await handleOfflineCheckout();
      }
    } catch (error) {
      console.warn('Network error during checkout, falling back to offline storage:', error);
      await handleOfflineCheckout();
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const createdCustomer = await res.json();
        setCustomers(prev => [...prev, createdCustomer]);
        setSelectedCustomerId(createdCustomer.id);
        setShowNewCustomerModal(false);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
      } else {
        alert('Failed to create customer');
      }
    } catch (error) {
      console.error('Failed to create customer', error);
      alert('An error occurred');
    } finally {
      setCreatingCustomer(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-slate-400">Loading POS...</div>;
  }

  return (
    <div className="flex h-full relative">
      {/* Floating Scan Notification Toast */}
      {scanToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm backdrop-blur-md ${
            scanToast.type === 'success' 
              ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-500/20' 
              : scanToast.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-500/40 shadow-amber-500/20'
                : 'bg-rose-950/95 text-rose-100 border-rose-500/40 shadow-rose-500/20'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              scanToast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              scanToast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {scanToast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>{scanToast.title}</span>
                {scanToast.code && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                    {scanToast.code}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">{scanToast.message}</div>
            </div>
            <button 
              onClick={() => setScanToast(null)}
              className="ml-3 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 p-6 md:p-8 flex flex-col h-full overflow-hidden">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Point of Sale <span className="text-sm font-normal text-slate-500 ml-1">(အရောင်းကောင်တာ)</span>
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs md:text-sm text-slate-500">Scan barcode or select items to add to cart.</p>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {currentTime.toLocaleString('en-US', { 
                  timeZone: storeProfile?.timezone || 'UTC',
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  hour: 'numeric', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true 
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-xs"
              />
            </div>

            {/* Online / Offline Sync Status Button */}
            <button
              onClick={() => setShowOfflineSyncModal(true)}
              title="Offline Mode & Transaction Sync Queue"
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs transition-all shrink-0 ${
                !isOnline
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                  : pendingCount > 0
                    ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                    : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              )}
              <span className="hidden xl:inline">
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isOnline ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {pendingCount} Pending
                </span>
              )}
            </button>

            <PWAInstallButton compact />

            <button
              onClick={handleReprintLastReceipt}
              title="Print / Reprint Last Slip (ဘောင်ချာထုတ်ရန်)"
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Print Receipt</span>
              <span className="md:hidden">Slip</span>
            </button>
            <button
              onClick={() => {
                setShowReceiptModal(true);
                setReceiptModalTab('customize');
              }}
              title="Shop Details & Logo Settings (ဆိုင်အချက်အလက်နှင့် လိုဂို)"
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors shadow-xs shrink-0"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Barcode Scanner Control Bar */}
        <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-md border border-indigo-900/40 relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Scanner Indicator & Barcode Input */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                <ScanBarcode className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs md:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    Hardware Barcode Scanner
                    <span className="text-[11px] font-normal text-indigo-300">(ဘားကုဒ်စကင်နာ)</span>
                  </span>
                  {/* Status Indicator */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] md:text-[11px] font-semibold text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Ready • Auto-Detect
                  </span>
                </div>

                {/* Barcode Input Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (barcodeInput.trim()) {
                      handleBarcodeScan(barcodeInput.trim());
                    }
                  }}
                  className="flex items-center gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan with hardware scanner or type barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="w-full pl-9 pr-7 py-2 bg-slate-800/90 border border-indigo-500/30 rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
                    />
                    {barcodeInput && (
                      <button
                        type="button"
                        onClick={() => setBarcodeInput('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!barcodeInput.trim()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Audio toggle & Quick Barcodes Shelf */}
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute scan beep sound" : "Enable scan beep sound"}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
                <span className="text-[11px]">{soundEnabled ? 'Beep On' : 'Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBarcodeTesterModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Barcode className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick Barcodes ({products.filter(p => p.barcode).length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Catalogue Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const isHighlighted = scannedHighlightId === product.id;
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col ${
                    product.stock === 0
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : isHighlighted
                        ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.02]'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div className="h-28 bg-slate-100 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-50 transition-colors">
                    <PackageOpen className="w-8 h-8 text-slate-300" />
                    
                    {/* Quick Barcode Scan Icon Overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.barcode) {
                          handleBarcodeScan(product.barcode);
                        } else {
                          addToCart(product);
                        }
                      }}
                      title={`Simulate scan for ${product.name}`}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-indigo-600 hover:text-white text-slate-600 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ScanBarcode className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{product.category}</p>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                    <span className="font-bold text-indigo-600 text-sm">{formatCurrency(product.price)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      product.stock > (product.low_stock_threshold || 10) ? 'bg-emerald-50 text-emerald-700' :
                      product.stock > 0 ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {product.stock} {product.unit || 'pc'}
                    </span>
                  </div>

                  {/* Barcode badge at bottom */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono flex items-center gap-1 truncate text-slate-500">
                      <Barcode className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{product.barcode || `ID: ${product.id}`}</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 group-hover:underline font-medium">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Current Order
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReprintLastReceipt}
              title="Reprint Last Receipt (ဘောင်ချာပြန်လည်ထုတ်ရန်)"
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 bg-white transition-all flex items-center gap-1 text-xs font-medium shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-slate-700">Slip</span>
            </button>
            <button
              onClick={() => {
                setShowReceiptModal(true);
                setReceiptModalTab('customize');
              }}
              title="Receipt & Shop Settings (ဆိုင်အချက်အလက်နှင့် လိုဂို)"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 bg-white transition-all shadow-2xs"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 line-clamp-1">{item.name}</h4>
                  <p className="text-sm text-slate-500">{formatCurrency(item.price)} / {item.unit || 'pc'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-bold text-slate-900">
                    {formatCurrency(item.price * item.cartQuantity)}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 hover:bg-white rounded-md text-slate-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-900">
                      {item.cartQuantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 hover:bg-white rounded-md text-slate-600 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setSaleType('store')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors border ${
                saleType === 'store'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Store Sale
            </button>
            <button
              onClick={() => setSaleType('online')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors border ${
                saleType === 'online'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Online Sale
            </button>
          </div>
          <div className="mb-4 relative flex items-center gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm appearance-none"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100 shadow-sm"
              title="Add New Customer"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4 relative flex items-center gap-2">
            <input
              type="text"
              placeholder="Auto-generated Slip Number"
              value={slipNumber}
              readOnly
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none transition-shadow shadow-sm"
            />
            <button
              onClick={generateSlipNumber}
              className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm"
              title="Auto-generate Slip Number"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <input
                    type="number"
                    min="0"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-xs focus:outline-none"
                    placeholder="0"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="bg-slate-50 px-1 py-1 text-xs border-l border-slate-200 focus:outline-none"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{storeProfile?.currency_symbol || 'MMK'}</option>
                  </select>
                </div>
              </div>
              <span className="text-rose-500">-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>0%</option>
                  <option value={0.05}>5%</option>
                </select>
              </div>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-200">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className={`w-full py-4 px-4 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm ${
              isOnline
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isOnline ? (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Checkout</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-5 h-5" />
                <span>Save Sale Offline (အော့ဖ်လိုင်းသိမ်းမည်)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                New Customer
              </h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form id="new-customer-form" onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
                    placeholder="123 Main St..."
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-customer-form"
                disabled={creatingCustomer}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingCustomer ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Barcode Shelf & Simulator Modal */}
      {showBarcodeTesterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Quick Barcodes & Hardware Scanner Tester</h3>
                  <p className="text-xs text-slate-500">Click any barcode below to simulate scanning or point your physical scanner at any code</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBarcodeTesterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="text-xs text-indigo-900 bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-100/90 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Hardware Scanner Active:</strong> Any external USB or Bluetooth handheld barcode scanner (Honeywell, Zebra, Netum, etc.) will automatically add items to your cart when scanned anywhere on this screen!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {products.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      if (p.barcode) {
                        handleBarcodeScan(p.barcode);
                      }
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-700">{p.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-500" />
                          {p.barcode || `ID:${p.id}`}
                        </span>
                        <span className="text-[10px] text-slate-400">• {p.stock} in stock</span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Scan</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total {products.length} registered barcode products</span>
              <button
                onClick={() => setShowBarcodeTesterModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Physical Receipt Generator & Thermal Printing Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    Physical Receipt & Thermal Printer
                    <span className="text-xs font-normal text-slate-500 hidden sm:inline">(အရောင်းပြေစာနှင့် ဘောင်ချာ)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Preview 80mm/58mm thermal slip, customize logo & shop details</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setReceiptModalTab('preview')}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                  receiptModalTab === 'preview'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Thermal Slip Preview</span>
              </button>
              <button
                onClick={() => setReceiptModalTab('customize')}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                  receiptModalTab === 'customize'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Customize Shop & Logo</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-100/70">
              {receiptModalTab === 'preview' ? (
                <div className="flex flex-col items-center">
                  {/* Paper Width Selector & Hint */}
                  <div className="w-full max-w-md mb-4 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                      Paper Size:
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setReceiptPaperWidth('80mm')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          receiptPaperWidth === '80mm'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        80mm (Standard)
                      </button>
                      <button
                        onClick={() => setReceiptPaperWidth('58mm')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          receiptPaperWidth === '58mm'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        58mm (Compact)
                      </button>
                    </div>
                  </div>

                  {/* Authentic Thermal Receipt Paper Container */}
                  {(() => {
                    const currentReceipt: ReceiptData = completedReceipt || {
                      slipNumber: slipNumber || 'SLP-000108',
                      date: new Date().toISOString(),
                      customerName: 'Daw Khin Khin (ဒေါ်ခင်ခင်)',
                      customerPhone: '09-450112233',
                      cashierName: user.username,
                      items: [
                        { name: 'ပရိုဘိုင်အိုတစ် ဆေးတောင့်', quantity: 2, price: 6500, unit: 'ကတ်' },
                        { name: 'ဗီတာမင်စီ 1000mg', quantity: 1, price: 4200, unit: 'ဘူး' },
                        { name: 'ခေါင်းကိုက်ပျောက်ဆေး', quantity: 3, price: 1500, unit: 'ကတ်' }
                      ],
                      subtotal: 21700,
                      discountAmount: 1700,
                      discountType: 'fixed',
                      discountValue: 1700,
                      taxAmount: 0,
                      taxRate: 0,
                      total: 20000,
                      paymentMethod: 'Cash (ငွေသား)',
                      saleType: 'In-store POS'
                    };

                    const is58 = receiptPaperWidth === '58mm';

                    return (
                      <div 
                        className={`bg-[#fffef8] border border-stone-300 shadow-xl rounded-sm font-mono text-stone-900 transition-all select-none relative ${
                          is58 ? 'w-[280px] p-4 text-[11px]' : 'w-[350px] p-6 text-xs'
                        }`}
                        style={{
                          backgroundImage: 'radial-gradient(circle, #e5e5d8 0.5px, transparent 0.5px)',
                          backgroundSize: '8px 8px'
                        }}
                      >
                        {/* Perforated Top Edge Effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 flex justify-between overflow-hidden">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <span key={i} className="inline-block w-2 h-1 bg-slate-200/80 rounded-b-full"></span>
                          ))}
                        </div>

                        {/* Store Logo */}
                        {customShop.logo_url && (
                          <div className="mb-3 flex justify-center">
                            <img
                              src={customShop.logo_url}
                              alt="Store Logo"
                              className="max-h-12 max-w-[130px] object-contain filter grayscale contrast-150"
                            />
                          </div>
                        )}

                        {/* Store Name & Header Info */}
                        <div className="text-center">
                          <h4 className={`font-bold text-stone-950 uppercase tracking-tight leading-snug ${is58 ? 'text-sm' : 'text-base'}`}>
                            {customShop.name || 'Store Name'}
                          </h4>
                          {customShop.tagline && (
                            <p className="text-[10px] text-stone-600 mt-0.5 leading-tight">{customShop.tagline}</p>
                          )}
                          {customShop.address && (
                            <p className="text-[10px] text-stone-700 mt-1 leading-tight">{customShop.address}</p>
                          )}
                          {customShop.phone && (
                            <p className="text-[10px] text-stone-700 leading-tight">📞 {customShop.phone}</p>
                          )}
                          {customShop.tax_id && (
                            <p className="text-[9px] text-stone-500 mt-0.5">TIN: {customShop.tax_id}</p>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-stone-400 my-2.5"></div>

                        {/* Slip Metadata */}
                        <div className="space-y-1 text-[11px] leading-tight">
                          <div className="flex justify-between">
                            <span>Slip: <strong>{currentReceipt.slipNumber}</strong></span>
                            <span>{new Date(currentReceipt.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span>Time: {new Date(currentReceipt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>Cashier: {currentReceipt.cashierName || 'Admin'}</span>
                          </div>
                          {currentReceipt.customerName && (
                            <div className="flex justify-between text-stone-700 pt-0.5">
                              <span className="truncate pr-2">Cust: {currentReceipt.customerName}</span>
                              {currentReceipt.customerPhone && (
                                <span className="shrink-0">{currentReceipt.customerPhone}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-stone-400 my-2.5"></div>

                        {/* Items Table */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase border-b border-dashed border-stone-300 pb-1">
                            <span className="flex-1">Item Description</span>
                            <span className="w-10 text-center">Qty</span>
                            <span className="w-16 text-right">Price</span>
                            <span className="w-16 text-right">Total</span>
                          </div>
                          {currentReceipt.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start text-[11px] leading-tight">
                              <div className="flex-1 pr-1 truncate font-medium">
                                {it.name}
                              </div>
                              <div className="w-10 text-center font-bold text-stone-800">
                                {it.quantity}
                              </div>
                              <div className="w-16 text-right text-stone-600">
                                {formatCurrency(it.price, true)}
                              </div>
                              <div className="w-16 text-right font-bold text-stone-900">
                                {formatCurrency(it.price * it.quantity, true)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-stone-400 my-2.5"></div>

                        {/* Calculation Summary */}
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-stone-700">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(currentReceipt.subtotal)}</span>
                          </div>
                          {currentReceipt.discountAmount > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Discount:</span>
                              <span>-{formatCurrency(currentReceipt.discountAmount)}</span>
                            </div>
                          )}
                          {currentReceipt.taxAmount > 0 && (
                            <div className="flex justify-between text-stone-700">
                              <span>Tax ({((currentReceipt.taxRate || 0) * 100).toFixed(0)}%):</span>
                              <span>+{formatCurrency(currentReceipt.taxAmount)}</span>
                            </div>
                          )}
                        </div>

                        {/* Double divider before Total */}
                        <div className="border-t-2 border-dashed border-stone-900 my-2"></div>

                        <div className="flex justify-between items-center text-sm font-bold text-stone-950">
                          <span>TOTAL:</span>
                          <span className={`${is58 ? 'text-base' : 'text-lg'}`}>
                            {formatCurrency(currentReceipt.total)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] text-stone-600 mt-2">
                          <span>Payment: {currentReceipt.paymentMethod || 'Cash'}</span>
                          <span>{currentReceipt.saleType || 'Store POS'}</span>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-stone-400 my-2.5"></div>

                        {/* Barcode Graphic Simulation */}
                        <div className="text-center my-2">
                          <div className="flex justify-center items-end gap-0.5 h-6 mb-1 opacity-90">
                            {[2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 1, 1, 2, 3].map((w, idx) => (
                              <span 
                                key={idx} 
                                className="bg-stone-900 inline-block h-full" 
                                style={{ width: `${w}px` }}
                              />
                            ))}
                          </div>
                          <p className="text-[9px] tracking-widest text-stone-600">
                            *{currentReceipt.slipNumber}*
                          </p>
                        </div>

                        {/* Footer return policy & thank you */}
                        {customShop.receipt_footer && (
                          <div className="text-center text-[10px] text-stone-600 whitespace-pre-line mt-2 leading-relaxed px-1">
                            {customShop.receipt_footer}
                          </div>
                        )}

                        <div className="text-center text-[10px] font-bold text-stone-800 mt-2 pt-2 border-t border-dashed border-stone-300">
                          *** THANK YOU (ကျေးဇူးတင်ပါသည်) ***
                        </div>

                        {/* Perforated Bottom Edge Effect */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-between overflow-hidden">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <span key={i} className="inline-block w-2 h-1 bg-slate-200/80 rounded-t-full"></span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Tab 2: Customization Form */
                <div className="space-y-4 max-w-lg mx-auto bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  {/* Hidden logo file input */}
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {/* Logo Customization */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Shop Logo (ဆိုင်လိုဂို)
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">PNG, JPG, SVG, WEBP</span>
                    </label>

                    {logoUploadError && (
                      <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                        {logoUploadError}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {customShop.logo_url ? (
                        <div className="relative group w-20 h-20 rounded-xl border-2 border-indigo-200 bg-slate-50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={customShop.logo_url}
                            alt="Logo preview"
                            className="max-h-full max-w-full object-contain filter grayscale contrast-125"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomShop(prev => ({ ...prev, logo_url: '' }))}
                            className="absolute inset-0 bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => logoFileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 flex flex-col items-center justify-center p-2 shrink-0 cursor-pointer transition-colors text-slate-400 hover:text-indigo-600"
                        >
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold">Upload</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          Choose Logo File
                        </button>
                        <input
                          type="text"
                          placeholder="Or paste external image URL..."
                          value={customShop.logo_url}
                          onChange={(e) => setCustomShop(prev => ({ ...prev, logo_url: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-indigo-600" />
                      Shop Name (ဆိုင်အမည်) *
                    </label>
                    <input
                      type="text"
                      value={customShop.name}
                      onChange={(e) => setCustomShop(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. ရတနာ (မော်လမြိုင်)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tagline / Slogan (ဆောင်ပုဒ် / လုပ်ငန်းအမျိုးအစား)
                    </label>
                    <input
                      type="text"
                      value={customShop.tagline}
                      onChange={(e) => setCustomShop(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="e.g. အဆင့်မြင့် ကုန်စုံနှင့် ဆေးဝါးရောင်းဝယ်ရေး"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Phone & Tax ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        Phone Numbers (ဖုန်းနံပါတ်များ)
                      </label>
                      <input
                        type="text"
                        value={customShop.phone}
                        onChange={(e) => setCustomShop(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="09-250123456, 09-420987654"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Tax / TIN ID (အခွန်မှတ်ပုံတင်အမှတ်)
                      </label>
                      <input
                        type="text"
                        value={customShop.tax_id}
                        onChange={(e) => setCustomShop(prev => ({ ...prev, tax_id: e.target.value }))}
                        placeholder="TIN-98472015"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Store Address (ဆိုင်လိပ်စာ)
                    </label>
                    <input
                      type="text"
                      value={customShop.address}
                      onChange={(e) => setCustomShop(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="အမှတ် (၁၂)၊ အောက်လမ်းမကြီး၊ မော်လမြိုင်မြို့"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Receipt Footer & Return Policy */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Receipt Footer Note & Return Policy (ဘောင်ချာအောက်ခြေ မှတ်ချက်နှင့် ပစ္စည်းလဲလှယ်ခြင်း စည်းကမ်းချက်)
                    </label>
                    <textarea
                      rows={3}
                      value={customShop.receipt_footer}
                      onChange={(e) => setCustomShop(prev => ({ ...prev, receipt_footer: e.target.value }))}
                      placeholder="ဝယ်ယူအားပေးမှုအတွက် အထူးကျေးဇူးတင်ပါသည်\nဝယ်ပြီးပစ္စည်း ၃ ရက်အတွင်း ဘောင်ချာဖြင့် လဲလှယ်နိုင်ပါသည်"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Compatible with EPSON, Xprinter, Sunmi, Bixolon, & Windows/Mac/Linux drivers</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {receiptModalTab === 'customize' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setReceiptModalTab('preview')}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Back to Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveShopProfile}
                      disabled={isSavingShopProfile}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                      {isSavingShopProfile ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save & Set Default</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setReceiptModalTab('customize')}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Shop / Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Physical Receipt</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Sales Queue & Sync Modal */}
      <OfflineSyncModal
        isOpen={showOfflineSyncModal}
        onClose={() => setShowOfflineSyncModal(false)}
        onViewReceipt={handleViewOfflineReceipt}
      />
    </div>

  );
}
