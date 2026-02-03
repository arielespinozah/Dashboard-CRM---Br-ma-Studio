
import React, { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, ArrowUp, ArrowDown, History, AlertTriangle, CheckCircle2, Calculator, Save, X, Plus, Trash2, Edit3 } from 'lucide-react';
import { CashShift, CashTransaction, Sale, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// --- SCALABILITY HELPER ---
const getFinanceDocId = (year: string | number) => `finance_shifts_${year}`;

export const Finance = () => {
    const [shifts, setShifts] = useState<CashShift[]>([]);
    const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
    const [user, setUser] = useState<User | null>(null);
    
    // Modal States
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false); 
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    
    // Edit Modal State
    const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<CashShift | null>(null);
    
    // Use string for input to handle empty state better than 0
    const [amountInput, setAmountInput] = useState<string>(''); 
    const [descriptionInput, setDescriptionInput] = useState('');
    const [categoryInput, setCategoryInput] = useState<'Sale'|'Supply'|'Service'|'Other'>('Other');
    const [transactionType, setTransactionType] = useState<'Income'|'Expense'>('Expense');
    
    const [finalCashCount, setFinalCashCount] = useState<string>('');

    const isAdmin = user?.role === 'Admin' || user?.permissions?.includes('all');

    useEffect(() => {
        const u = localStorage.getItem('crm_active_user');
        if (u) setUser(JSON.parse(u));
        
        const fetchShifts = async () => {
            try {
                // Architecture Update: Load multiple years to avoid 1MB limit on single doc
                // Strategy: Load Legacy + Current Year + Previous Year
                const currentYear = new Date().getFullYear();
                const prevYear = currentYear - 1;

                const [legacySnap, currentSnap, prevSnap] = await Promise.all([
                    getDoc(doc(db, 'crm_data', 'finance_shifts')), // Old monolithic doc
                    getDoc(doc(db, 'crm_data', getFinanceDocId(currentYear))), // 2025
                    getDoc(doc(db, 'crm_data', getFinanceDocId(prevYear))) // 2024
                ]);

                let allShifts: CashShift[] = [];
                if (legacySnap.exists()) allShifts = [...allShifts, ...legacySnap.data().list];
                if (prevSnap.exists()) allShifts = [...allShifts, ...prevSnap.data().list];
                if (currentSnap.exists()) allShifts = [...allShifts, ...currentSnap.data().list];

                // Dedupe and Sort
                const uniqueShifts = Array.from(new Map(allShifts.map(item => [item.id, item])).values());
                const sorted = uniqueShifts.sort((a,b) => new Date(b.openDate).getTime() - new Date(a.openDate).getTime());
                
                setShifts(sorted);
                
                // Find first open shift (newest)
                const open = sorted.find(s => s.status === 'Open');
                if (open) setCurrentShift(open);

            } catch(e) {
                console.error("Finance sync error", e);
            }
        };
        fetchShifts();
    }, []);

    // --- SCALABLE SAVE ---
    const saveShifts = async (updatedAllShifts: CashShift[]) => {
        setShifts(updatedAllShifts);
        
        // Group by Year
        const shiftsByYear: Record<string, CashShift[]> = {};
        updatedAllShifts.forEach(shift => {
            const year = new Date(shift.openDate).getFullYear();
            if (!shiftsByYear[year]) shiftsByYear[year] = [];
            shiftsByYear[year].push(shift);
        });

        // Save partitioned docs
        Object.keys(shiftsByYear).forEach(year => {
            const docId = getFinanceDocId(year);
            setDoc(doc(db, 'crm_data', docId), { list: shiftsByYear[year] }).catch(e => console.error(e));
        });
    };

    const handleOpenShift = () => {
        if (!user) return;
        const initial = parseFloat(amountInput) || 0;
        const newShift: CashShift = {
            id: Math.random().toString(36).substr(2, 9),
            openDate: new Date().toISOString(),
            openedBy: user.name,
            initialAmount: initial,
            status: 'Open',
            transactions: []
        };
        const updated = [newShift, ...shifts];
        saveShifts(updated);
        setCurrentShift(newShift);
        setIsShiftModalOpen(false);
        setAmountInput('');
    };

    const handleCloseShift = () => {
        if (!currentShift) return;
        
        const final = parseFloat(finalCashCount) || 0;

        // Calculate Expected
        const totalIncome = currentShift.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + (Number(t.amount)||0), 0);
        const totalExpense = currentShift.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + (Number(t.amount)||0), 0);
        const systemTotal = (currentShift.initialAmount || 0) + totalIncome - totalExpense;
        
        const diff = final - systemTotal;

        const closedShift: CashShift = {
            ...currentShift,
            status: 'Closed',
            closeDate: new Date().toISOString(),
            finalAmount: final,
            systemCalculatedAmount: systemTotal,
            difference: diff
        };

        const updated = shifts.map(s => s.id === currentShift.id ? closedShift : s);
        saveShifts(updated);
        setCurrentShift(null);
        setIsShiftModalOpen(false);
        setFinalCashCount('');
    };

    const handleTransaction = () => {
        if (!currentShift || !user) return;
        const amount = parseFloat(amountInput);
        if (amount <= 0 || isNaN(amount)) {
            alert("Ingrese un monto válido");
            return;
        }
        
        const newTrans: CashTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            description: descriptionInput || (transactionType === 'Income' ? 'Ingreso Manual' : 'Gasto Vario'),
            amount: amount,
            type: transactionType,
            category: categoryInput,
            date: new Date().toISOString(),
            user: user.name
        };

        const updatedShift = { 
            ...currentShift, 
            transactions: [newTrans, ...currentShift.transactions] 
        };
        
        const updatedList = shifts.map(s => s.id === currentShift.id ? updatedShift : s);
        saveShifts(updatedList);
        setCurrentShift(updatedShift);
        setIsTransactionModalOpen(false);
        
        setAmountInput('');
        setDescriptionInput('');
    };

    // Admin Functions
    const handleDeleteShift = (id: string) => {
        if (confirm('¿Eliminar registro de caja permanentemente? Esto no se puede deshacer.')) {
            const updated = shifts.filter(s => s.id !== id);
            saveShifts(updated);
            if (currentShift?.id === id) setCurrentShift(null);
        }
    };

    const openEditShift = (shift: CashShift) => {
        setEditingShift({...shift});
        setIsEditShiftOpen(true);
    };

    const handleSaveEditShift = (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingShift) return;
        
        const initial = Number(editingShift.initialAmount) || 0;
        const final = Number(editingShift.finalAmount) || 0;

        // SECURITY: Re-calculate system totals based on transactions + new initial amount
        const totalIncome = editingShift.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + (Number(t.amount)||0), 0);
        const totalExpense = editingShift.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + (Number(t.amount)||0), 0);
        
        const newSystemTotal = initial + totalIncome - totalExpense;
        const newDiff = final - newSystemTotal;
        
        const updatedShift = { 
            ...editingShift, 
            initialAmount: initial,
            finalAmount: final,
            systemCalculatedAmount: newSystemTotal,
            difference: newDiff 
        };

        const updatedList = shifts.map(s => s.id === editingShift.id ? updatedShift : s);
        saveShifts(updatedList);
        setIsEditShiftOpen(false);
    };

    // Calculate totals for current shift (Safeguarded)
    const totalIncome = currentShift?.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + (Number(t.amount)||0), 0) || 0;
    const totalExpense = currentShift?.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + (Number(t.amount)||0), 0) || 0;
    const currentBalance = (currentShift?.initialAmount || 0) + totalIncome - totalExpense;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanzas & Caja</h1>
                    <p className="text-sm text-gray-500">Control de ingresos, egresos y arqueo de caja</p>
                </div>
                {!currentShift ? (
                    <button onClick={() => { setAmountInput(''); setIsShiftModalOpen(true); }} className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 min-h-[48px] active:scale-95 transition-transform">
                        <Unlock size={18} /> Abrir Caja
                    </button>
                ) : (
                    <button onClick={() => { setFinalCashCount(''); setIsShiftModalOpen(true); }} className="w-full sm:w-auto bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-800 flex items-center justify-center gap-2 border border-brand-700 min-h-[48px] active:scale-95 transition-transform">
                        <Lock size={18} /> Cerrar Caja (Arqueo)
                    </button>
                )}
            </div>

            {currentShift ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 md:col-span-3 lg:col-span-1">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Estado Actual</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <span className="text-gray-600">Fondo Inicial</span>
                                <span className="font-bold text-gray-900">Bs. {currentShift.initialAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <span className="text-green-600 flex items-center gap-1"><ArrowUp size={14}/> Entradas</span>
                                <span className="font-bold text-green-600">+ Bs. {totalIncome.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <span className="text-red-500 flex items-center gap-1"><ArrowDown size={14}/> Salidas/Gastos</span>
                                <span className="font-bold text-red-500">- Bs. {totalExpense.toFixed(2)}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl mt-2 text-center">
                                <span className="text-xs text-gray-400 font-bold uppercase">En Caja (Sistema)</span>
                                <p className="text-3xl font-bold text-brand-900">Bs. {currentBalance.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions & Transactions */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 md:col-span-3 lg:col-span-2 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                            <h3 className="font-bold text-gray-900">Movimientos del Turno</h3>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => { setTransactionType('Income'); setCategoryInput('Other'); setAmountInput(''); setIsTransactionModalOpen(true); }} className="flex-1 sm:flex-none px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 border border-green-200 flex items-center justify-center gap-1 min-h-[44px]"><Plus size={16}/> Entrada</button>
                                <button onClick={() => { setTransactionType('Expense'); setCategoryInput('Other'); setAmountInput(''); setIsTransactionModalOpen(true); }} className="flex-1 sm:flex-none px-4 py-2.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1 min-h-[44px]"><ArrowDown size={16}/> Salida</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2">
                            {currentShift.transactions.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Sin movimientos registrados aún.</p>}
                            {currentShift.transactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${t.type === 'Income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {t.type === 'Income' ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{t.description}</p>
                                            <p className="text-xs text-gray-500">{new Date(t.date).toLocaleTimeString()} • {t.user} • {t.category === 'Sale' ? 'Venta' : t.category === 'Supply' ? 'Compra Insumos' : 'Otros'}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'Income' ? '+' : '-'} Bs. {Number(t.amount).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Caja Cerrada</h3>
                    <p className="text-gray-500 mb-6">Inicia un turno para comenzar a registrar movimientos.</p>
                </div>
            )}

            {/* History Section */}
            <div className="mt-8">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><History size={18}/> Historial de Cierres</h3>
                {/* Responsive Table/Cards */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-4">Fecha Cierre</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4 text-right">Inicial</th>
                                <th className="px-6 py-4 text-right">Sistema</th>
                                <th className="px-6 py-4 text-right">Real (Físico)</th>
                                <th className="px-6 py-4 text-right">Diferencia</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Admin</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {shifts.filter(s => s.status === 'Closed').map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-900 font-medium">{new Date(s.closeDate!).toLocaleDateString()} {new Date(s.closeDate!).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 text-gray-600">{s.openedBy}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">Bs. {s.initialAmount}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">Bs. {s.systemCalculatedAmount?.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-brand-900">Bs. {s.finalAmount?.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded font-bold ${!s.difference || Math.abs(s.difference) < 0.5 ? 'bg-green-100 text-green-700' : s.difference > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            {s.difference && s.difference > 0 ? '+' : ''}{s.difference?.toFixed(2)}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEditShift(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Corregir"><Edit3 size={16}/></button>
                                                <button onClick={() => handleDeleteShift(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Borrar Registro"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {shifts.filter(s => s.status === 'Closed').length === 0 && (
                                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-gray-400">No hay historial disponible.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards for History */}
                <div className="md:hidden space-y-3">
                    {shifts.filter(s => s.status === 'Closed').map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{new Date(s.closeDate!).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500">{new Date(s.closeDate!).toLocaleTimeString()} • {s.openedBy}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${!s.difference || Math.abs(s.difference) < 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Dif: {s.difference?.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-2 mt-2">
                                <div className="text-gray-500 text-xs">Sistema: {s.systemCalculatedAmount?.toFixed(2)}</div>
                                <div className="font-bold text-brand-900">Real: Bs. {s.finalAmount?.toFixed(2)}</div>
                            </div>
                            {isAdmin && (
                                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-50">
                                    <button onClick={() => openEditShift(s)} className="p-2 bg-blue-50 text-blue-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"><Edit3 size={18}/></button>
                                    <button onClick={() => handleDeleteShift(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"><Trash2 size={18}/></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Open/Close Shift */}
            {isShiftModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${!currentShift ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-900'}`}>
                                {!currentShift ? <Unlock size={28}/> : <Calculator size={28}/>}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{!currentShift ? 'Apertura de Caja' : 'Cierre de Caja'}</h3>
                            <p className="text-sm text-gray-500">{!currentShift ? 'Ingresa el monto inicial en efectivo.' : 'Cuenta el dinero físico e ingrésalo.'}</p>
                        </div>
                        
                        {!currentShift ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Inicial (Bs)</label>
                                    <input autoFocus type="number" className="w-full text-center text-4xl font-bold border-b-2 border-gray-200 focus:border-green-500 outline-none py-3 text-gray-900 bg-transparent tracking-tight" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="0.00" />
                                </div>
                                <button onClick={handleOpenShift} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg min-h-[56px] active:scale-95 transition-transform">Abrir Turno</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-center mb-4">
                                    <span className="text-xs text-gray-400 font-bold uppercase">Esperado en Sistema</span>
                                    <p className="text-2xl font-bold text-gray-700">Bs. {currentBalance.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteo Físico Real (Bs)</label>
                                    <input autoFocus type="number" className="w-full text-center text-4xl font-bold border-b-2 border-gray-200 focus:border-brand-900 outline-none py-3 text-gray-900 bg-transparent tracking-tight" value={finalCashCount} onChange={e => setFinalCashCount(e.target.value)} placeholder="0.00" />
                                </div>
                                {(parseFloat(finalCashCount) > 0) && (
                                    <div className={`text-center text-sm font-bold ${Math.abs(parseFloat(finalCashCount) - currentBalance) < 0.5 ? 'text-green-600' : 'text-red-500'}`}>
                                        Diferencia: {(parseFloat(finalCashCount) - currentBalance).toFixed(2)}
                                    </div>
                                )}
                                <button onClick={handleCloseShift} className="w-full py-4 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 shadow-lg mt-2 min-h-[56px] active:scale-95 transition-transform">Finalizar Turno</button>
                            </div>
                        )}
                        <button onClick={() => setIsShiftModalOpen(false)} className="w-full mt-3 py-3 text-gray-500 font-medium hover:text-gray-900 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Modal Transactions */}
            {isTransactionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Registrar {transactionType === 'Income' ? 'Ingreso' : 'Salida / Gasto'}</h3>
                            <button onClick={() => setIsTransactionModalOpen(false)} className="text-gray-400 hover:text-red-600 p-1"><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto (Bs)</label>
                                <input autoFocus type="number" className="w-full text-3xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-900 outline-none text-gray-900 bg-white" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Motivo</label>
                                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-brand-900 outline-none text-gray-900 bg-white min-h-[48px]" value={descriptionInput} onChange={e => setDescriptionInput(e.target.value)} placeholder={transactionType === 'Expense' ? "Ej. Almuerzo personal, Pago luz..." : "Ej. Venta sin recibo..."} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-brand-900 outline-none text-gray-900 bg-white min-h-[48px]" value={categoryInput} onChange={e => setCategoryInput(e.target.value as any)}>
                                    <option value="Other" className="bg-white text-gray-900">Varios / Otros</option>
                                    <option value="Supply" className="bg-white text-gray-900">Compra de Insumos</option>
                                    <option value="Service" className="bg-white text-gray-900">Servicios Básicos</option>
                                    <option value="Sale" className="bg-white text-gray-900">Venta Directa</option>
                                </select>
                            </div>
                            <button onClick={handleTransaction} className={`w-full py-4 text-white rounded-xl font-bold shadow-lg mt-2 min-h-[56px] active:scale-95 transition-transform ${transactionType === 'Income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                Confirmar Movimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Shift (Admin) */}
            {isEditShiftOpen && editingShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Corregir Cierre</h3>
                            <button onClick={() => setIsEditShiftOpen(false)} className="text-gray-400 hover:text-red-600 p-1"><X size={24} /></button>
                        </div>
                        <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded">Advertencia: El sistema recalculará los totales basándose en las transacciones internas y el nuevo monto inicial.</p>
                        <form onSubmit={handleSaveEditShift} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Inicial Correcto</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white min-h-[48px]" value={editingShift.initialAmount} onChange={e => setEditingShift({...editingShift, initialAmount: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Final Real (Físico)</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white min-h-[48px]" value={editingShift.finalAmount} onChange={e => setEditingShift({...editingShift, finalAmount: Number(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md min-h-[52px]">Guardar y Recalcular</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};