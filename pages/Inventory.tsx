
import React, { useState, useEffect } from 'react';
import { Boxes, Search, Plus, Filter, AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Trash2, Edit3, X, History, Archive, AlertOctagon, TrendingUp, HelpCircle, Calculator, Package, Link as LinkIcon, Scale, Layers, CheckCircle2, Tag } from 'lucide-react';
import { InventoryItem, User, AuditLog, Sale } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';

// Helper for Audit
const logAuditAction = async (action: 'Delete' | 'Update' | 'Create', description: string, user: User, metadata?: string) => {
    const log: AuditLog = {
        id: Date.now().toString(),
        action,
        module: 'Inventory',
        description,
        user: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        metadata: metadata || null
    };
    try {
        const savedLogs = localStorage.getItem('crm_audit_logs');
        const logs = savedLogs ? JSON.parse(savedLogs) : [];
        const updatedLogs = [log, ...logs];
        localStorage.setItem('crm_audit_logs', JSON.stringify(updatedLogs));
        await setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs });
    } catch(e) { console.error("Audit Log Error", e); }
};

interface Movement {
    id: string;
    itemId: string;
    itemName: string;
    type: 'in'|'out'|'waste';
    amount: number;
    date: string;
    user: string;
    reason?: string;
    costImpact?: number;
}

