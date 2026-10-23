import React, { useState, useMemo } from 'react';
import {
  Barcode,
  Printer,
  Download,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  Sliders,
  FileText,
  Sparkles,
  Search,
  RefreshCw,
  Layers,
  Tag,
  Store,
  CheckSquare
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Product } from '../types';
import { useStore } from '../StoreContext';

export interface LabelPreset {
  id: string;
  name: string;
  nameMm: string;
  type: 'a4' | 'thermal';
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  gapXMm: number;
  gapYMm: number;
}

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: 'a4-24',
    name: 'A4 Sheet • 24 Labels (3 × 8)',
    nameMm: 'A4 စာရွက် (၂၄ ကွက် - 63.5×33.9mm)',
    type: 'a4',
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 3,
    rows: 8,
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    marginLeftMm: 7.2,
    marginTopMm: 12.9,
    gapXMm: 2.5,
    gapYMm: 0
  },
  {
    id: 'a4-40',
    name: 'A4 Sheet • 40 Labels (4 × 10)',
    nameMm: 'A4 စာရွက်အသေး (၄၀ ကွက် - 48.5×25.4mm)',
    type: 'a4',
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 4,
    rows: 10,
    labelWidthMm: 48.5,
    labelHeightMm: 25.4,
    marginLeftMm: 8,
    marginTopMm: 21.5,
    gapXMm: 0,
    gapYMm: 0
  },
  {
    id: 'a4-14',
    name: 'A4 Sheet • 14 Labels (2 × 7)',
    nameMm: 'A4 စာရွက်အကြီး (၁၄ ကွက် - 99.1×38.1mm)',
    type: 'a4',
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 2,
    rows: 7,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    marginLeftMm: 4.7,
    marginTopMm: 15.1,
    gapXMm: 2.4,
    gapYMm: 0
  },
  {
    id: 'thermal-50x30',
    name: 'Thermal Roll • 50mm × 30mm',
    nameMm: 'ဘားကုဒ်စတစ်ကာလိပ် (50×30mm)',
    type: 'thermal',
    pageWidthMm: 50,
    pageHeightMm: 30,
    cols: 1,
    rows: 1,
    labelWidthMm: 48,
    labelHeightMm: 28,
    marginLeftMm: 1,
    marginTopMm: 1,
    gapXMm: 0,
    gapYMm: 0
  },
  {
    id: 'thermal-40x30',
    name: 'Thermal Roll • 40mm × 30mm',
    nameMm: 'ဘားကုဒ်စတစ်ကာလိပ် (40×30mm)',
    type: 'thermal',
    pageWidthMm: 40,
    pageHeightMm: 30,
    cols: 1,
    rows: 1,
    labelWidthMm: 38,
    labelHeightMm: 28,
    marginLeftMm: 1,
    marginTopMm: 1,
    gapXMm: 0,
    gapYMm: 0
  },
  {
    id: 'thermal-60x40',
    name: 'Thermal Roll • 60mm × 40mm',
    nameMm: 'ဘားကုဒ်စတစ်ကာလိပ်အကြီး (60×40mm)',
    type: 'thermal',
    pageWidthMm: 60,
    pageHeightMm: 40,
    cols: 1,
    rows: 1,
    labelWidthMm: 58,
    labelHeightMm: 38,
    marginLeftMm: 1,
    marginTopMm: 1,
    gapXMm: 0,
    gapYMm: 0
  }
];

// Authentic Code 128B pattern table (values 0 to 106)
const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011'
];

/**
 * Encodes an ASCII string into a Code 128B binary bar pattern ('1' = black bar, '0' = space)
 */
export function encodeCode128B(rawText: string): string {
  // Sanitize to printable ASCII characters (32-126)
  const clean = (rawText || '000000').replace(/[^\x20-\x7E]/g, '') || '000000';
  const startCode = 104; // Start Code B
  let checksum = startCode;
  let pattern = CODE128_PATTERNS[startCode];

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const val = charCode - 32;
    checksum += val * (i + 1);
    pattern += CODE128_PATTERNS[val] || CODE128_PATTERNS[0];
  }

  const checkVal = checksum % 103;
  pattern += CODE128_PATTERNS[checkVal];
  pattern += CODE128_PATTERNS[106]; // Stop pattern (13 modules)
  return pattern;
}

