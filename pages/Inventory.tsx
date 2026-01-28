import React, { useState, useEffect } from 'react';
import { Boxes, Search, Plus, Filter, AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Trash2, Edit3, X, History, Archive, AlertOctagon } from 'lucide-react';
import { InventoryItem, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const Inventory = () => {
    // Initialize with empty or local storage, but don't default to initialInventory if we want cloud truth
    const [items, setItems] = useState<InventoryItem[]>(() => {
        const s = localStorage.getItem('crm_inventory');
        return s ? JSON.parse(s) : [];
    });
    
    // Check Permissions
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const u = localStorage.getItem('crm_active_user');
        return u ? JSON.parse(u) : null;
    });

    const canManage = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('manage_inventory');

    // Mock Movement History
    const [movements, setMovements] = useState<{id: string, itemId: string, type: 'in'|'out'|'waste', amount: number, date: string, reason?: string}[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Critical' | 'Low Stock'>('All');
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Stock Logic
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockAdjustment, setStockAdjustment] = useState({ id: '', amount: 0, type: 'add' }); // type: add, remove, waste
    
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', sku: '', category: '', quantity: 0, minStock: 5, price: 0, status: 'In Stock'
    });

    // 1. Fetch from Cloud on Mount (CRITICAL FOR PERSISTENCE)
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
                if (docSnap.exists()) {
                    const list = docSnap.data().list;
                    setItems(list);
                    localStorage.setItem('crm_inventory', JSON.stringify(list));
                }
            } catch (e) {
                console.error("Error loading inventory", e);
            }
        };
        fetchInventory();
    }, []);

    const updateItems = (newItems: InventoryItem[]) => {
        setItems(newItems);
        localStorage.setItem('crm_inventory', JSON.stringify(newItems));
        // Force save to cloud
        setDoc(doc(db, 'crm_data', 'inventory'), { list: newItems }).catch(e => console.error("Save error", e));
    };

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedItem = {
            ...newItem,
            status: (Number(newItem.quantity) <= 0) ? 'Critical' : (Number(newItem.quantity) <= Number(newItem.minStock)) ? 'Low Stock' : 'In Stock',
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
                price: Number(newItem.price), // Cost price
                status: updatedItem.status as any,
                lastUpdated: updatedItem.lastUpdated,
                type: 'Product' 
            };
            updateItems([...items, item]);
        }
        setIsModalOpen(false);
    };

    const handleStockUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateItems(items.map(item => {
            if (item.id === stockAdjustment.id) {
                const newQty = stockAdjustment.type === 'add' 
                    ? item.quantity + stockAdjustment.amount 
                    : Math.max(0, item.quantity - stockAdjustment.amount);
                
                // Add to history log
                setMovements(prev => [{
                    id: Math.random().toString(),
                    itemId: item.id,
                    type: stockAdjustment.type as any,
                    amount: stockAdjustment.amount,
                    date: new Date().toLocaleString(),
                    reason: stockAdjustment.type === 'waste' ? 'Desperdicio/Daño' : stockAdjustment.type === 'add' ? 'Reposición' : 'Uso/Venta'
                }, ...prev]);

                return { 
                    ...item, 
                    quantity: newQty, 
                    status: newQty <= 0 ? 'Critical' : newQty <= item.minStock ? 'Low Stock' : 'In Stock', 
                    lastUpdated: new Date().toISOString().split('T')[0] 
                };
            }
            return item;
        }));
        setIsStockModalOpen(false);
    };

    const openHistory = (item: InventoryItem) => {
        setSelectedItemHistory(item);
        setIsHistoryOpen(true);
    };

    const filteredItems = items.filter(i => {
        return (filterType === 'All' || i.status === filterType) && 
               (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const itemMovements = movements.filter(m => m.itemId === selectedItemHistory?.id);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Control de Insumos</h1>
                    <p className="text-sm text-gray-500">Gestión de materia prima y control de mermas</p>
                </div>
                {canManage && (
                    <button onClick={() => { setEditingId(null); setNewItem({name: '', sku: '', category: 'Material', quantity: 0, minStock: 10, price: 0}); setIsModalOpen(true); }} className="bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-brand-800 flex items-center gap-2 transition-transform active:scale-95">
                        <Plus size={18} /> Nuevo Insumo
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex gap-2">
                    <button onClick={() => setFilterType('All')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'All' ? 'bg-gray-100 text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}>Todos</button>
                    <button onClick={() => setFilterType('Low Stock')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'Low Stock' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-500 hover:text-yellow-700'}`}>Por Agotar</button>
                    <button onClick={() => setFilterType('Critical')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'Critical' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:text-red-700'}`}>Agotados</button>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar material..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-200 rounded-lg text-sm outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Insumo</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Disponible</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.sku}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium bg-gray-50/30">{item.category}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className={`text-lg font-bold ${item.quantity <= item.minStock ? 'text-red-600' : 'text-brand-900'}`}>{item.quantity}</span>
                                            <span className="text-[10px] text-gray-400">Min: {item.minStock}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${item.status === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : item.status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            {item.status === 'Low Stock' ? 'Bajo' : item.status === 'Critical' ? 'Agotado' : 'OK'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setStockAdjustment({id: item.id, amount: 0, type: 'add'}); setIsStockModalOpen(true); }} className="p-2 bg-brand-50 text-brand-900 rounded-lg hover:bg-brand-100 border border-brand-100" title="Ajustar Stock"><Archive size={16}/></button>
                                            <button onClick={() => openHistory(item)} className="p-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200" title="Historial y Mermas"><History size={16}/></button>
                                            {canManage && (
                                                <>
                                                    <button onClick={() => { setEditingId(item.id); setNewItem(item); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100" title="Editar"><Edit3 size={16}/></button>
                                                    <button onClick={() => { if(confirm('¿Borrar insumo?')) updateItems(items.filter(i => i.id !== item.id)) }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100"><Trash2 size={16}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No se encontraron insumos.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Editar Insumo' : 'Registrar Insumo'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Material</label>
                                    <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tarjetas PVC" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Código Interno</label>
                                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} placeholder="Auto-generado" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
                                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="Papelería" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Stock Actual</label>
                                    <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Alerta Mínima</label>
                                    <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Costo Unitario (Referencia)</label>
                                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-900/20 outline-none bg-white text-gray-900" value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                            </div>
                            <button className="w-full bg-brand-900 text-white py-3 rounded-xl font-bold mt-4 hover:bg-brand-800 shadow-lg">Guardar Datos</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock / Waste Modal (Accessible to all viewers to report waste, maybe restrict if needed) */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-center text-gray-900">Control de Existencias</h3>
                        <form onSubmit={handleStockUpdate} className="space-y-4">
                            <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'add'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 ${stockAdjustment.type === 'add' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}><ArrowUp size={14}/> Entrada</button>
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'remove'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 ${stockAdjustment.type === 'remove' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Archive size={14}/> Uso</button>
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'waste'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 ${stockAdjustment.type === 'waste' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}><AlertOctagon size={14}/> Merma</button>
                            </div>
                            
                            <div className="text-center py-2">
                                <p className="text-xs font-bold text-gray-400 uppercase">
                                    {stockAdjustment.type === 'add' ? 'Reponer Inventario' : stockAdjustment.type === 'remove' ? 'Descontar por Uso' : 'Reportar Daño/Desperdicio'}
                                </p>
                            </div>

                            <input type="number" autoFocus className="w-full text-center text-4xl font-bold border-b-2 border-gray-200 focus:border-brand-900 outline-none py-4 text-gray-900 bg-transparent" value={stockAdjustment.amount} onChange={e => setStockAdjustment({...stockAdjustment, amount: Number(e.target.value)})} placeholder="0" />
                            
                            <button className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-colors ${stockAdjustment.type === 'waste' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-900 hover:bg-brand-800'}`}>
                                {stockAdjustment.type === 'waste' ? 'Reportar Pérdida' : 'Confirmar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryOpen && selectedItemHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md h-[500px] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div><h3 className="font-bold text-gray-900">{selectedItemHistory.name}</h3><p className="text-xs text-gray-500">Historial de Consumo</p></div>
                            <button onClick={() => setIsHistoryOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                            {itemMovements.length > 0 ? itemMovements.map(m => (
                                <div key={m.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${m.type === 'in' ? 'bg-green-100 text-green-600' : m.type === 'waste' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {m.type === 'in' ? <ArrowUp size={16}/> : m.type === 'waste' ? <AlertOctagon size={16}/> : <ArrowDown size={16}/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{m.type === 'in' ? 'Entrada' : m.type === 'waste' ? 'Merma (Daño)' : 'Uso General'}</p>
                                            <p className="text-[10px] text-gray-400">{m.date}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${m.type === 'in' ? 'text-green-600' : 'text-gray-700'}`}>{m.type === 'in' ? '+' : '-'}{m.amount}</span>
                                </div>
                            )) : <p className="text-center text-gray-400 text-sm mt-10">Sin movimientos registrados.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};