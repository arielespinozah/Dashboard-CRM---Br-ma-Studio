import React, { useState } from 'react';
import { Boxes, Search, Plus, Filter, AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Trash2, Edit3, X, Save } from 'lucide-react';
import { InventoryItem } from '../types';

const initialInventory: InventoryItem[] = [
    { id: '1', name: 'Sello Trodat 4911', sku: 'SKU-001', category: 'Insumos', quantity: 3, minStock: 5, price: 80, status: 'Critical', lastUpdated: '2023-10-25' },
    { id: '2', name: 'Tinta Negra 25ml', sku: 'SKU-002', category: 'Insumos', quantity: 12, minStock: 10, price: 25, status: 'Low Stock', lastUpdated: '2023-10-24' },
    { id: '3', name: 'Papel Fotográfico A4', sku: 'SKU-003', category: 'Papelería', quantity: 500, minStock: 100, price: 1.5, status: 'In Stock', lastUpdated: '2023-10-20' },
];

export const Inventory = () => {
    const [items, setItems] = useState<InventoryItem[]>(initialInventory);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockAdjustment, setStockAdjustment] = useState({ id: '', amount: 0, type: 'add' });
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', sku: '', category: '', quantity: 0, minStock: 5, price: 0, status: 'In Stock'
    });

    // Standard Button Style
    const btnPrimary = "bg-brand-900 text-white h-11 px-5 rounded-xl text-sm font-medium hover:bg-brand-800 transition-all shadow-md shadow-brand-900/10 flex items-center gap-2";
    const btnSecondary = "bg-white border border-gray-200 text-gray-700 h-11 px-5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-2";

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'Low Stock': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        const item: InventoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: newItem.name || 'Nuevo Producto',
            sku: newItem.sku || 'SKU-NEW',
            category: newItem.category || 'General',
            quantity: Number(newItem.quantity),
            minStock: Number(newItem.minStock),
            price: Number(newItem.price),
            status: Number(newItem.quantity) <= 0 ? 'Critical' : 'In Stock',
            lastUpdated: new Date().toISOString().split('T')[0]
        };
        setItems([...items, item]);
        setIsModalOpen(false);
        setNewItem({ name: '', sku: '', category: '', quantity: 0, minStock: 5, price: 0, status: 'In Stock' });
    };

    const handleDeleteItem = (id: string) => {
        if(confirm('¿Eliminar ítem del inventario?')) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const handleStockUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        setItems(prev => prev.map(item => {
            if (item.id === stockAdjustment.id) {
                const newQty = stockAdjustment.type === 'add' 
                    ? item.quantity + stockAdjustment.amount 
                    : Math.max(0, item.quantity - stockAdjustment.amount);
                
                let newStatus: any = 'In Stock';
                if (newQty <= 0) newStatus = 'Critical';
                else if (newQty <= item.minStock) newStatus = 'Low Stock';

                return { ...item, quantity: newQty, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0] };
            }
            return item;
        }));
        setIsStockModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Inventario</h1>
                    <p className="text-sm text-gray-500">Control de stock y reabastecimiento</p>
                </div>
                <div className="flex gap-3">
                    <button className={btnSecondary}>
                        <Filter size={18} /> Filtros
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className={btnPrimary}>
                        <Plus size={18} /> Nuevo Ítem
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-50 text-red-600"><AlertTriangle size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500">Críticos</p>
                        <p className="text-2xl font-bold text-brand-900">{items.filter(i => i.status === 'Critical').length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600"><ArrowDown size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500">Stock Bajo</p>
                        <p className="text-2xl font-bold text-brand-900">{items.filter(i => i.status === 'Low Stock').length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-brand-50 text-brand-900"><Boxes size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Ítems</p>
                        <p className="text-2xl font-bold text-brand-900">{items.length}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o SKU..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all shadow-sm text-brand-900 placeholder:text-gray-400"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-brand-900">{item.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-brand-900">{item.quantity}</span>
                                        <span className="text-xs text-gray-400 ml-1">/ {item.minStock}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                                            {item.status === 'Critical' ? 'Crítico' : item.status === 'Low Stock' ? 'Bajo' : 'Normal'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => { setStockAdjustment({ id: item.id, amount: 0, type: 'add' }); setIsStockModalOpen(true); }}
                                            className="p-2 text-brand-900 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                                            title="Ajustar Stock"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Item Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-brand-900">Nuevo Ítem</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleCreateItem} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
                                    <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Código</label>
                                    <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Categoría</label>
                                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Precio Unit.</label>
                                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Stock Inicial</label>
                                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Stock Mínimo</label>
                                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" 
                                        value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-brand-900 text-white py-3 rounded-xl font-bold hover:bg-brand-800 transition-all">
                                    Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Adjustment Modal */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-brand-900">Ajustar Stock</h3>
                            <button onClick={() => setIsStockModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleStockUpdate} className="p-6 space-y-4">
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'add'})} 
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockAdjustment.type === 'add' ? 'bg-white shadow text-brand-900' : 'text-gray-500'}`}>
                                    <ArrowUp size={16} className="inline mr-1"/> Entrada
                                </button>
                                <button type="button" onClick={() => setStockAdjustment({...stockAdjustment, type: 'remove'})} 
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockAdjustment.type === 'remove' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
                                    <ArrowDown size={16} className="inline mr-1"/> Salida
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Cantidad</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    autoFocus
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none text-2xl font-bold text-center text-brand-900 bg-white" 
                                    value={stockAdjustment.amount} 
                                    onChange={e => setStockAdjustment({...stockAdjustment, amount: Number(e.target.value)})}
                                />
                            </div>
                            <button type="submit" className="w-full bg-brand-900 text-white py-3 rounded-xl font-bold hover:bg-brand-800 transition-all">
                                Confirmar Movimiento
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};