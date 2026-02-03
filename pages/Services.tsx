import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Edit3, Trash2, Tag, Copy, Share2, X, Save, Briefcase, Check, Grid, DollarSign, RefreshCw, Layers, ChevronRight, List as ListIcon, LayoutGrid, MoreHorizontal, AlertCircle, ArrowLeft, ChevronDown } from 'lucide-react';
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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); 
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
      name: '', description: '', price: 0, category: '', quantity: 0, priceDozen: 0, priceBox: 0, priceWholesale: 0, sku: ''
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  // 1. Sync
  useEffect(() => {
      const loadData = async () => {
          try {
              const catSnap = await getDoc(doc(db, 'crm_data', 'categories'));
              if(catSnap.exists()) {
                  const list = (catSnap.data() as any).list;
                  setCategories(list);
                  localStorage.setItem('crm_categories', JSON.stringify(list));
              }
              const itemSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
              if(itemSnap.exists()) {
                  const list = (itemSnap.data() as any).list;
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
  const checkSkuDuplicate = (sku: string, currentId: string | null) => {
      return items.some(i => i.sku.toLowerCase() === sku.toLowerCase() && i.id !== currentId);
  };

  const handleEdit = (item: InventoryItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setFormData(JSON.parse(JSON.stringify(item)));
      setEditingId(item.id);
      setIsModalOpen(true);
      setSelectedItem(null); 
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if(confirm('¿Eliminar ítem permanentemente?')) {
          setItems(prev => prev.filter(i => i.id !== id));
          if(selectedItem?.id === id) setSelectedItem(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const qty = Number(formData.quantity) || 0;
      const price = Number(formData.price) || 0;

      if (price < 0) { alert("El precio no puede ser negativo."); return; }
      if (!formData.name) { alert("El nombre es requerido"); return; }
      
      let finalSku = formData.sku;
      if (!finalSku) {
          const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
          const timestampSuffix = Date.now().toString().slice(-4);
          finalSku = `${activeTab.substring(0,3).toUpperCase()}-${randomSuffix}${timestampSuffix}`;
      }

      if (checkSkuDuplicate(finalSku, editingId)) {
          alert(`Error: SKU "${finalSku}" ya existe.`);
          return;
      }
      
      if (editingId) {
          setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...formData, sku: finalSku!, quantity: qty, stock: qty, price } as InventoryItem : i));
      } else {
          setItems(prev => [...prev, { 
              id: Math.random().toString(36).substr(2, 9),
              type: activeTab,
              sku: finalSku!,
              minStock: 5,
              status: 'In Stock',
              lastUpdated: new Date().toISOString(),
              ...formData,
              quantity: qty,
              stock: qty,
              price
          } as InventoryItem]);
      }
      setIsModalOpen(false);
  };

  const openNew = () => {
      const availableCategories = categories.filter(c => c.type === activeTab);
      if (availableCategories.length === 0) {
          alert(`Crea una categoría primero.`);
          setIsCategoryModalOpen(true);
          return;
      }

      setEditingId(null);
      setFormData({ 
          name: '', description: '', price: 0, category: availableCategories[0]?.name || '', quantity: 0, priceDozen: 0, priceBox: 0, priceWholesale: 0, sku: ''
      });
      setIsModalOpen(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (newCategoryName.trim()) {
          const newCat: Category = { 
              id: Math.random().toString(36).substr(2, 5), 
              name: newCategoryName.trim(), 
              type: activeTab 
          };
          setCategories(prev => [...prev, newCat]);
          setNewCategoryName('');
      }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
      const isUsed = items.some(i => i.category === categoryName && i.type === activeTab);
      if (isUsed) { alert(`Categoría en uso.`); return; }
      if (confirm(`¿Eliminar "${categoryName}"?`)) {
          setCategories(prev => prev.filter(c => c.id !== categoryId));
      }
  };

  const formatShareText = (item: InventoryItem) => {
      const lines = [
          `✨ *${item.name}* ✨`,
          item.description || '',
          '',
          `💰 *Precio:* Bs. ${item.price}`,
      ];
      if(item.priceDozen) lines.push(`📦 *x12:* Bs. ${item.priceDozen} c/u`);
      lines.push('');
      lines.push('📍 *Bráma Studio*');
      return lines.join('\n');
  };

  const handleCopy = (item: InventoryItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      navigator.clipboard.writeText(formatShareText(item));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (item: InventoryItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formatShareText(item))}`;
      window.open(url, '_blank');
  };

  const filteredItems = items.filter(i => {
      const matchesType = i.type === activeTab;
      const categoryName = i.category || '';
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || categoryName === selectedCategory;
      return matchesType && matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-3 md:space-y-6 h-full flex flex-col relative pb-safe-area bg-[#f4f6f7]">
       {/* Header */}
       <div className="flex flex-row md:flex-row justify-between items-center gap-3 bg-white p-3 md:p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Catálogo</h1>
          <p className="text-xs md:text-sm text-gray-500">Productos y servicios</p>
        </div>
        <div className="flex items-center gap-2">
            {!isLoaded && <RefreshCw className="animate-spin text-brand-900" size={16}/>}
            
            <button onClick={() => setIsCategoryModalOpen(true)} className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
                <Grid size={20} />
            </button>
            {canManage && (
                <button onClick={openNew} disabled={!isLoaded} className="flex items-center gap-2 px-4 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    <Plus size={20} /> <span className="hidden xs:inline">Nuevo</span>
                </button>
            )}
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-20 md:static">
          <div className="flex p-1 bg-gray-100 rounded-lg">
              <button onClick={() => { setActiveTab('Service'); setSelectedCategory('All'); }} className={`flex-1 px-2 py-2 rounded-md text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'Service' ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500'}`}>
                  <Briefcase size={14}/> Servicios
              </button>
              <button onClick={() => { setActiveTab('Product'); setSelectedCategory('All'); }} className={`flex-1 px-2 py-2 rounded-md text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'Product' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
                  <Package size={14}/> Productos
              </button>
          </div>
          
          <div className="flex gap-2">
              <div className="relative w-1/3 md:w-auto min-w-[100px]">
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full appearance-none pl-3 pr-6 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-700 bg-gray-50 truncate">
                      <option value="All">Todas</option>
                      {categories.filter(c => c.type === activeTab).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14}/>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-900 rounded-xl text-xs md:text-sm outline-none transition-all"/>
              </div>
          </div>
      </div>

      {/* GRID CONTENT */}
      <div className="flex-1 overflow-y-auto pb-20 min-h-0 px-0.5">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6 pb-4">
              {filteredItems.map(item => (
                  <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white rounded-xl p-3 md:p-5 border border-gray-200 shadow-sm active:scale-[0.98] transition-transform cursor-pointer flex flex-col h-full relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">{item.category}</span>
                          {/* Desktop Actions */}
                          {canManage && (
                              <div className="hidden md:flex gap-1">
                                  <button onClick={(e) => handleEdit(item, e)} className="p-1 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded"><Edit3 size={12}/></button>
                              </div>
                          )}
                      </div>
                      
                      <div className="flex-1 mb-2">
                          <h3 className="font-bold text-gray-900 text-xs md:text-lg leading-tight mb-1 line-clamp-2">{item.name}</h3>
                          <p className="text-[9px] text-gray-400 font-mono truncate">{item.sku}</p>
                          {/* Descripcion oculta en movil */}
                          {item.description && <p className="hidden md:block text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>}
                      </div>

                      <div className="pt-2 border-t border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-1">
                          <p className="text-sm md:text-lg font-bold text-brand-900">Bs. {item.price}</p>
                          <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                              {activeTab === 'Product' && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.quantity <= (item.minStock || 5) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                      Stock: {item.quantity}
                                  </span>
                              )}
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={(e) => handleWhatsAppShare(item, e)} className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Share2 size={12} className="md:w-4 md:h-4"/></button>
                                  <button onClick={(e) => handleCopy(item, e)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg"><Copy size={12} className="md:w-4 md:h-4"/></button>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              {filteredItems.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 text-xs">No se encontraron registros.</div>}
          </div>
      </div>

      {/* DETAILS DRAWER */}
      {selectedItem && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="w-full md:w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-start pt-safe-top">
                      <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">{selectedItem.type === 'Service' ? 'Servicio' : 'Producto'}</span>
                          <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedItem.name}</h2>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block bg-brand-50 text-brand-900 px-2 py-0.5 rounded text-[10px] font-bold">{selectedItem.category}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{selectedItem.sku}</span>
                          </div>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-5 flex-1 overflow-y-auto space-y-6">
                      {selectedItem.description && (
                          <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Descripción</h3>
                              <p className="text-sm text-gray-600 leading-relaxed">{selectedItem.description}</p>
                          </div>
                      )}

                      <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">Precios</h3>
                          <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-xs font-medium text-gray-700">Unitario</span>
                                  <span className="font-bold text-brand-900">Bs. {selectedItem.price}</span>
                              </div>
                              {selectedItem.priceDozen && selectedItem.priceDozen > 0 && (
                                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <span className="text-xs font-medium text-blue-800">Precio A</span>
                                      <span className="font-bold text-blue-900">Bs. {selectedItem.priceDozen}</span>
                                  </div>
                              )}
                              {selectedItem.priceBox && selectedItem.priceBox > 0 && (
                                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                      <span className="text-xs font-medium text-orange-800">Precio B</span>
                                      <span className="font-bold text-orange-900">Bs. {selectedItem.priceBox}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {selectedItem.type === 'Product' && (
                          <div className="p-4 bg-gray-50 rounded-xl text-center">
                              <p className="text-xs text-gray-500 mb-1">Stock Disponible</p>
                              <p className={`text-2xl font-black ${selectedItem.quantity < 5 ? 'text-red-500' : 'text-gray-900'}`}>{selectedItem.quantity}</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white grid grid-cols-2 gap-3 pb-safe-area">
                      <button onClick={() => handleWhatsAppShare(selectedItem)} className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 min-h-[48px]">
                          <Share2 size={18}/> Compartir
                      </button>
                      <button onClick={() => handleEdit(selectedItem)} className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl min-h-[48px]">
                          <Edit3 size={18}/> Editar
                      </button>
                  </div>
             </div>
          </div>
      )}

      {/* Item Modal */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl md:max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 pt-safe-top">
              <h3 className="font-semibold text-lg text-gray-900">{editingId ? 'Editar' : 'Nuevo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 p-2 rounded-full"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label><input required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none bg-white text-gray-900 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                      <div className="relative">
                          <select required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none bg-white text-gray-900 appearance-none text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                              {categories.filter(c => c.type === activeTab).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={16}/>
                      </div>
                   </div>
               </div>
               <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU</label><input className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none bg-white text-gray-900 text-sm" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Opcional" /></div>
               <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label><textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none bg-white text-gray-900 h-24 resize-none text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Precios</h4>
                   <div className="grid grid-cols-2 gap-3">
                       <div><label className="block text-[10px] font-bold uppercase mb-1">Unitario</label><input required type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} /></div>
                       <div><label className="block text-[10px] font-bold uppercase mb-1">Mayorista</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={formData.priceDozen || ''} onChange={e => setFormData({...formData, priceDozen: Number(e.target.value)})} placeholder="0" /></div>
                   </div>
               </div>
               {activeTab === 'Product' && (
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Inicial</label><input type="number" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} /></div>
               )}
            </form>
            <div className="p-4 border-t border-gray-200 bg-white pb-safe-area flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-sm">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-brand-900 text-white rounded-xl font-bold text-sm shadow-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:rounded-2xl md:max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 pt-safe-top">
                    <h3 className="font-bold text-lg text-gray-900">Categorías</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 p-2 rounded-full"><X size={24} /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                        <input type="text" placeholder={`Nueva categoría...`} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none bg-white text-gray-900 text-sm" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}/>
                        <button type="submit" className="px-4 py-2 bg-brand-900 text-white rounded-xl font-medium shadow-md"><Plus size={24} /></button>
                    </form>
                    <div className="space-y-2 pb-20">
                        {categories.filter(c => c.type === activeTab).map(c => (
                            <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-700 text-sm">{c.name}</span>
                                <button onClick={() => handleDeleteCategory(c.id, c.name)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
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