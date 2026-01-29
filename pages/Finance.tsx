import React, { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, ArrowUp, ArrowDown, History, AlertTriangle, CheckCircle2, Calculator, Save, X, Plus, Trash2, Edit3 } from 'lucide-react';
import { CashShift, CashTransaction, Sale, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const Finance = () => {
    const [shifts, setShifts] = useState<CashShift[]>([]);
    const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
    const [user, setUser] = useState<User | null>(null);
    
    // Modal States
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false); // For Open/Close
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    
    // Edit Modal State
    const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<CashShift | null>(null);
    
    const [amountInput, setAmountInput] = useState<number>(0);
    const [descriptionInput, setDescriptionInput] = useState('');
    const [categoryInput, setCategoryInput] = useState<'Sale'|'Supply'|'Service'|'Other'>('Other');
    const [transactionType, setTransactionType] = useState<'Income'|'Expense'>('Expense');
    
    // Close Shift Calc
    const [finalCashCount, setFinalCashCount] = useState<number>(0);

    const isAdmin = user?.role === 'Admin' || user?.permissions?.includes('all');

    useEffect(() => {
        const u = localStorage.getItem('crm_active_user');
        if (u) setUser(JSON.parse(u));
        
        const fetchShifts = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'crm_data', 'finance_shifts'));
                if (docSnap.exists()) {
                    const list = docSnap.data().list as CashShift[];
                    setShifts(list);
                    const open = list.find(s => s.status === 'Open');
                    if (open) setCurrentShift(open);
                }
            } catch(e) {}
        };
        fetchShifts();
    }, []);

    const saveShifts = async (newShifts: CashShift[]) => {
        setShifts(newShifts);
        await setDoc(doc(db, 'crm_data', 'finance_shifts'), { list: newShifts });
    };

    const handleOpenShift = () => {
        if (!user) return;
        const newShift: CashShift = {
            id: Math.random().toString(36).substr(2, 9),
            openDate: new Date().toISOString(),
            openedBy: user.name,
            initialAmount: amountInput,
            status: 'Open',
            transactions: []
        };
        const updated = [newShift, ...shifts];
        saveShifts(updated);
        setCurrentShift(newShift);
        setIsShiftModalOpen(false);
        setAmountInput(0);
    };

    const handleCloseShift = () => {
        if (!currentShift) return;
        
        // Calculate Expected
        const totalIncome = currentShift.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = currentShift.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
        const systemTotal = currentShift.initialAmount + totalIncome - totalExpense;
        
        const diff = finalCashCount - systemTotal;

        const closedShift: CashShift = {
            ...currentShift,
            status: 'Closed',
            closeDate: new Date().toISOString(),
            finalAmount: finalCashCount,
            systemCalculatedAmount: systemTotal,
            difference: diff
        };

        const updated = shifts.map(s => s.id === currentShift.id ? closedShift : s);
        saveShifts(updated);
        setCurrentShift(null);
        setIsShiftModalOpen(false);
    };

    const handleTransaction = () => {
        if (!currentShift || !user) return;
        
        const newTrans: CashTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            description: descriptionInput || (transactionType === 'Income' ? 'Ingreso Manual' : 'Gasto Vario'),
            amount: amountInput,
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
        
        setAmountInput(0);
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
        
        // Recalculate difference if finalAmount changed manually
        const diff = (editingShift.finalAmount || 0) - (editingShift.systemCalculatedAmount || 0);
        const updatedShift = { ...editingShift, difference: diff };

        const updatedList = shifts.map(s => s.id === editingShift.id ? updatedShift : s);
        saveShifts(updatedList);
        setIsEditShiftOpen(false);
    };

    // Calculate totals for current shift
    const totalIncome = currentShift?.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0) || 0;
    const totalExpense = currentShift?.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0) || 0;
    const currentBalance = (currentShift?.initialAmount || 0) + totalIncome - totalExpense;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanzas & Caja</h1>
                    <p className="text-sm text-gray-500">Control de ingresos, egresos y arqueo de caja</p>
                </div>
                {!currentShift ? (
                    <button onClick={() => { setAmountInput(0); setIsShiftModalOpen(true); }} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center gap-2">
                        <Unlock size={18} /> Abrir Caja
                    </button>
                ) : (
                    <button onClick={() => { setFinalCashCount(0); setIsShiftModalOpen(true); }} className="bg-brand-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-brand-800 flex items-center gap-2 border border-brand-700">
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
                            <div className="flex gap-2">
                                <button onClick={() => { setTransactionType('Income'); setCategoryInput('Other'); setIsTransactionModalOpen(true); }} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200 flex items-center gap-1"><Plus size={14}/> Registrar Entrada</button>
                                <button onClick={() => { setTransactionType('Expense'); setCategoryInput('Other'); setIsTransactionModalOpen(true); }} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-200 flex items-center gap-1"><ArrowDown size={14}/> Registrar Salida/Gasto</button>
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
                                        {t.type === 'Income' ? '+' : '-'} Bs. {t.amount}
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                                        <span className={`px-2 py-1 rounded font-bold ${!s.difference || s.difference === 0 ? 'bg-green-100 text-green-700' : s.difference > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
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
                                    <input autoFocus type="number" className="w-full text-center text-3xl font-bold border-b-2 border-gray-200 focus:border-green-500 outline-none py-2 text-gray-900" value={amountInput || ''} onChange={e => setAmountInput(Number(e.target.value))} placeholder="0.00" />
                                </div>
                                <button onClick={handleOpenShift} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg">Abrir Turno</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-center mb-4">
                                    <span className="text-xs text-gray-400 font-bold uppercase">Esperado en Sistema</span>
                                    <p className="text-xl font-bold text-gray-700">Bs. {currentBalance.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteo Físico Real (Bs)</label>
                                    <input autoFocus type="number" className="w-full text-center text-3xl font-bold border-b-2 border-gray-200 focus:border-brand-900 outline-none py-2 text-gray-900" value={finalCashCount || ''} onChange={e => setFinalCashCount(Number(e.target.value))} placeholder="0.00" />
                                </div>
                                {finalCashCount > 0 && (
                                    <div className={`text-center text-sm font-bold ${finalCashCount - currentBalance === 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        Diferencia: {(finalCashCount - currentBalance).toFixed(2)}
                                    </div>
                                )}
                                <button onClick={handleCloseShift} className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 shadow-lg mt-2">Finalizar Turno</button>
                            </div>
                        )}
                        <button onClick={() => setIsShiftModalOpen(false)} className="w-full mt-3 py-2 text-gray-500 font-medium hover:text-gray-900">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Modal Transactions */}
            {isTransactionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Registrar {transactionType === 'Income' ? 'Ingreso' : 'Salida / Gasto'}</h3>
                            <button onClick={() => setIsTransactionModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto (Bs)</label>
                                <input autoFocus type="number" className="w-full text-3xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-900 outline-none text-gray-900" value={amountInput || ''} onChange={e => setAmountInput(Number(e.target.value))} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Motivo</label>
                                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-900 outline-none text-gray-900" value={descriptionInput} onChange={e => setDescriptionInput(e.target.value)} placeholder={transactionType === 'Expense' ? "Ej. Almuerzo personal, Pago luz..." : "Ej. Venta sin recibo..."} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-900 outline-none text-gray-900 bg-white" value={categoryInput} onChange={e => setCategoryInput(e.target.value as any)}>
                                    <option value="Other" className="bg-white text-gray-900">Varios / Otros</option>
                                    <option value="Supply" className="bg-white text-gray-900">Compra de Insumos</option>
                                    <option value="Service" className="bg-white text-gray-900">Servicios Básicos</option>
                                    <option value="Sale" className="bg-white text-gray-900">Venta Directa</option>
                                </select>
                            </div>
                            <button onClick={handleTransaction} className={`w-full py-3 text-white rounded-xl font-bold shadow-lg mt-2 ${transactionType === 'Income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
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
                            <button onClick={() => setIsEditShiftOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded">Solo editar en caso de error humano.</p>
                        <form onSubmit={handleSaveEditShift} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Inicial</label>
                                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white" value={editingShift.initialAmount} onChange={e => setEditingShift({...editingShift, initialAmount: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Final Real (Físico)</label>
                                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white" value={editingShift.finalAmount} onChange={e => setEditingShift({...editingShift, finalAmount: Number(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md">Guardar Corrección</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};