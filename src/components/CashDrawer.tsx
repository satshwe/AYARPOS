import React, { useEffect, useState } from 'react';
import { DollarSign, ArrowDownRight, ArrowUpRight, Lock, Unlock, Plus, Minus } from 'lucide-react';
import { useStore } from '../StoreContext';

interface CashMovement {
  reference_id?: number;
  amount: number;
  type: 'sale' | 'refund' | 'pay_in' | 'pay_out' | 'open_drawer' | 'close_drawer' | 'overage' | 'shortage';
  description: string;
  created_at: string;
}

interface CashDrawerState {
  isOpen: boolean;
  expectedCash: number;
  movements: CashMovement[];
}

export default function CashDrawer() {
  const { formatCurrency, storeProfile } = useStore();
  const [state, setState] = useState<CashDrawerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'open' | 'close' | 'pay_in' | 'pay_out'>('open');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchDrawerState();
  }, []);

  const fetchDrawerState = () => {
    setLoading(true);
    fetch('/api/cash-drawer')
      .then((res) => res.json())
      .then((data) => {
        setState(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch cash drawer state', err);
        setLoading(false);
      });
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let movementType = modalType;
    if (modalType === 'open') movementType = 'open_drawer';
    if (modalType === 'close') movementType = 'close_drawer';

    try {
      const actualAmount = parseFloat(amount);
      
      // Handle overage/shortage before closing
      if (modalType === 'close' && state) {
        const diff = actualAmount - state.expectedCash;
        if (Math.abs(diff) > 0.01) {
          await fetch('/api/cash-drawer/movement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: diff > 0 ? 'overage' : 'shortage',
              amount: Math.abs(diff),
              description: diff > 0 ? 'End of day overage' : 'End of day shortage'
            }),
          });
        }
      }

      const res = await fetch('/api/cash-drawer/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: movementType,
          amount: actualAmount,
          description: description || (modalType === 'open' ? 'Opening Balance' : modalType === 'close' ? 'Closing Balance' : '')
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setAmount('');
        setDescription('');
        fetchDrawerState();
      }
    } catch (error) {
      console.error('Failed to save cash movement', error);
    }
  };

  const openModal = (type: 'open' | 'close' | 'pay_in' | 'pay_out') => {
    setModalType(type);
    setAmount('');
    setDescription('');
    setShowModal(true);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
      case 'pay_in':
      case 'open_drawer':
      case 'overage':
        return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><ArrowDownRight className="w-4 h-4" /></div>;
      case 'refund':
      case 'pay_out':
      case 'close_drawer':
      case 'shortage':
        return <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><ArrowUpRight className="w-4 h-4" /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><DollarSign className="w-4 h-4" /></div>;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'open_drawer': return 'Drawer Opened';
      case 'close_drawer': return 'Drawer Closed';
      case 'pay_in': return 'Pay In';
      case 'pay_out': return 'Pay Out';
      case 'sale': return 'Cash Sale';
      case 'refund': return 'Cash Refund';
      case 'overage': return 'Cash Overage';
      case 'shortage': return 'Cash Shortage';
      default: return type;
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-slate-400">Loading cash drawer...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Cash Drawer</h2>
          <p className="text-slate-500 mt-1">Manage cash movements and track expected drawer balance.</p>
        </div>
        <div className="flex gap-3">
          {!state?.isOpen ? (
            <button
              onClick={() => openModal('open')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              Open Drawer
            </button>
          ) : (
            <>
              <button
                onClick={() => openModal('pay_in')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Pay In
              </button>
              <button
                onClick={() => openModal('pay_out')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Minus className="w-4 h-4" />
                Pay Out
              </button>
              <button
                onClick={() => openModal('close')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Lock className="w-4 h-4" />
                End of Day Reconciliation
              </button>
            </>
          )}
        </div>
      </header>

      {!state?.isOpen ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-2xl shadow-sm p-12">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Drawer is Closed</h3>
          <p className="text-slate-500 max-w-md mb-8">
            The cash drawer is currently closed. Open the drawer and enter the starting cash balance to begin tracking movements.
          </p>
          <button
            onClick={() => openModal('open')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Unlock className="w-5 h-5" />
            Open Drawer
          </button>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Balance Card */}
          <div className="w-1/3 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Expected Cash in Drawer</h3>
              <div className="text-5xl font-bold text-slate-900 mb-6">
                {formatCurrency(state?.expectedCash || 0)}
              </div>
              
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Opening Balance</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(state.movements.find(m => m.type === 'open_drawer')?.amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Cash Sales</span>
                  <span className="font-medium text-emerald-600">
                    +{formatCurrency(state.movements.filter(m => m.type === 'sale').reduce((sum, m) => sum + m.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Cash Refunds</span>
                  <span className="font-medium text-rose-600">
                    -{formatCurrency(state.movements.filter(m => m.type === 'refund').reduce((sum, m) => sum + m.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pay Ins</span>
                  <span className="font-medium text-emerald-600">
                    +{formatCurrency(state.movements.filter(m => m.type === 'pay_in').reduce((sum, m) => sum + m.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pay Outs</span>
                  <span className="font-medium text-rose-600">
                    -{formatCurrency(state.movements.filter(m => m.type === 'pay_out').reduce((sum, m) => sum + m.amount, 0))}
                  </span>
                </div>
                {state.movements.some(m => m.type === 'overage') && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Overage</span>
                    <span className="font-medium text-emerald-600">
                      +{formatCurrency(state.movements.filter(m => m.type === 'overage').reduce((sum, m) => sum + m.amount, 0))}
                    </span>
                  </div>
                )}
                {state.movements.some(m => m.type === 'shortage') && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Shortage</span>
                    <span className="font-medium text-rose-600">
                      -{formatCurrency(state.movements.filter(m => m.type === 'shortage').reduce((sum, m) => sum + m.amount, 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Movements List */}
          <div className="w-2/3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Current Session Movements</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {state.movements.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No movements recorded yet.</div>
              ) : (
                <div className="space-y-1">
                  {state.movements.map((movement, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-4">
                        {getMovementIcon(movement.type)}
                        <div>
                          <p className="font-medium text-slate-900">{getMovementLabel(movement.type)}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>{new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeProfile?.timezone || 'UTC' })}</span>
                            {movement.description && (
                              <>
                                <span>&bull;</span>
                                <span>{movement.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        ['sale', 'pay_in', 'open_drawer', 'overage'].includes(movement.type) ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {['sale', 'pay_in', 'open_drawer', 'overage'].includes(movement.type) ? '+' : '-'}{formatCurrency(movement.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {modalType === 'open' && 'Open Cash Drawer'}
                {modalType === 'close' && 'End of Day Reconciliation'}
                {modalType === 'pay_in' && 'Pay In (Add Cash)'}
                {modalType === 'pay_out' && 'Pay Out (Remove Cash)'}
              </h3>
            </div>
            <div className="p-6">
              <form id="movement-form" onSubmit={handleMovement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {modalType === 'open' && 'Starting Cash Amount'}
                    {modalType === 'close' && 'Actual Cash Counted'}
                    {(modalType === 'pay_in' || modalType === 'pay_out') && 'Amount'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  {modalType === 'close' && state && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Expected amount:</span>
                        <span className="font-medium text-slate-900">{formatCurrency(state.expectedCash)}</span>
                      </div>
                      {amount && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                          <span className="text-slate-500">Difference:</span>
                          <span className={`font-bold ${
                            parseFloat(amount) - state.expectedCash > 0.01 ? 'text-emerald-600' : 
                            parseFloat(amount) - state.expectedCash < -0.01 ? 'text-rose-600' : 'text-slate-900'
                          }`}>
                            {parseFloat(amount) - state.expectedCash > 0.01 ? '+' : ''}
                            {formatCurrency(parseFloat(amount) - state.expectedCash)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {(modalType === 'pay_in' || modalType === 'pay_out') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Description</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      placeholder="e.g., Change for register, Supplier payment"
                    />
                  </div>
                )}
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="movement-form"
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-colors ${
                  modalType === 'pay_out' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {modalType === 'open' && 'Open Drawer'}
                {modalType === 'close' && 'Confirm & Close Drawer'}
                {modalType === 'pay_in' && 'Add Cash'}
                {modalType === 'pay_out' && 'Remove Cash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
