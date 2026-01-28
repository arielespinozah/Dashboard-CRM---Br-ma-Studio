import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Edit3, Trash2, Tag, Copy, Share2, X, Save, Briefcase, Check, Grid, DollarSign, RefreshCw, Layers, ChevronRight, List } from 'lucide-react';
import { Category, InventoryItem, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const initialCategories: Category[] = [
    { id: 'c1', name: 'Diseño', type: 'Service' },
    { id: 'c2', name: 'Soporte', type: 'Service' },
    { id: 'c3', name: 'Desarrollo', type: 'Service' },
    { id: 'c4', name: 'Insumos', type: 'Product' },
    { id: 'c5', name: 'Equipos', type: 'Product' },
];

export const Services = () => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
      const saved = localStorage.getItem('crm_inventory');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
      const saved = localStorage.getItem('crm_categories');
      return saved ? JSON.parse(saved) : initialCategories;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const u = localStorage.getItem('crm_active_user');
      return u ? JSON.parse(u) : null;
  });

  const canManage = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('manage_inventory');

  const [activeTab, setActiveTab] = useState<'Service' | 'Product'>('Service');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); // For Drawer
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
      name: '', description: '', price: 0, category: '', quantity: 0, priceDozen: 0, priceBox: 0, priceWholesale: 0
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  // 1. Sync
  useEffect(() => {
      const loadData = async () => {
          try {
              const catSnap = await getDoc(doc(db, 'crm_data', 'categories'));
              if(catSnap.exists()) {
                  const list = catSnap.data().list;
                  setCategories(list);
                  localStorage.setItem('crm_categories', JSON.stringify(list));
              }
              const itemSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
              if(itemSnap.exists()) {
                  const list = itemSnap.data().list;
                  setItems(list);
                  localStorage.setItem('crm_inventory', JSON.stringify(list));
              }
          } catch(e) {} 
          finally { setIsLoaded(true); }
      };
      loadData();
  }, []);

  useEffect(() => {
      if (!isLoaded) return; 
      localStorage.setItem('crm_categories', JSON.stringify(categories));
      setDoc(doc(db, 'crm_data', 'categories'), { list: categories }).catch(()=>{});
  }, [categories, isLoaded]);

  useEffect(() => {
      if (!isLoaded) return;
      localStorage.setItem('crm_inventory', JSON.stringify(items));
      setDoc(doc(db, 'crm_data', 'inventory'), { list: items }).catch(()=>{});
  }, [items, isLoaded]);

  // --- Logic ---
  const handleEdit = (item: InventoryItem) => {
      setFormData(JSON.parse(JSON.stringify(item)));
      setEditingId(item.id);
      setIsModalOpen(true);
      setSelectedItem(null); // Close drawer to edit
  };

  const handleDelete = (id: string) => {
      if(confirm('¿Eliminar ítem del catálogo?')) {
          setItems(prev => prev.filter(i => i.id !== id));
          if(selectedItem?.id === id) setSelectedItem(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const qty = Number(formData.quantity) || 0;
      
      if (editingId) {
          setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...formData, quantity: qty, stock: qty } as InventoryItem : i));
      } else {
          setItems(prev => [...prev, { 
              id: Math.random().toString(36).substr(2, 9),
              type: activeTab,
              sku: `${activeTab.substring(0,3).toUpperCase()}-${Math.floor(Math.random()*1000)}`,
              minStock: 5,
              status: 'In Stock',
              lastUpdated: new Date().toISOString(),
              ...formData,
              quantity: qty,
              stock: qty
          } as InventoryItem]);
      }
      setIsModalOpen(false);
  };

  const openNew = () => {
      setEditingId(null);
      setFormData({ name: '', description: '', price: 0, category: categories.find(c => c.type === activeTab)?.name || '', quantity: 0, priceDozen: 0, priceBox: 0, priceWholesale: 0 });
      setIsModalOpen(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (newCategoryName.trim()) {
          const newCat: Category = { 
              id: Math.random().toString(36).substr(2, 5), 
              name: newCategoryName, 
              type: activeTab 
          };
          setCategories(prev => [...prev, newCat]);
          setNewCategoryName('');
      }
  };

  const formatShareText = (item: InventoryItem) => {
      const lines = [
          `✨ *${item.name}* ✨`,
          '',
          item.description || 'Sin descripción',
          '',
          `🏷️ *Categoría:* ${item.category}`,
          `💰 *Precio Unitario:* Bs. ${item.price}`,
      ];
      if(item.priceDozen) lines.push(`📦 *Precio A:* Bs. ${item.priceDozen} c/u`);
      if(item.priceBox) lines.push(`📦 *Precio B:* Bs. ${item.priceBox} c/u`);
      if(item.priceWholesale) lines.push(`🏭 *Precio C:* Bs. ${item.priceWholesale} c/u`);
      
      if(item.type === 'Product') lines.push(`📦 *Stock:* ${item.quantity} u.`);

      lines.push('');
      lines.push('📍 *Bráma Studio* - Soluciones Creativas');
      return lines.join('\n');
  };

  const handleCopy = (item: InventoryItem) => {
      const text = formatShareText(item);
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (item: InventoryItem) => {
      const text = formatShareText(item);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const filteredItems = items.filter(i => {
      const matchesType = i.type === activeTab;
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            i.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
      return matchesType && matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 h-full flex flex-col relative">
       {/* Header */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo</h1>
          <p className="text-sm text-gray-500">Administra y comparte tus servicios y productos</p>
        </div>
        <div className="flex gap-2">
            {!isLoaded && <span className="text-xs text-brand-900 flex items-center gap-1"><RefreshCw className="animate-spin" size={12}/> Sync</span>}
            <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Grid size={16} /> Categorías
            </button>
            {canManage && (
                <button onClick={openNew} disabled={!isLoaded} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95 disabled:opacity-50">
                    <Plus size={16} /> Nuevo
                </button>
            )}
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
              <button onClick={() => { setActiveTab('Service'); setSelectedCategory('All'); }} className={`flex-1 md:flex-none px-6 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Service' ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Briefcase size={16}/> Servicios
              </button>
              <button onClick={() => { setActiveTab('Product'); setSelectedCategory('All'); }} className={`flex-1 md:flex-none px-6 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Product' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-orange-600'}`}>
                  <Package size={16}/> Productos
              </button>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-200 rounded-lg text-sm outline-none transition-all text-gray-700">
                  <option value="All">Todas</option>
                  {categories.filter(c => c.type === activeTab).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-200 rounded-lg text-sm outline-none transition-all"/>
              </div>
          </div>
      </div>

      {/* COMPACT LIST VIEW */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
          <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Categoría</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Precio Unit.</th>
                      {activeTab === 'Product' && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Stock</th>}
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {filteredItems.map(item => (
                      <tr key={item.id} onClick={() => setSelectedItem(item)} className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-brand-50/30' : ''}`}>
                          <td className="px-6 py-4">
                              <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                              {item.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>}
                          </td>
                          <td className="px-6 py-4">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.category}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                              <span className="font-mono font-bold text-brand-900 text-sm">Bs. {item.price}</span>
                          </td>
                          {activeTab === 'Product' && (
                              <td className="px-6 py-4 text-center">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.quantity <= (item.minStock || 5) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                      {item.quantity} u.
                                  </span>
                              </td>
                          )}
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                  <button onClick={() => handleWhatsAppShare(item)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Compartir"><Share2 size={16}/></button>
                                  <button onClick={() => handleCopy(item)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors" title="Copiar">{copiedId === item.id ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}</button>
                                  {canManage && (
                                      <>
                                          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit3 size={16}/></button>
                                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 size={16}/></button>
                                      </>
                                  )}
                                  <button onClick={() => setSelectedItem(item)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"><ChevronRight size={16}/></button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredItems.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No se encontraron ítems.</td></tr>}
              </tbody>
          </table>
      </div>

      {/* DETAILS DRAWER */}
      {selectedItem && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-40 border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                  <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">{selectedItem.type === 'Service' ? 'Servicio' : 'Producto'}</span>
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedItem.name}</h2>
                      <span className="inline-block mt-2 bg-brand-100 text-brand-900 px-2 py-0.5 rounded text-xs font-bold">{selectedItem.category}</span>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Descripción</h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedItem.description || 'Sin descripción detallada.'}</p>
                  </div>

                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">Tabla de Precios</h3>
                      <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="text-sm font-medium text-gray-700">Unitario</span>
                              <span className="font-bold text-brand-900">Bs. {selectedItem.price}</span>
                          </div>
                          {selectedItem.priceDozen && selectedItem.priceDozen > 0 && (
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <span className="text-sm font-medium text-blue-800">Precio A</span>
                                  <span className="font-bold text-blue-900">Bs. {selectedItem.priceDozen}</span>
                              </div>
                          )}
                          {selectedItem.priceBox && selectedItem.priceBox > 0 && (
                              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                  <span className="text-sm font-medium text-orange-800">Precio B</span>
                                  <span className="font-bold text-orange-900">Bs. {selectedItem.priceBox}</span>
                              </div>
                          )}
                          {selectedItem.priceWholesale && selectedItem.priceWholesale > 0 && (
                              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                                  <span className="text-sm font-medium text-purple-800">Precio C</span>
                                  <span className="font-bold text-purple-900">Bs. {selectedItem.priceWholesale}</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {selectedItem.type === 'Product' && (
                      <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">Inventario</h3>
                          <div className="flex items-center gap-4">
                              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100 flex-1">
                                  <p className="text-xs text-gray-500">Stock Actual</p>
                                  <p className={`text-xl font-bold ${selectedItem.quantity < 5 ? 'text-red-500' : 'text-gray-900'}`}>{selectedItem.quantity}</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100 flex-1">
                                  <p className="text-xs text-gray-500">Mínimo</p>
                                  <p className="text-xl font-bold text-gray-700">{selectedItem.minStock || 5}</p>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50 grid grid-cols-2 gap-3">
                  <button onClick={() => handleWhatsAppShare(selectedItem)} className="flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-200">
                      <Share2 size={18}/> Compartir
                  </button>
                  <button onClick={() => handleEdit(selectedItem)} className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors">
                      <Edit3 size={18}/> Editar
                  </button>
              </div>
          </div>
      )}

      {/* Item Modal (Same as before) */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-gray-900">{editingId ? 'Editar Ítem' : `Nuevo ${activeTab === 'Service' ? 'Servicio' : 'Producto'}`}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               {/* Form Fields ... (Kept same logic as before) */}
               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select required className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option value="" disabled>Seleccionar...</option>
                          {categories.filter(c => c.type === activeTab).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                   </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900 resize-none h-20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>
               
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><DollarSign size={14}/> Precios Escalonados</h4>
                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-xs font-bold text-gray-700 mb-1">Precio Unitario</label><input required type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} /></div>
                       <div><label className="block text-xs font-bold text-gray-700 mb-1">Precio A</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900" value={formData.priceDozen || ''} onChange={e => setFormData({...formData, priceDozen: Number(e.target.value)})} placeholder="Opcional" /></div>
                       <div><label className="block text-xs font-bold text-gray-700 mb-1">Precio B</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900" value={formData.priceBox || ''} onChange={e => setFormData({...formData, priceBox: Number(e.target.value)})} placeholder="Opcional" /></div>
                       <div><label className="block text-xs font-bold text-gray-700 mb-1">Precio C</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900" value={formData.priceWholesale || ''} onChange={e => setFormData({...formData, priceWholesale: Number(e.target.value)})} placeholder="Opcional" /></div>
                   </div>
               </div>

               {activeTab === 'Product' && (
                   <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} /></div>
               )}

               <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors bg-white">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal (Same) */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-lg text-gray-900">Gestionar Categorías</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                        <input type="text" placeholder={`Nueva categoría...`} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl outline-none bg-white text-gray-900" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}/>
                        <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium"><Plus size={20} /></button>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {categories.filter(c => c.type === activeTab).map(c => (
                            <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="font-medium text-gray-700">{c.name}</span>
                                <button onClick={() => setCategories(prev => prev.filter(cat => cat.id !== c.id))} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};