/**
 * Generates a fallback scannable barcode string for products without one
 */
export function getProductBarcodeValue(product: Product): string {
  if (product.barcode && product.barcode.trim().length > 0) {
    return product.barcode.trim();
  }
  return `88500${String(product.id).padStart(7, '0')}`;
}

/**
 * Renders a single label onto a high-DPI HTML5 Canvas for crisp PDF generation (supports Myanmar Unicode + Code 128B)
 */
function renderLabelToCanvas(
  item: {
    product: Product;
    barcodeValue: string;
    storeName: string;
    formattedPrice: string;
  },
  preset: LabelPreset,
  options: {
    showStoreName: boolean;
    showProductName: boolean;
    showPrice: boolean;
    showCategory: boolean;
    showBarcodeText: boolean;
    showBorder: boolean;
  }
): HTMLCanvasElement {
  // 12 pixels per millimeter (~305 DPI) for ultra-sharp print quality
  const pxPerMm = 12;
  const widthPx = Math.round(preset.labelWidthMm * pxPerMm);
  const heightPx = Math.round(preset.labelHeightMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const padX = Math.round(2.2 * pxPerMm);
  const padY = Math.round(1.8 * pxPerMm);

  // Optional dashed cut border
  if (options.showBorder) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(4, 4, widthPx - 8, heightPx - 8);
    ctx.setLineDash([]);
  }

  const isCompact = preset.labelHeightMm <= 28 || preset.labelWidthMm <= 42;
  let currentY = padY;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const centerX = widthPx / 2;
  const maxTextWidth = widthPx - padX * 2;

  // 1. Store Name Header
  if (options.showStoreName && item.storeName) {
    const storeFontPx = isCompact ? Math.round(2.1 * pxPerMm) : Math.round(2.4 * pxPerMm);
    ctx.font = `bold ${storeFontPx}px "Inter", "Pyidaungsu", "Padauk", sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.fillText(item.storeName, centerX, currentY, maxTextWidth);
    currentY += storeFontPx + Math.round(0.6 * pxPerMm);
  }

  // 2. Product Name
  if (options.showProductName) {
    const prodFontPx = isCompact ? Math.round(2.6 * pxPerMm) : Math.round(3.1 * pxPerMm);
    ctx.font = `bold ${prodFontPx}px "Inter", "Pyidaungsu", "Padauk", sans-serif`;
    ctx.fillStyle = '#0f172a';
    const displayName = item.product.name.length > 28
      ? item.product.name.slice(0, 27) + '…'
      : item.product.name;
    ctx.fillText(displayName, centerX, currentY, maxTextWidth);
    currentY += prodFontPx + Math.round(0.7 * pxPerMm);
  }

  // 3. Price & Category Row
  if (options.showPrice || options.showCategory) {
    const priceFontPx = isCompact ? Math.round(2.7 * pxPerMm) : Math.round(3.3 * pxPerMm);
    ctx.font = `800 ${priceFontPx}px "Inter", "Pyidaungsu", "Padauk", sans-serif`;
    ctx.fillStyle = '#000000';

    const parts: string[] = [];
    if (options.showPrice) parts.push(item.formattedPrice);
    if (options.showCategory && item.product.category) {
      parts.push(`[${item.product.category}]`);
    }
    ctx.fillText(parts.join('  •  '), centerX, currentY, maxTextWidth);
    currentY += priceFontPx + Math.round(1.0 * pxPerMm);
  }

  // 4. Calculate remaining vertical space for Barcode Bars + Barcode Text
  const barcodeTextHeight = options.showBarcodeText
    ? (isCompact ? Math.round(2.2 * pxPerMm) : Math.round(2.5 * pxPerMm))
    : 0;
  const bottomLimit = heightPx - padY - barcodeTextHeight - (options.showBarcodeText ? Math.round(0.5 * pxPerMm) : 0);
  const barHeight = Math.max(Math.round(6 * pxPerMm), bottomLimit - currentY);

  // Draw Code 128B Bars
  const pattern = encodeCode128B(item.barcodeValue);
  const quietZoneModules = 10;
  const totalModules = pattern.length + quietZoneModules * 2;
  const availableBarWidth = widthPx - padX * 2;
  const moduleWidth = availableBarWidth / totalModules;
  const startX = padX + quietZoneModules * moduleWidth;

  ctx.fillStyle = '#000000';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      const x = startX + i * moduleWidth;
      ctx.fillRect(x, currentY, Math.ceil(moduleWidth), barHeight);
    }
  }

  currentY += barHeight + Math.round(0.4 * pxPerMm);

  // 5. Human-readable barcode digits
  if (options.showBarcodeText) {
    const codeFontPx = isCompact ? Math.round(2.1 * pxPerMm) : Math.round(2.4 * pxPerMm);
    ctx.font = `bold ${codeFontPx}px "Courier New", monospace`;
    ctx.fillStyle = '#1e293b';
    ctx.fillText(item.barcodeValue, centerX, currentY, maxTextWidth);
  }

  return canvas;
}

/**
 * Reusable SVG Barcode component for crisp on-screen preview
 */
export const BarcodeSvgPreview: React.FC<{
  value: string;
  height?: number;
  className?: string;
}> = ({ value, height = 36, className = '' }) => {
  const pattern = useMemo(() => encodeCode128B(value), [value]);
  const quietZone = 8;
  const totalWidth = pattern.length + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height: `${height}px` }}
    >
      <rect width={totalWidth} height={height} fill="#ffffff" />
      {pattern.split('').map((bit, idx) =>
        bit === '1' ? (
          <rect
            key={idx}
            x={quietZone + idx}
            y={0}
            width={1.08}
            height={height}
            fill="#000000"
          />
        ) : null
      )}
    </svg>
  );
};

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  initialSelectedIds: number[];
  onProductsUpdated?: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  allProducts,
  initialSelectedIds,
  onProductsUpdated
}) => {
  const { formatCurrency, storeProfile } = useStore();

  // Map of productId -> number of labels to print
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    if (initialSelectedIds.length > 0) {
      initialSelectedIds.forEach(id => {
        init[id] = 2;
      });
    } else if (allProducts.length > 0) {
      allProducts.slice(0, 4).forEach(p => {
        init[p.id] = 2;
      });
    }
    return init;
  });

  // Sync when modal opens with new selection
  React.useEffect(() => {
    if (isOpen) {
      if (initialSelectedIds.length > 0) {
        const next: Record<number, number> = {};
        initialSelectedIds.forEach(id => {
          next[id] = quantities[id] || 2;
        });
        setQuantities(next);
      } else if (Object.keys(quantities).length === 0 && allProducts.length > 0) {
        const next: Record<number, number> = {};
        allProducts.slice(0, 6).forEach(p => {
          next[p.id] = 2;
        });
        setQuantities(next);
      }
    }
  }, [isOpen, initialSelectedIds]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('a4-24');
  const [productSearch, setProductSearch] = useState('');
  const [showStoreName, setShowStoreName] = useState(true);
  const [customStoreName, setCustomStoreName] = useState(
    storeProfile?.name || 'ရတနာ (မော်လမြိုင်)'
  );
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingBarcodes, setIsSavingBarcodes] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (storeProfile?.name) {
      setCustomStoreName(storeProfile.name);
    }
  }, [storeProfile?.name]);

  const activePreset = useMemo(
    () => LABEL_PRESETS.find(p => p.id === selectedPresetId) || LABEL_PRESETS[0],
    [selectedPresetId]
  );

  // Selected products with quantity > 0
  const selectedItems = useMemo(() => {
    return allProducts
      .filter(p => (quantities[p.id] || 0) > 0)
      .map(product => ({
        product,
        count: quantities[product.id] || 0,
        barcodeValue: getProductBarcodeValue(product)
      }));
  }, [allProducts, quantities]);

  // Expanded flat list of every individual label to print/export
  const expandedLabels = useMemo(() => {
    const list: Array<{
      product: Product;
      barcodeValue: string;
      storeName: string;
      formattedPrice: string;
    }> = [];

    selectedItems.forEach(({ product, count, barcodeValue }) => {
      const formattedPrice = formatCurrency(product.price);
      for (let i = 0; i < count; i++) {
        list.push({
          product,
          barcodeValue,
          storeName: customStoreName,
          formattedPrice
        });
      }
    });
    return list;
  }, [selectedItems, customStoreName, formatCurrency]);

  const labelsPerPage = activePreset.cols * activePreset.rows;
  const totalPages = Math.max(1, Math.ceil(expandedLabels.length / labelsPerPage));

  if (!isOpen) return null;

  const updateProductCount = (id: number, count: number) => {
    setQuantities(prev => {
      const next = { ...prev };
      if (count <= 0) {
        delete next[id];
      } else {
        next[id] = Math.min(500, count);
      }
      return next;
    });
  };

  const applyBatchPreset = (mode: 'one' | 'five' | 'stock') => {
    setQuantities(prev => {
      const next: Record<number, number> = {};
      const targetIds = Object.keys(prev).length > 0
        ? Object.keys(prev).map(Number)
        : allProducts.map(p => p.id);

      targetIds.forEach(id => {
        const prod = allProducts.find(p => p.id === id);
        if (!prod) return;
        if (mode === 'one') next[id] = 1;
        else if (mode === 'five') next[id] = 5;
        else if (mode === 'stock') next[id] = Math.max(1, Math.min(100, prod.stock || 1));
      });
      return next;
    });
  };

  // Persist auto-generated barcodes to database for selected products missing a barcode
  const handleSaveMissingBarcodes = async () => {
    const missing = selectedItems.filter(it => !it.product.barcode);
    if (missing.length === 0) return;

    setIsSavingBarcodes(true);
    try {
      for (const item of missing) {
        await fetch(`/api/products/${item.product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item.product,
            barcode: item.barcodeValue
          })
        });
      }
      setStatusMessage(`Saved generated barcodes for ${missing.length} product(s).`);
      setTimeout(() => setStatusMessage(null), 3500);
      if (onProductsUpdated) onProductsUpdated();
    } catch (e) {
      console.error('Failed to save generated barcodes:', e);
    } finally {
      setIsSavingBarcodes(false);
    }
  };

  // Generate & Download Printable PDF via jsPDF
  const handleDownloadPDF = async () => {
    if (expandedLabels.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      // Yield a frame so spinner renders smoothly
      await new Promise(resolve => setTimeout(resolve, 40));

      const isThermal = activePreset.type === 'thermal';
      const orientation = activePreset.pageWidthMm > activePreset.pageHeightMm ? 'l' : 'p';

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [activePreset.pageWidthMm, activePreset.pageHeightMm],
        compress: true
      });

      for (let i = 0; i < expandedLabels.length; i++) {
        const pageIndex = Math.floor(i / labelsPerPage);
        const indexInPage = i % labelsPerPage;

        if (i > 0 && indexInPage === 0) {
          pdf.addPage([activePreset.pageWidthMm, activePreset.pageHeightMm], orientation);
        }

        const col = indexInPage % activePreset.cols;
        const row = Math.floor(indexInPage / activePreset.cols);

        const xMm = activePreset.marginLeftMm + col * (activePreset.labelWidthMm + activePreset.gapXMm);
        const yMm = activePreset.marginTopMm + row * (activePreset.labelHeightMm + activePreset.gapYMm);

        const canvas = renderLabelToCanvas(expandedLabels[i], activePreset, {
          showStoreName,
          showProductName,
          showPrice,
          showCategory,
          showBarcodeText,
          showBorder: isThermal ? false : showBorder
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(
          imgData,
          'PNG',
          xMm,
          yMm,
          activePreset.labelWidthMm,
          activePreset.labelHeightMm,
          undefined,
          'FAST'
        );
      }

      const dateStamp = new Date().toISOString().slice(0, 10);
      pdf.save(`barcode-labels-${activePreset.id}-${dateStamp}.pdf`);

      setStatusMessage(`Downloaded PDF (${expandedLabels.length} labels across ${totalPages} page${totalPages > 1 ? 's' : ''}).`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error generating barcode PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Print via hidden iframe
  const handlePrintLabels = () => {
    if (expandedLabels.length === 0) return;

    let printIframe = document.getElementById('pos-barcode-print-frame') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'pos-barcode-print-frame';
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

    const isThermal = activePreset.type === 'thermal';

    // Render each label as high-DPI data URL so print output matches PDF 100%
    const labelImages = expandedLabels.map(item =>
      renderLabelToCanvas(item, activePreset, {
        showStoreName,
        showProductName,
        showPrice,
        showCategory,
        showBarcodeText,
        showBorder: isThermal ? false : showBorder
      }).toDataURL('image/png')
    );

    const pagesHtml: string[] = [];
    for (let p = 0; p < totalPages; p++) {
      const pageSlice = labelImages.slice(p * labelsPerPage, (p + 1) * labelsPerPage);
      const cellsHtml = pageSlice
        .map(
          src => `
          <div class="label-cell">
            <img src="${src}" alt="Barcode Label" />
          </div>`
        )
        .join('');

      pagesHtml.push(`<div class="label-page">${cellsHtml}</div>`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${activePreset.pageWidthMm}mm ${activePreset.pageHeightMm}mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .label-page {
              width: ${activePreset.pageWidthMm}mm;
              height: ${activePreset.pageHeightMm}mm;
              padding-left: ${activePreset.marginLeftMm}mm;
              padding-top: ${activePreset.marginTopMm}mm;
              display: grid;
              grid-template-columns: repeat(${activePreset.cols}, ${activePreset.labelWidthMm}mm);
              grid-auto-rows: ${activePreset.labelHeightMm}mm;
              column-gap: ${activePreset.gapXMm}mm;
              row-gap: ${activePreset.gapYMm}mm;
              page-break-after: always;
              overflow: hidden;
            }
            .label-page:last-child {
              page-break-after: auto;
            }
            .label-cell {
              width: ${activePreset.labelWidthMm}mm;
              height: ${activePreset.labelHeightMm}mm;
              overflow: hidden;
            }
            .label-cell img {
              width: 100%;
              height: 100%;
              display: block;
            }
          </style>
        </head>
        <body>
          ${pagesHtml.join('')}
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
        console.error('Barcode print error:', e);
      }
    }, 300);
  };

  const unselectedProducts = allProducts.filter(
    p =>
      !quantities[p.id] &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase())))
  );

  const missingBarcodeCount = selectedItems.filter(it => !it.product.barcode).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Printable PDF Barcode Label Studio</span>
                <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                  (ဘားကုဒ်စတစ်ကာနှင့် PDF ထုတ်ရန်)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Generate Code-128 scannable barcode sheets (A4) or thermal roll stickers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Main Two-Column Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Products & Label Settings (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-5 overflow-y-auto bg-white">
            {/* 1. Paper / Sticker Format Preset */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Label Sheet / Thermal Roll Format</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {LABEL_PRESETS.map(preset => {
                  const active = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        active
                          ? 'bg-indigo-50/80 border-indigo-600 ring-1 ring-indigo-600'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{preset.name}</div>
                        <div className="text-[11px] text-slate-500">{preset.nameMm}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          preset.type === 'a4'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {preset.type === 'a4' ? 'A4 PDF Sheet' : 'Thermal Roll'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Label Content & Appearance */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Sticker Content & Shop Header</span>
              </label>

              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Shop Name on Sticker (ဆိုင်အမည်)
                </label>
                <div className="relative">
                  <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customStoreName}
                    onChange={e => setCustomStoreName(e.target.value)}
                    placeholder="Store Name"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={e => setShowStoreName(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Show Store Name</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={e => setShowProductName(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Show Product Name</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={e => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Show Selling Price</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={e => setShowBarcodeText(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Show Code Digits</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showCategory}
                    onChange={e => setShowCategory(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Show Category</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={e => setShowBorder(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Cut Guide Border</span>
                </label>
              </div>
            </div>

            {/* 3. Selected Products & Label Copy Quantities */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Products & Copies ({selectedItems.length})</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyBatchPreset('one')}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    1x All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBatchPreset('five')}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    5x All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBatchPreset('stock')}
                    title="Set label count equal to each item's current stock"
                    className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                  >
                    Match Stock
                  </button>
                </div>
              </div>

              {missingBarcodeCount > 0 && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-800">
                    {missingBarcodeCount} item(s) using auto-generated barcode numbers.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveMissingBarcodes}
                    disabled={isSavingBarcodes}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
                  >
                    {isSavingBarcodes ? 'Saving...' : 'Save to DB'}
                  </button>
                </div>
              )}

              {/* Selected Product List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedItems.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    No products selected. Search or add products below.
                  </div>
                ) : (
                  selectedItems.map(({ product, count, barcodeValue }) => (
                    <div
                      key={product.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-700">
                            {barcodeValue}
                          </span>
                          <span>• {formatCurrency(product.price)}</span>
                          <span>• Stock: {product.stock}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateProductCount(product.id, count - 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={count}
                          onChange={e =>
                            updateProductCount(product.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-12 text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => updateProductCount(product.id, count + 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateProductCount(product.id, 0)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Remove from label batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add More Products Search */}
              <div className="mt-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Add more products to label batch..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {unselectedProducts.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {unselectedProducts.slice(0, 12).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateProductCount(p.id, 2)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Printable Sheet Preview (7 cols) */}
          <div className="lg:col-span-7 bg-slate-100/80 p-4 sm:p-6 flex flex-col overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Live Print & PDF Preview</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Showing {expandedLabels.length} total sticker{expandedLabels.length === 1 ? '' : 's'} •{' '}
                  {totalPages} {activePreset.type === 'a4' ? 'A4 page(s)' : 'thermal label(s)'} ({activePreset.labelWidthMm}mm × {activePreset.labelHeightMm}mm)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {expandedLabels.length} Stickers
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
            </div>

            {/* Preview Canvas Container */}
            <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto py-2">
              {expandedLabels.length === 0 ? (
                <div className="my-auto p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-sm">
                  <Barcode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Labels to Preview</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select at least one product on the left to generate scannable barcode stickers.
                  </p>
                </div>
              ) : (
                <div
                  className="w-full bg-white shadow-lg border border-slate-300 rounded-xl p-4 sm:p-6 transition-all"
                  style={{
                    maxWidth: activePreset.type === 'thermal' ? '320px' : '680px'
                  }}
                >
                  <div
                    className="grid gap-2.5"
                    style={{
                      gridTemplateColumns: `repeat(${activePreset.cols}, minmax(0, 1fr))`
                    }}
                  >
                    {expandedLabels.slice(0, 48).map((item, idx) => (
                      <div
                        key={`${item.product.id}-${idx}`}
                        className={`bg-white p-2.5 flex flex-col items-center justify-between text-center overflow-hidden ${
                          showBorder
                            ? 'border border-dashed border-slate-300 rounded-lg'
                            : 'border border-slate-100 rounded'
                        }`}
                      >
                        {showStoreName && item.storeName && (
                          <div className="text-[10px] font-bold text-slate-500 truncate w-full">
                            {item.storeName}
                          </div>
                        )}
                        {showProductName && (
                          <div className="text-xs font-bold text-slate-900 truncate w-full mt-0.5">
                            {item.product.name}
                          </div>
                        )}
                        {(showPrice || showCategory) && (
                          <div className="text-[11px] font-extrabold text-indigo-950 truncate w-full my-0.5">
                            {showPrice && <span>{item.formattedPrice}</span>}
                            {showPrice && showCategory && item.product.category && (
                              <span className="mx-1 text-slate-400">•</span>
                            )}
                            {showCategory && item.product.category && (
                              <span className="text-[10px] font-medium text-slate-500">
                                {item.product.category}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="w-full my-1 px-1">
                          <BarcodeSvgPreview
                            value={item.barcodeValue}
                            height={activePreset.cols >= 4 ? 26 : 34}
                          />
                        </div>

                        {showBarcodeText && (
                          <div className="font-mono text-[10px] font-bold tracking-wider text-slate-800">
                            {item.barcodeValue}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {expandedLabels.length > 48 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                      + {expandedLabels.length - 48} more labels included in PDF & Print output
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Code-128B standard vector & 300-DPI Myanmar Unicode support • Compatible with all POS scanners
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrintLabels}
              disabled={expandedLabels.length === 0}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Labels Directly</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={expandedLabels.length === 0 || isGeneratingPdf}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isGeneratingPdf
                  ? 'Generating PDF...'
                  : `Download Printable PDF (${expandedLabels.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
