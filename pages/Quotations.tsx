import React, { useState, useRef, useEffect } from 'react';
import { FileText, Search, Plus, Trash2, X, Edit3, Save, Package, Download, RefreshCw, Share2, Copy, ExternalLink, Link as LinkIcon, DollarSign, Percent, Printer } from 'lucide-react';
import { Quote, QuoteItem, AppSettings, Client, InventoryItem, User } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Helper for currency
const formatCurrency = (amount: number, settings: AppSettings) => {
    const val = amount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const initialQuotes: Quote[] = [];

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836',
    pdfHeaderColor: '#162836',
    pdfSenderInfo: 'Bráma Studio\nCalle 27 de Mayo\nSanta Cruz',
    pdfFooterText: 'www.brama.com.bo',
    paymentInfo: '',
    termsAndConditions: '',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA',
    signatureName: 'Ariel Espinoza',
    signatureTitle: 'CEO'
};

export const Quotations = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const saved = localStorage.getItem('crm_active_user');
      return saved ? JSON.parse(saved) : null;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
      const saved = localStorage.getItem('crm_quotes');
      return saved ? JSON.parse(saved) : initialQuotes;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Quote | null>(null);
  const [shareQuote, setShareQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  // Data State
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [clientSearchMode, setClientSearchMode] = useState(true);
  const [newClientName, setNewClientName] = useState('');
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTab, setCatalogTab] = useState<'All' | 'Service' | 'Product'>('All');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');

  const [taxEnabled, setTaxEnabled] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const saveQuotes = async (newQuotes: Quote[]) => {
      setQuotes(newQuotes);
      localStorage.setItem('crm_quotes', JSON.stringify(newQuotes));
      try {
          await setDoc(doc(db, 'crm_data', 'quotes'), { list: newQuotes });
      } catch(e) {}
  };

  useEffect(() => {
      const fetchData = async () => {
          // Load Settings from LS first
          const savedSettings = localStorage.getItem('crm_settings');
          if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });

          // Attempt cloud sync for settings
          try {
              const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
              if (sDoc.exists()) {
                  const cloudSettings = { ...defaultSettings, ...sDoc.data() };
                  setSettings(cloudSettings);
                  localStorage.setItem('crm_settings', JSON.stringify(cloudSettings));
              }
          } catch(e) {}

          let localClients = localStorage.getItem('crm_clients');
          if (localClients) setAvailableClients(JSON.parse(localClients));
          else {
              setIsLoadingData(true);
              try {
                  const docSnap = await getDoc(doc(db, 'crm_data', 'clients'));
                  if (docSnap.exists()) {
                      const list = docSnap.data().list;
                      setAvailableClients(list);
                      localStorage.setItem('crm_clients', JSON.stringify(list));
                  }
              } catch(e) {}
          }

          let localInv = localStorage.getItem('crm_inventory');
          if (localInv) setAvailableInventory(JSON.parse(localInv));
          else {
              if(!isLoadingData) setIsLoadingData(true);
              try {
                  const docSnap = await getDoc(doc(db, 'crm_data', 'inventory'));
                  if (docSnap.exists()) {
                      const list = docSnap.data().list;
                      setAvailableInventory(list);
                      localStorage.setItem('crm_inventory', JSON.stringify(list));
                  }
              } catch(e) {}
          }

          try {
              const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
              if(docSnap.exists()) {
                  const cloudQuotes = docSnap.data().list;
                  setQuotes(cloudQuotes);
                  localStorage.setItem('crm_quotes', JSON.stringify(cloudQuotes));
              }
          } catch(e) {}
          
          setIsLoadingData(false);
      };
      fetchData();
  }, []);

  const [newQuote, setNewQuote] = useState<Partial<Quote>>({
      clientName: '',
      clientEmail: '', 
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0
  });

  useEffect(() => {
      const sub = newQuote.items?.reduce((acc, item) => acc + item.total, 0) || 0;
      const discountAmount = sub * ((newQuote.discount || 0) / 100);
      const taxableAmount = sub - discountAmount;
      const tax = taxEnabled ? taxableAmount * (settings.taxRate / 100) : 0;
      const total = taxableAmount + tax;
      setNewQuote(prev => ({ ...prev, subtotal: sub, tax, total }));
  }, [newQuote.items, taxEnabled, settings.taxRate, newQuote.discount]);

  const addManualItem = () => {
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
      };
      setNewQuote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const addItemFromCatalog = (item: InventoryItem, selectedPrice?: number) => {
      const priceToUse = selectedPrice !== undefined ? selectedPrice : item.price;
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: item.name,
          quantity: 1,
          unitPrice: priceToUse,
          total: priceToUse
      };
      setNewQuote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      setIsCatalogModalOpen(false);
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
      setNewQuote(prev => {
          const updatedItems = prev.items?.map(item => {
              if (item.id === id) {
                  const updated = { ...item, [field]: value };
                  if (field === 'quantity' || field === 'unitPrice') {
                      updated.total = Number(updated.quantity) * Number(updated.unitPrice);
                  }
                  return updated;
              }
              return item;
          }) || [];
          return { ...prev, items: updatedItems };
      });
  };

  const removeItem = (id: string) => {
      setNewQuote(prev => ({ ...prev, items: prev.items?.filter(item => item.id !== id) || [] }));
  };

  const openEdit = (quote: Quote) => {
      setViewingQuote(null);
      setNewQuote(quote);
      setTaxEnabled(!!quote.taxEnabled); 
      setEditingId(quote.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (currentUser?.role !== 'Admin') {
          alert('Acción denegada. Solo el administrador puede eliminar cotizaciones.');
          return;
      }
      if (confirm('¿Eliminar cotización permanentemente?')) {
          saveQuotes(quotes.filter(q => q.id !== id));
      }
  };

  const handleSelectClient = (client: Client) => {
      setNewQuote(prev => ({ 
          ...prev, 
          clientName: client.name,
          clientEmail: client.email || '' 
      }));
      setIsClientModalOpen(false);
  };
  
  const handleQuickCreateClient = () => {
      if(newClientName.trim()) {
          const client: Client = {
              id: Math.random().toString(36).substr(2,9),
              name: newClientName,
              company: 'Nuevo Cliente',
              email: '',
              phone: '',
              type: 'Prospect'
          };
          const updated = [...availableClients, client];
          setAvailableClients(updated);
          localStorage.setItem('crm_clients', JSON.stringify(updated));
          setDoc(doc(db, 'crm_data', 'clients'), { list: updated });
          handleSelectClient(client);
      }
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      const validItems = newQuote.items?.filter(i => i.description.trim() !== '' && i.total > 0) || [];
      
      if(validItems.length === 0) {
          alert("Debe agregar al menos un ítem con descripción y precio.");
          return;
      }

      const quoteData: Quote = {
          ...(newQuote as Quote),
          items: validItems,
          taxEnabled: taxEnabled
      };

      if (editingId) {
          saveQuotes(quotes.map(q => q.id === editingId ? { ...quoteData, id: editingId } : q));
      } else {
          const quoteId = `COT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`;
          saveQuotes([{ ...quoteData, id: quoteId }, ...quotes]);
      }
      setIsModalOpen(false);
  };

  // --- PDF & PRINT LOGIC ---
  const handleDownloadPDF = () => {
      if (printRef.current && pdfPreview) {
          html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save(`Cotizacion_${pdfPreview.id}.pdf`);
          });
      }
  };
  
  // Direct Print Logic
  const handleDirectPrint = () => {
      if (printRef.current) {
          html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              
              const pdfBlob = pdf.output('bloburl');
              window.open(pdfBlob, '_blank');
          });
      }
  };

  const openShareModal = (quote: Quote) => {
      setShareQuote(quote);
      setIsShareModalOpen(true);
  };

  const handleShareWhatsApp = () => {
      if (!shareQuote) return;
      const link = `https://brama.studio/q/${shareQuote.id.toLowerCase()}`;
      const text = `Hola ${shareQuote.clientName}, adjunto la Cotización *${shareQuote.id}*. Puedes verla y descargarla aquí: ${link}`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const handleCopyLink = () => {
      if (!shareQuote) return;
      const link = `https://brama.studio/q/${shareQuote.id.toLowerCase()}`;
      navigator.clipboard.writeText(link);
      alert('Enlace copiado al portapapeles');
  };

  const getClientDetails = (name: string) => {
      return availableClients.find(c => c.name === name);
  };

  const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category)))];

  const filteredCatalog = availableInventory.filter(item => {
      const matchesTab = catalogTab === 'All' ? true : item.type === catalogTab;
      const matchesCategory = catalogCategory === 'All' ? true : item.category === catalogCategory;
      const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                            item.sku.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesTab && matchesCategory && matchesSearch;
  });

  const filteredClients = availableClients.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()));

  return (
    <div className="space-y-6 relative h-full pb-safe-area">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Administra tus propuestas comerciales</p>
        </div>
        <button onClick={() => { setEditingId(null); setNewQuote({ clientName: '', date: new Date().toISOString().split('T')[0], validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Draft', items: [], subtotal: 0, discount: 0, tax: 0, total: 0 }); setTaxEnabled(false); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg active:scale-95 transition-transform">
            <Plus size={16} /> <span className="hidden sm:inline">Nueva Cotización</span>
        </button>
      </div>

      {/* Quote List: Table for Desktop, Cards for Mobile */}
      <div className="flex-1">
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setPdfPreview(quote); }}>
                        <td className="px-6 py-4 text-sm font-medium text-brand-900">{quote.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{quote.clientName}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(quote.total, settings)}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openShareModal(quote)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Compartir"><Share2 size={18}/></button>
                            <button onClick={() => { setPdfPreview(quote); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Ver/Imprimir"><Printer size={18} /></button>
                            <button onClick={() => openEdit(quote)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit3 size={18} /></button>
                            {currentUser?.role === 'Admin' && (
                                <button onClick={() => handleDelete(quote.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={18} /></button>
                            )}
                        </td>
                    </tr>
                    ))}
                    {quotes.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay cotizaciones</td></tr>}
                </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 pb-20">
              {quotes.map(quote => (
                  <div key={quote.id} onClick={() => setPdfPreview(quote)} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className="font-bold text-brand-900 text-sm">{quote.id}</h4>
                              <p className="text-sm text-gray-700 font-medium">{quote.clientName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{new Date(quote.date).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="font-bold text-lg text-gray-900">{formatCurrency(quote.total, settings)}</span>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => openShareModal(quote)} className="p-2 bg-green-50 text-green-600 rounded-lg"><Share2 size={16}/></button>
                              <button onClick={() => openEdit(quote)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={16}/></button>
                          </div>
                      </div>
                  </div>
              ))}
              {quotes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No hay cotizaciones.</div>}
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6 md:p-8 space-y-8">
                <form id="quote-form" onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex gap-2 relative">
                            <input required className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-500" placeholder="Cliente" value={newQuote.clientName} onChange={e => setNewQuote({...newQuote, clientName: e.target.value})} />
                            <button type="button" onClick={() => { setClientSearchMode(true); setIsClientModalOpen(true); }} className="px-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 border border-brand-900 shadow-md"><Search size={18}/></button>
                        </div>
                        <input type="date" className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none" value={newQuote.date} onChange={e => setNewQuote({...newQuote, date: e.target.value})} />
                        <input type="date" className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none" value={newQuote.validUntil} onChange={e => setNewQuote({...newQuote, validUntil: e.target.value})} />
                    </div>
                    
                    {/* Items Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700 text-sm">Ítems</h4>
                            <button type="button" onClick={() => setIsCatalogModalOpen(true)} className="text-sm bg-brand-50 text-brand-900 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 border border-brand-200 hover:bg-brand-100"><Package size={16}/> Catálogo</button>
                        </div>
                        <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-xs font-bold text-gray-500 uppercase">
                             <div className="col-span-5 md:col-span-6">Desc.</div>
                             <div className="col-span-2 text-center">Cant.</div>
                             <div className="col-span-3 md:col-span-3 text-right">P. Unit</div>
                             <div className="col-span-2 md:col-span-1"></div>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {newQuote.items?.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="col-span-5 md:col-span-6"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-gray-900 outline-none focus:border-brand-500 text-sm truncate" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                    <div className="col-span-2"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-center text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                    <div className="col-span-3 md:col-span-3"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-right text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                    <div className="col-span-2 md:col-span-1 text-right"><button type="button" onClick={() => removeItem(item.id)} className="p-1.5 hover:bg-red-100 rounded text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addManualItem} className="mt-3 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><Plus size={12}/> Agregar Fila Manual</button>
                    </div>

                    <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full md:w-1/2 ml-auto">
                        {/* Totals Section */}
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                            <span className="text-sm font-medium text-gray-600">Subtotal</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(newQuote.subtotal || 0, settings)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Descuento</span>
                                <div className="flex items-center bg-white px-2 py-0.5 rounded border border-gray-300">
                                    <input 
                                        type="number" 
                                        className="w-10 text-right text-xs outline-none font-bold text-gray-900 bg-white" 
                                        value={newQuote.discount || ''} 
                                        onChange={(e) => setNewQuote({...newQuote, discount: Number(e.target.value)})}
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-bold text-gray-500">%</span>
                                </div>
                            </div>
                            <span className="text-sm font-medium text-red-500">
                                - {formatCurrency((newQuote.subtotal || 0) * ((newQuote.discount || 0)/100), settings)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <button type="button" onClick={() => setTaxEnabled(!taxEnabled)} className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${taxEnabled ? 'bg-brand-900' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <span className="text-sm font-medium text-gray-600">{settings.taxName} ({settings.taxRate}%)</span>
                            </label>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(newQuote.tax || 0, settings)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-bold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-brand-900">{formatCurrency(newQuote.total || 0, settings)}</span>
                        </div>
                    </div>
                </form>
            </div>
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 bg-white font-medium">Cancelar</button>
                <button form="quote-form" type="submit" className="px-6 py-2 bg-brand-900 text-white rounded-xl hover:bg-brand-800 font-bold shadow-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && shareQuote && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200 mx-4">
                  <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-brand-900"/> Compartir Cotización</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 text-center">
                      <div className="w-12 h-12 bg-white rounded-full mx-auto mb-3 flex items-center justify-center shadow-sm text-brand-900 border border-gray-100">
                          <FileText size={24} />
                      </div>
                      <p className="font-bold text-gray-900">{shareQuote.id}</p>
                      <p className="text-sm text-gray-500 mb-3">{shareQuote.clientName}</p>
                      
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
                          <LinkIcon size={14} className="text-gray-400"/>
                          <input readOnly value={`brama.studio/q/${shareQuote.id.toLowerCase()}`} className="text-xs flex-1 bg-transparent outline-none text-gray-600 font-mono"/>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <button onClick={handleShareWhatsApp} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                          Enviar por WhatsApp
                      </button>
                      <button onClick={handleCopyLink} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                          <Copy size={18}/> Copiar Enlace
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PDF Generation View */}
      {pdfPreview && (
         <div className="fixed z-[100] inset-0 bg-black/80 flex items-center justify-center p-0 md:p-4">
             <div className="relative h-full flex flex-col items-center w-full">
                 <div className="mb-4 flex gap-4 mt-4 md:mt-0">
                     <button onClick={handleDownloadPDF} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors hidden md:flex"><Download size={18}/> Descargar PDF</button>
                     <button onClick={handleDirectPrint} className="bg-white px-4 py-2 rounded-lg font-bold text-brand-900 hover:bg-gray-100 flex items-center gap-2 shadow-lg"><Printer size={18}/> Imprimir</button>
                     <button onClick={() => setPdfPreview(null)} className="bg-red-500 px-4 py-2 rounded-lg font-bold text-white hover:bg-red-600 shadow-lg"><X size={18}/></button>
                 </div>
                 
                <div className="flex-1 overflow-y-auto w-full flex justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="scale-[0.5] origin-top md:scale-100 transition-transform">
                        <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans leading-normal shadow-2xl">
                            {/* PDF Content (Same as original) */}
                            <div className="p-10 flex justify-between items-center" style={{ backgroundColor: settings.pdfHeaderColor || settings.primaryColor || '#162836' }}>
                                <div className="flex items-center">
                                     {settings.logoUrl ? (
                                         <img src={settings.logoUrl} style={{ maxHeight: '80px', width: 'auto' }} alt="Logo" />
                                     ) : (
                                         <h1 className="text-4xl font-bold text-white tracking-widest uppercase">{settings.companyName}</h1>
                                     )}
                                </div>
                                <div className="text-right text-white">
                                    <h2 className="text-5xl font-bold tracking-tight mb-2 opacity-90 leading-none">COTIZACIÓN</h2>
                                    <div className="text-xs font-bold opacity-80 space-y-1 uppercase tracking-wide flex flex-col items-end">
                                        <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{pdfPreview.id.replace('COT-', '')}</span></div>
                                        <div className="flex justify-end gap-6"><span className="opacity-70 text-right w-24">EMISIÓN</span> <span className="w-32 whitespace-nowrap">{new Date(pdfPreview.date).toLocaleDateString()} {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}</span></div>
                                        <div className="flex justify-end gap-6"><span className="opacity-70 text-right w-24">VÁLIDO</span> <span className="w-32">{new Date(pdfPreview.validUntil).toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-12 pt-12">
                                <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                                    <div className="w-[45%]">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Cotizado a:</p>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{pdfPreview.clientName}</h3>
                                        {(() => {
                                            const client = getClientDetails(pdfPreview.clientName);
                                            return (
                                                <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                                                    {client?.company && <div className="font-medium text-gray-600">{client.company}</div>}
                                                    {client?.phone && <div>{client.phone}</div>}
                                                    {pdfPreview.clientEmail && <div>{pdfPreview.clientEmail}</div>}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="w-[45%] text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">De:</p>
                                        <div className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                            {settings.pdfSenderInfo || `${settings.companyName}\n${settings.address}\n${settings.phone}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-10">
                                    <div className="bg-gray-50 flex px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 rounded-md mb-2">
                                        <div className="flex-1">Descripción</div>
                                        <div className="w-20 text-center">Cant.</div>
                                        <div className="w-28 text-right">P. Unit</div>
                                        <div className="w-28 text-right">Total</div>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {pdfPreview.items.map((item, idx) => (
                                            <div key={idx} className="flex px-4 py-3 text-sm items-center">
                                                <div className="flex-1 font-medium text-gray-800 leading-snug">{item.description}</div>
                                                <div className="w-20 text-center text-gray-500">{item.quantity}</div>
                                                <div className="w-28 text-right text-gray-500">{formatCurrency(item.unitPrice, settings)}</div>
                                                <div className="w-28 text-right font-bold text-gray-900">{formatCurrency(item.total, settings)}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-200 mt-2"></div>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="w-[55%] pr-8">
                                        <div className="mb-6">
                                            <h4 className="font-bold text-gray-900 mb-3 text-[11px] uppercase tracking-wide">Métodos de Pago</h4>
                                            <div className="flex gap-5 items-start">
                                                {settings.qrCodeUrl && (
                                                    <div className="flex-shrink-0">
                                                        <img src={settings.qrCodeUrl} className="h-24 w-24 object-contain mix-blend-multiply" alt="QR" />
                                                    </div>
                                                )}
                                                <div className="flex-1 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                                    {settings.paymentInfo || 'Sin información bancaria configurada.'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">Términos y Condiciones</h4>
                                            <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                                                {settings.termsAndConditions || 'Sin términos definidos.'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-[40%] flex flex-col items-end">
                                        <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                                            <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(pdfPreview.subtotal, settings)}</span></div>
                                            {pdfPreview.discount > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>Descuento ({pdfPreview.discount}%)</span><span>-{formatCurrency(pdfPreview.subtotal * (pdfPreview.discount/100), settings)}</span></div>)}
                                            {pdfPreview.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(pdfPreview.tax, settings)}</span></div>)}
                                            <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(pdfPreview.total, settings)}</span></div>
                                        </div>

                                        <div className="text-center mt-4 w-full flex flex-col items-center">
                                            {settings.signatureUrl && (<img src={settings.signatureUrl} className="h-20 mb-[-15px] object-contain relative z-10" alt="Firma" />)}
                                            <div className="relative pt-2 px-8 border-t border-gray-400 min-w-[200px]">
                                                <p className="text-sm font-bold text-gray-900">{settings.signatureName}</p>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{settings.signatureTitle}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full">
                                <div className="bg-gray-100 text-center py-3 border-t border-gray-200">
                                    <p className="text-[10px] text-gray-500 tracking-wider font-medium uppercase">{settings.pdfFooterText || `${settings.website} • ${settings.address}`}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      )}
      
      {/* Restored Client Modal for Search in Edit */}
      {isClientModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md h-[450px] flex flex-col shadow-2xl relative overflow-hidden mx-4">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">{clientSearchMode ? 'Buscar Cliente' : 'Nuevo Cliente Rápido'}</h3>
                      <button onClick={() => setIsClientModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} className="text-gray-500"/></button>
                  </div>
                  
                  {clientSearchMode ? (
                      <div className="flex flex-col h-full">
                          <div className="p-4 border-b border-gray-100 flex gap-2">
                              <div className="relative flex-1">
                                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                  <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 text-gray-900 bg-white" onChange={(e) => setCatalogSearch(e.target.value)} />
                              </div>
                              <button onClick={() => setClientSearchMode(false)} className="px-3 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1"><Plus size={16}/> Nuevo</button>
                          </div>
                          <div className="p-4 flex-1 overflow-y-auto">
                              {isLoadingData && availableClients.length === 0 && (
                                   <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-brand-900" /></div>
                              )}
                              {filteredClients.map(c => (
                                  <div key={c.id} onClick={() => handleSelectClient(c)} className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded-lg">
                                      <span className="font-bold text-gray-900">{c.name}</span> <span className="text-xs text-gray-500 block">{c.company}</span>
                                  </div>
                              ))}
                              {!isLoadingData && availableClients.length === 0 && (
                                  <p className="text-center text-gray-400 py-8 text-sm">No se encontraron clientes.</p>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="p-6 flex flex-col h-full">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Cliente</label>
                          <input autoFocus type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-4 bg-white text-gray-900 outline-none focus:border-brand-500" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Juan Perez" />
                          <div className="mt-auto flex gap-3">
                              <button onClick={() => setClientSearchMode(true)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Cancelar</button>
                              <button onClick={handleQuickCreateClient} className="flex-1 py-2 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800">Crear y Usar</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Restored Catalog Modal */}
      {isCatalogModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl h-[700px] flex flex-col shadow-2xl animate-in zoom-in duration-200 mx-4">
                  <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">Catálogo</h3>
                      <button onClick={() => setIsCatalogModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20}/></button>
                  </div>
                  
                  <div className="p-5 bg-white border-b border-gray-100 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                          <div className="relative flex-1">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                              <input 
                                autoFocus 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-900 bg-white" 
                                value={catalogSearch} 
                                onChange={e => setCatalogSearch(e.target.value)}
                              />
                          </div>
                          <select 
                            className="w-full md:w-1/3 px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-700 bg-white"
                            value={catalogCategory}
                            onChange={(e) => setCatalogCategory(e.target.value)}
                          >
                              {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat === 'All' ? 'Todas las Categorías' : cat}</option>
                              ))}
                          </select>
                      </div>

                      <div className="flex p-1 bg-gray-100 rounded-xl">
                          <button onClick={() => setCatalogTab('All')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${catalogTab === 'All' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}>Todos</button>
                          <button onClick={() => setCatalogTab('Service')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${catalogTab === 'Service' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-blue-700'}`}>Servicios</button>
                          <button onClick={() => setCatalogTab('Product')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${catalogTab === 'Product' ? 'bg-white shadow text-orange-700' : 'text-gray-500 hover:text-orange-700'}`}>Productos</button>
                      </div>
                  </div>

                  <div className="p-5 flex-1 overflow-y-auto bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredCatalog.map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-brand-500 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="font-bold text-gray-900 text-base group-hover:text-brand-900 line-clamp-1">{item.name}</span>
                                      <span className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded text-sm">{formatCurrency(item.price, settings)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 h-8">{item.description || 'Sin descripción'}</p>
                                  
                                  {/* Pricing Tiers Selection */}
                                  <div className="mt-auto border-t border-gray-100 pt-2 space-y-1">
                                      <button onClick={() => addItemFromCatalog(item)} className="w-full text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 py-1.5 rounded flex justify-between px-2 font-medium">
                                          <span>Unitario</span> <span>{formatCurrency(item.price, settings)}</span>
                                      </button>
                                      {item.priceDozen && item.priceDozen > 0 && (
                                          <button onClick={() => addItemFromCatalog(item, item.priceDozen)} className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded flex justify-between px-2 font-medium">
                                              <span>Precio A</span> <span>{formatCurrency(item.priceDozen, settings)}</span>
                                          </button>
                                      )}
                                      {item.priceBox && item.priceBox > 0 && (
                                          <button onClick={() => addItemFromCatalog(item, item.priceBox)} className="w-full text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 py-1.5 rounded flex justify-between px-2 font-medium">
                                              <span>Precio B</span> <span>{formatCurrency(item.priceBox, settings)}</span>
                                          </button>
                                      )}
                                      {item.priceWholesale && item.priceWholesale > 0 && (
                                          <button onClick={() => addItemFromCatalog(item, item.priceWholesale)} className="w-full text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 rounded flex justify-between px-2 font-medium">
                                              <span>Precio C</span> <span>{formatCurrency(item.priceWholesale, settings)}</span>
                                          </button>
                                      )}
                                  </div>
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