export const Inventory = () => {
    const [items, setItems] = useState<InventoryItem[]>(() => {
        const s = localStorage.getItem('crm_inventory');
        return s ? JSON.parse(s) : [];
    });
    
    const [movements, setMovements] = useState<Movement[]>(() => {
        const s = localStorage.getItem('crm_inventory_movements');
        return s ? JSON.parse(s) : [];
    });

    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const u = localStorage.getItem('crm_active_user');
        return u ? JSON.parse(u) : null;
    });

    const canManage = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('manage_inventory');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Critical' | 'Low Stock'>('All');
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockAdjustment, setStockAdjustment] = useState({ id: '', amount: 0, type: 'add' }); 
    
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', sku: '', category: '', quantity: 0, minStock: 5, price: 0, status: 'In Stock', keywords: ''
    });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {}, type: 'danger' as 'danger' | 'info' | 'success', confirmText: 'Confirmar' });

    useEffect(() => {
        const fetchInventory = async () => {
            setIsSyncing(true);
            try {
                const docSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
                if (docSnap.exists()) {
                    const list = docSnap.data().list;
                    setItems(list);
                    localStorage.setItem('crm_inventory', JSON.stringify(list));
                }
                const movSnap = await getDoc(doc(db, 'crm_data', 'inventory_movements'));
                if (movSnap.exists()) {
                    const list = movSnap.data().list;
                    setMovements(list);
                    localStorage.setItem('crm_inventory_movements', JSON.stringify(list));
                }
                const currentYear = new Date().getFullYear();
                const [legacySales, currentSales] = await Promise.all([
                    getDoc(doc(db, 'crm_data', 'sales_history')),
                    getDoc(doc(db, 'crm_data', `sales_${currentYear}`))
                ]);
                let allSales: Sale[] = [];
                if(legacySales.exists()) allSales = [...allSales, ...legacySales.data().list];
                if(currentSales.exists()) allSales = [...allSales, ...currentSales.data().list];
                setSalesHistory(allSales);
            } catch (e) { console.error("Error loading inventory data", e); }
            finally { setIsSyncing(false); }
        };
        fetchInventory();
    }, []);

    const updateItems = (newItems: InventoryItem[]) => {
        setItems(newItems);
        localStorage.setItem('crm_inventory', JSON.stringify(newItems));
        setDoc(doc(db, 'crm_data', 'inventory'), { list: newItems }).catch(()=>{});
    };

    const updateMovements = (newMovements: Movement[]) => {
        setMovements(newMovements);
        localStorage.setItem('crm_inventory_movements', JSON.stringify(newMovements));
        setDoc(doc(db, 'crm_data', 'inventory_movements'), { list: newMovements }).catch(()=>{});
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const itemToDelete = items.find(i => i.id === id);
        
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Insumo',
            message: `¿Estás seguro de eliminar "${itemToDelete?.name}" permanentemente?`,
            type: 'danger',
            confirmText: 'Eliminar',
            action: () => {
                const updated = items.filter(i => i.id !== id);
                updateItems(updated);
                if(currentUser) logAuditAction('Delete', `Eliminó insumo ${itemToDelete?.name || id}`, currentUser);
            }
        });
    };

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        const statusVal: InventoryItem['status'] = (Number(newItem.quantity) <= 0) ? 'Critical' : (Number(newItem.quantity) <= Number(newItem.minStock)) ? 'Low Stock' : 'In Stock';
        
        const updatedItem = {
            ...newItem,
            status: statusVal,
            lastUpdated: new Date().toISOString().split('T')[0]
        };

        if (editingId) {
            updateItems(items.map(i => i.id === editingId ? { ...i, ...updatedItem } as InventoryItem : i));
        } else {
            const item: InventoryItem = {
                id: Math.random().toString(36).substr(2, 9),
                name: newItem.name!,
                sku: newItem.sku || `INS-${Math.floor(Math.random()*1000)}`,
                category: newItem.category || 'General',
                quantity: Number(newItem.quantity),
                minStock: Number(newItem.minStock),
                price: Number(newItem.price),
                status: statusVal,
                lastUpdated: updatedItem.lastUpdated,
                type: 'Product',
                keywords: newItem.keywords || ''
            };
            updateItems([...items, item]);
        }
        setIsModalOpen(false);
    };

    const handleStockUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        let freshItems = [...items];
        try {
            const freshDoc = await getDoc(doc(db, 'crm_data', 'inventory'));
            if(freshDoc.exists()) freshItems = freshDoc.data().list;
        } catch(e) {}

        const targetItem = freshItems.find(i => i.id === stockAdjustment.id);
        if (!targetItem) return;

        if (stockAdjustment.type !== 'add' && targetItem.quantity < stockAdjustment.amount) {
            alert(`Error: Stock insuficiente.`);
            return;
        }

        const newQty = stockAdjustment.type === 'add' 
            ? targetItem.quantity + stockAdjustment.amount 
            : Math.max(0, targetItem.quantity - stockAdjustment.amount);
        
        const costImpact = stockAdjustment.type === 'waste' ? (stockAdjustment.amount * targetItem.price) : 0;

        const updatedItemsList = freshItems.map(item => {
            if (item.id === stockAdjustment.id) {
                const newStatus: InventoryItem['status'] = newQty <= 0 ? 'Critical' : newQty <= (item.minStock || 0) ? 'Low Stock' : 'In Stock';
                return { 
                    ...item, 
                    quantity: newQty, 
                    status: newStatus, 
                    lastUpdated: new Date().toISOString().split('T')[0] 
                };
            }
            return item;
        });
        
        updateItems(updatedItemsList);

        const newMovement: Movement = {
            id: Date.now().toString(),
            itemId: targetItem.id,
            itemName: targetItem.name,
            type: stockAdjustment.type as any,
            amount: stockAdjustment.amount,
            date: new Date().toISOString(),
            user: currentUser?.name || 'Desconocido',
            reason: stockAdjustment.type === 'waste' ? 'Desperdicio/Daño' : stockAdjustment.type === 'add' ? 'Reposición Manual' : 'Uso Manual',
            costImpact
        };
        updateMovements([newMovement, ...movements]);
        setIsStockModalOpen(false);
    };

    const openHistory = (item: InventoryItem) => {
        setSelectedItemHistory(item);
        setIsHistoryOpen(true);
    };

    const isItemLinked = (item: InventoryItem) => {
        return salesHistory.some(sale => sale.items.some(i => {
            const desc = i.description.trim().toLowerCase();
            return desc === item.name.trim().toLowerCase() || item.keywords?.toLowerCase().includes(desc);
        }));
    };

    const getCalculatedStatus = (item: InventoryItem) => {
        if (item.quantity <= 0) return 'Critical';
        if (item.quantity <= (item.minStock || 5)) return 'Low Stock';
        return 'In Stock';
    };

    const filteredItems = items.filter(i => {
        const calculatedStatus = getCalculatedStatus(i);
        const searchLower = searchTerm.toLowerCase();
        const matchesText = i.name.toLowerCase().includes(searchLower) || i.sku.toLowerCase().includes(searchLower) || (i.keywords && i.keywords.toLowerCase().includes(searchLower));
        return (filterType === 'All' || calculatedStatus === filterType) && matchesText;
    });

    const itemMovements = movements.filter(m => m.itemId === selectedItemHistory?.id);
    const totalInventoryValue = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    return (
        <div className="space-y-3 md:space-y-6 h-full flex flex-col relative pb-safe-area bg-[#f4f6f7]">
            <ConfirmationModal 
                isOpen={confirmModal.isOpen} 
                onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText || "Eliminar"}
            />

            <div className="flex flex-row justify-between items-center bg-white p-3 md:p-4 rounded-2xl border border-gray-200 shadow-sm shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-brand-900 tracking-tight flex items-center gap-2">
                        Inventario
                        <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-brand-900 transition-colors"><HelpCircle size={18}/></button>
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500">Materia prima y stock</p>
                </div>
                {canManage && (
                    <button onClick={() => { setEditingId(null); setNewItem({name: '', sku: '', category: 'Material', quantity: 0, minStock: 10, price: 0, keywords: ''}); setIsModalOpen(true); }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-brand-800 flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[44px]">
                        <Plus size={18} /> <span className="hidden xs:inline">Nuevo</span>
                    </button>
                )}
            </div>

            {/* Compact Top Section */}
            <div className="flex flex-col md:flex-row gap-3 shrink-0">
                {/* Valuation Compact */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 md:w-auto min-w-[200px]">
                    <div className="p-2 bg-green-50 text-green-700 rounded-lg shrink-0"><TrendingUp size={18}/></div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Valor Total</p>
                        <p className="text-sm font-black text-brand-900">Bs. {totalInventoryValue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-2 flex-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        <button onClick={() => setFilterType('All')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterType === 'All' ? 'bg-brand-900 text-white shadow' : 'bg-gray-50 text-gray-600'}`}>Todos</button>
                        <button onClick={() => setFilterType('Low Stock')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterType === 'Low Stock' ? 'bg-yellow-500 text-white shadow' : 'bg-gray-50 text-gray-600'}`}>Bajo</button>
                        <button onClick={() => setFilterType('Critical')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterType === 'Critical' ? 'bg-red-600 text-white shadow' : 'bg-gray-50 text-gray-600'}`}>Agotado</button>
                    </div>
                    <div className="relative flex-1 min-w-[150px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                        <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs md:text-sm outline-none focus:ring-1 focus:ring-brand-200 transition-all h-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* List Container - Scrollable Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Insumo</th>
                                <th className="px-6 py-4">Costo</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredItems.map(item => {
                                const status = getCalculatedStatus(item);
                                return (
                                <tr key={item.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4"><p className="font-bold text-sm text-gray-900">{item.name}</p><p className="text-xs text-gray-500">{item.sku}</p></td>
                                    <td className="px-6 py-4 text-sm font-medium">Bs. {item.price}</td>
                                    <td className="px-6 py-4 text-center"><span className="font-bold text-lg">{item.quantity}</span></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${status === 'Critical' ? 'bg-red-100 text-red-600' : status === 'Low Stock' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>{status === 'Low Stock' ? 'Bajo' : status === 'Critical' ? 'Agotado' : 'OK'}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setStockAdjustment({id: item.id, amount: 0, type: 'add'}); setIsStockModalOpen(true); }} className="p-2 bg-brand-50 text-brand-900 rounded-lg hover:bg-brand-100"><Archive size={16}/></button>
                                            <button onClick={() => openHistory(item)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><History size={16}/></button>
                                            {canManage && <button onClick={() => { setEditingId(item.id); setNewItem(item); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={16}/></button>}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                    {filteredItems.map(item => {
                        const status = getCalculatedStatus(item);
                        return (
                        <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${status === 'Critical' ? 'bg-red-500' : status === 'Low Stock' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <div className="flex justify-between items-start pl-2">
                                <h4 className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.name}</h4>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${status === 'Critical' ? 'bg-red-50 text-red-600' : status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                    {status === 'Low Stock' ? 'Bajo' : status === 'Critical' ? 'Agotado' : 'OK'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pl-2">
                                <div className="text-center bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Stock</span>
                                    <span className="font-bold text-lg text-brand-900 leading-none">{item.quantity}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setStockAdjustment({id: item.id, amount: 0, type: 'add'}); setIsStockModalOpen(true); }} className="bg-brand-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 flex items-center gap-1">
                                        <Archive size={14}/> Ajustar
                                    </button>
                                    <button onClick={() => openHistory(item)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg"><History size={16}/></button>
                                </div>
                            </div>
                        </div>
                    )})}
                    {filteredItems.length === 0 && <div className="text-center py-10 text-gray-400 text-xs">Sin resultados.</div>}
                </div>
            </div>

            {/* Keep Modals unchanged logically but ensured full screen mobile classes */}
            {/* Create/Edit Modal */}
            {isModalOpen && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl md:max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 md:rounded-t-2xl sticky top-0 z-10 pt-safe-top shrink-0">
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Editar' : 'Nuevo'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 p-2 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleCreateItem} className="space-y-4 p-6 overflow-y-auto flex-1">
                            <div><label className="block text-xs font-bold uppercase mb-1">Nombre</label><input required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase mb-1">Stock</label><input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} /></div>
                            <button className="w-full bg-brand-900 text-white py-3 rounded-xl font-bold">Guardar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Modal */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:rounded-2xl md:max-w-sm shadow-2xl animate-in zoom-in duration-200 flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 md:rounded-t-2xl sticky top-0 z-10 pt-safe-top shrink-0">
                             <h3 className="font-bold text-xl text-gray-900">Ajuste Rápido</h3>
                             <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 p-2 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleStockUpdate} className="space-y-6 p-6 flex-1 overflow-y-auto">
                            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'add'})} className={`flex-1 py-3 text-xs font-bold rounded-lg ${stockAdjustment.type === 'add' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Entrada</button>
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'remove'})} className={`flex-1 py-3 text-xs font-bold rounded-lg ${stockAdjustment.type === 'remove' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Salida</button>
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'waste'})} className={`flex-1 py-3 text-xs font-bold rounded-lg ${stockAdjustment.type === 'waste' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Merma</button>
                            </div>
                            <input type="number" autoFocus className="w-full text-center text-5xl font-black border-b-2 border-gray-200 focus:border-brand-900 outline-none py-4 text-gray-900 bg-transparent" value={stockAdjustment.amount} onChange={e => setStockAdjustment({...stockAdjustment, amount: Number(e.target.value)})} placeholder="0" />
                            <button className="w-full py-4 rounded-xl font-bold text-lg text-white bg-brand-900 shadow-lg">Confirmar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
