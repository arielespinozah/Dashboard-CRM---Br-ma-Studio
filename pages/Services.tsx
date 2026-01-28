import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Edit3, Trash2, Tag, Copy, Share2, X, Save, Briefcase, Check, Grid, DollarSign, RefreshCw } from 'lucide-react';
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
  // Initialize from LocalStorage to prevent flash, but don't define hardcoded items that overwrite cloud
  const [items, setItems] = useState<InventoryItem[]>(() => {
      const saved = localStorage.getItem('crm_inventory');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
      const saved = localStorage.getItem('crm_categories');
      return saved ? JSON.parse(saved) : initialCategories;
  });

  // Check Permissions
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const u = localStorage.getItem('crm_active_user');
      return u ? JSON.parse(u) : null;
  });

  const canManage = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('manage_inventory');

  const [activeTab, setActiveTab] = useState<'Service' | 'Product'>('Service');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All'); // New Filter
  const [isLoaded, setIsLoaded] = useState(false); // CRITICAL: Guard to prevent overwriting cloud data on init
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
      name: '', description: '', price: 0, category: '', quantity: 0, priceDozen: 0, priceBox: 0, priceWholesale: 0
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  // 1. Load Initial Data (Cloud + Local)
  useEffect(() => {
      const loadData = async () => {
          try {
              // Categories
              const catSnap = await getDoc(doc(db, 'crm_data', 'categories'));
              if(catSnap.exists()) {
                  const list = catSnap.data().list;
                  setCategories(list);
                  localStorage.setItem('crm_categories', JSON.stringify(list));
              }

              // Items
              const itemSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
              if(itemSnap.exists()) {
                  const list = itemSnap.data().list;
                  setItems(list);
                  localStorage.setItem('crm_inventory', JSON.stringify(list));
              }
          } catch(e) {
              console.error("Error loading data", e);
          } finally {
              setIsLoaded(true); // Enable saving only after fetch is attempted
          }
      };
      loadData();
  }, []);

  // 2. Sync Categories to Cloud on Change (Guarded)
  useEffect(() => {
      if (!isLoaded) return; 
      localStorage.setItem('crm_categories', JSON.stringify(categories));
      const syncCategories = async () => {
          try {
              await setDoc(doc(db, 'crm_data', 'categories'), { list: categories });
          } catch(e) {}
      };
      syncCategories();
  }, [categories, isLoaded]);

  // 3. Sync Items to Cloud on Change (Guarded)
  useEffect(() => {
      if (!isLoaded) return;
      localStorage.setItem('crm_inventory', JSON.stringify(items));
      const syncToCloud = async () => {
         try {
             await setDoc(doc(db, 'crm_data', 'inventory'), { list: items });
         } catch(e) {}
      };
      syncToCloud();
  }, [items, isLoaded]);

  // --- Actions ---

  const handleEdit = (item: InventoryItem) => {
      setFormData(item);
      setEditingId(item.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(confirm('¿Eliminar ítem del catálogo?')) {
          setItems(prev => prev.filter(i => i.id !== id));
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

  const handleDeleteCategory = (id: string) => {
      if(confirm('¿Eliminar categoría?')) {
          setCategories(prev => prev.filter(c => c.id !== id));
      }
  };

  // --- Sharing Logic ---

  const formatShareText = (item: InventoryItem) => {
      let prices = `💰 *Precio Unitario:* Bs. ${item.price}\n`;
      if(item.priceDozen) prices += `📦 *Precio A:* Bs. ${item.priceDozen} c/u\n`;
      if(item.priceBox) prices += `📦 *Precio B:* Bs. ${item.priceBox} c/u\n`;
      if(item.priceWholesale) prices += `🏭 *Precio C:* Bs. ${item.priceWholesale} c/u\n`;

      return `✨ *${item.name}* ✨\n\n📝 ${item.description || 'Sin descripción'}\n\n🏷️ *Categoría:* ${item.category}\n${prices}\n${item.type === 'Product' ? `📦 *Stock:* ${item.quantity} u.\n` : ''}\n📍 *Bráma Studio* - Soluciones Creativas\n📞 Contáctanos para más detalles.`;
  };

  const handleCopy = (item: InventoryItem) => {
      const text = formatShareText(item);
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (item: InventoryItem) => {
      const text = formatShareText(item);
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  // Filter Logic with Categories
  const filteredItems = items.filter(i => {
      const matchesType = i.type === activeTab;
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            i.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
      
      return matchesType && matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo</h1>
          <p className="text-sm text-gray-500">Administra y comparte tus servicios y productos</p>
        </div>
        <div className="flex gap-2">
            {!isLoaded && <span className="text-xs text-brand-900 flex items-center gap-1"><RefreshCw className="animate-spin" size={12}/> Sincronizando...</span>}
            <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
            <Grid size={16} />
            Categorías
            </button>
            {canManage && (
                <button 
                onClick={openNew}
                disabled={!isLoaded}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Plus size={16} />
                Nuevo {activeTab === 'Service' ? 'Servicio' : 'Producto'}
                </button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
          <button 
            onClick={() => { setActiveTab('Service'); setSelectedCategory('All'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'Service' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
             <Briefcase size={18} /> Servicios
          </button>
          <button 
            onClick={() => { setActiveTab('Product'); setSelectedCategory('All'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'Product' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
             <Package size={18} /> Productos
          </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar ${activeTab === 'Service' ? 'servicios' : 'productos'}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:border-brand-500 outline-none"
          >
              <option value="All">Todas las Categorías</option>
              {categories.filter(c => c.type === activeTab).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
              ))}
          </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {filteredItems.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded-lg tracking-wide border border-gray-200">
                          {item.category}
                      </span>
                      {canManage && (
                          <div className="flex gap-1">
                              <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit3 size={16} />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-xl mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed flex-grow line-clamp-3">{item.description}</p>
                  
                  {/* Prices Display */}
                  <div className="flex flex-wrap gap-2 mb-4">
                      <div className="px-2 py-1 bg-brand-50 border border-brand-100 rounded text-xs font-bold text-brand-900">
                          Unit: Bs. {item.price}
                      </div>
                      {item.priceDozen && item.priceDozen > 0 && (
                          <div className="px-2 py-1 bg-blue-50 border border-blue-100 rounded text-xs font-bold text-blue-700">
                              Precio A: Bs. {item.priceDozen}
                          </div>
                      )}
                      {item.priceBox && item.priceBox > 0 && (
                          <div className="px-2 py-1 bg-orange-50 border border-orange-100 rounded text-xs font-bold text-orange-700">
                              Precio B: Bs. {item.priceBox}
                          </div>
                      )}
                      {item.priceWholesale && item.priceWholesale > 0 && (
                          <div className="px-2 py-1 bg-purple-50 border border-purple-100 rounded text-xs font-bold text-purple-700">
                              Precio C: Bs. {item.priceWholesale}
                          </div>
                      )}
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-end justify-between pt-4 border-t border-gray-50">
                        {item.type === 'Product' && (
                            <div className="">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Stock</p>
                                <p className={`font-semibold ${item.quantity < 5 ? 'text-red-500' : 'text-gray-700'}`}>
                                    {item.quantity} u.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleCopy(item)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            {copiedId === item.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                            {copiedId === item.id ? 'Copiado' : 'Copiar'}
                        </button>
                        <button 
                            onClick={() => handleWhatsAppShare(item)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-50 text-green-700 border border-green-100 text-sm font-medium hover:bg-green-100 transition-colors"
                        >
                            <Share2 size={16} />
                            Enviar
                        </button>
                    </div>
                  </div>
              </div>
          ))}
      </div>

      {/* ... [Modals remain unchanged] ... */}
      {/* Item Modal */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-gray-900">
                  {editingId ? 'Editar Ítem' : `Nuevo ${activeTab === 'Service' ? 'Servicio' : 'Producto'}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select 
                        required 
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                          <option value="" disabled>Seleccionar...</option>
                          {categories.filter(c => c.type === activeTab).map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                   </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900 resize-none h-20" 
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>
               
               {/* Pricing Section */}
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><DollarSign size={14}/> Precios Escalonados</h4>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Precio Unitario</label>
                          <input required type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                              value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Precio A</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                              value={formData.priceDozen || ''} onChange={e => setFormData({...formData, priceDozen: Number(e.target.value)})} placeholder="Opcional" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Precio B</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                              value={formData.priceBox || ''} onChange={e => setFormData({...formData, priceBox: Number(e.target.value)})} placeholder="Opcional" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Precio C</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                              value={formData.priceWholesale || ''} onChange={e => setFormData({...formData, priceWholesale: Number(e.target.value)})} placeholder="Opcional" />
                       </div>
                   </div>
               </div>

               {activeTab === 'Product' && (
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                      <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                          value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                   </div>
               )}
               <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors bg-white">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-lg text-gray-900">Gestionar Categorías</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            placeholder={`Nueva categoría de ${activeTab === 'Service' ? 'Servicios' : 'Productos'}`}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700">
                            <Plus size={20} />
                        </button>
                    </form>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {categories.filter(c => c.type === activeTab).map(c => (
                            <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="font-medium text-gray-700">{c.name}</span>
                                <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {categories.filter(c => c.type === activeTab).length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">No hay categorías creadas.</p>
                        )}
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};