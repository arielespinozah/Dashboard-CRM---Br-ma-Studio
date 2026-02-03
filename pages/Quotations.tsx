
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, Edit3, Package, Download, Share2, Copy, Calendar as CalendarIcon, Check, Eye, ShoppingCart, X, RefreshCw, FileText, ChevronRight, ChevronDown, Printer } from 'lucide-react';
import { Quote, QuoteItem, AppSettings, Client, InventoryItem, User as UserType, AuditLog, Sale } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db, auth } from '../firebase'; 
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'; 
import { signInAnonymously } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../components/ConfirmationModal';

// --- HELPER FUNCTIONS ---

const ensureAuth = async () => {
    if (auth.currentUser) return auth.currentUser;
    try {
        const { user } = await signInAnonymously(auth);
        return user;
    } catch (e) {
        console.error("Auth Error", e);
        throw e;
    }
};

const deepSanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitize);
    const newObj: any = {};
    for (const key in obj) {
        const val = obj[key];
        if (val !== undefined) {
            newObj[key] = deepSanitize(val);
        }
    }
    return newObj;
};

const formatCurrency = (amount: number, settings: AppSettings) => {
    const safeAmount = Number(amount) || 0;
    const val = safeAmount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const getCategoryColor = (category: string) => {
    const colors = [
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-orange-100 text-orange-800 border-orange-200',
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    let hash = 0;
    const cat = category || 'General';
    for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// --- COMPONENT: TOGGLE SWITCH ---
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <div onClick={() => onChange(!checked)} className="flex items-center justify-between cursor-pointer group select-none py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors">
        <span className={`text-sm font-medium transition-colors ${checked ? 'text-brand-900' : 'text-gray-600'}`}>{label}</span>
        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ease-in-out relative ml-2 ${checked ? 'bg-brand-900' : 'bg-gray-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </div>
);

const initialQuotes: Quote[] = [];

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836',
    pdfHeaderColor: '#162836',
    pdfSenderInfo: 'Bráma Studio\nSanta Cruz',
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
    signatureTitle: 'CEO',
    customQuotationLabel: 'FACTURADO'
};

const logAuditAction = (action: 'Delete' | 'Update' | 'Create', description: string, user: UserType, metadata?: string) => {
    const log: AuditLog = {
        id: Date.now().toString(),
        action,
        module: 'Quotes',
        description,
        user: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        metadata: metadata || null 
    };
    
    const savedLogs = localStorage.getItem('crm_audit_logs');
    const logs = savedLogs ? JSON.parse(savedLogs) : [];
    const updatedLogs = [log, ...logs];
    localStorage.setItem('crm_audit_logs', JSON.stringify(updatedLogs));
    
    ensureAuth().then(() => {
        setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs }).catch(e => console.warn("Audit sync failed", e));
    });
};

export const Quotations = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
      const saved = localStorage.getItem('crm_active_user');
      return saved ? JSON.parse(saved) : null;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
      const saved = localStorage.getItem('crm_quotes');
      return saved ? JSON.parse(saved) : initialQuotes;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'none' | 'preview'>('none');
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {}, type: 'info' as 'info'|'danger'|'success', confirmText: 'Confirmar', showCancel: true });

  const [pdfPreview, setPdfPreview] = useState<Quote | null>(null); 
  const [pdfActionData, setPdfActionData] = useState<{data: Quote, action: 'print'|'download'} | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [shareQuote, setShareQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [clientSearchMode, setClientSearchMode] = useState(true);
  
  // Unified New Client Data Structure (Same as Sales)
  const [newClientData, setNewClientData] = useState<Partial<Client>>({ name: '', company: '', nit: '', email: '', phone: '', address: '' });
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [clientSearch, setClientSearch] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [catalogTab, setCatalogTab] = useState<'All' | 'Service' | 'Product'>('All');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');

  const [taxEnabled, setTaxEnabled] = useState(false);
  
  // Custom Label Logic
  const [showCustomLabel, setShowCustomLabel] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const canDelete = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('view_quotes');

  const syncLocal = (newQuotes: Quote[]) => {
      setQuotes(newQuotes);
      localStorage.setItem('crm_quotes', JSON.stringify(newQuotes));
  };

  useEffect(() => {
      const fetchData = async () => {
          const savedSettings = localStorage.getItem('crm_settings');
          if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });

          // Refresh clients immediately from localStorage first
          let localClients = localStorage.getItem('crm_clients');
          if (localClients) setAvailableClients(JSON.parse(localClients));
          
          let localInv = localStorage.getItem('crm_inventory');
          if (localInv) setAvailableInventory(JSON.parse(localInv));

          try {
              getDoc(doc(db, 'crm_data', 'quotes')).then(s => { if(s.exists()) { setQuotes((s.data() as any).list || []); localStorage.setItem('crm_quotes', JSON.stringify((s.data() as any).list || [])); } });
              getDoc(doc(db, 'crm_data', 'inventory')).then(s => { if(s.exists()) { setAvailableInventory((s.data() as any).list || []); localStorage.setItem('crm_inventory', JSON.stringify((s.data() as any).list || [])); } });
              // Fetch latest clients from DB to ensure sync
              getDoc(doc(db, 'crm_data', 'clients')).then(s => { 
                  if(s.exists()) { 
                      const dbClients = (s.data() as any).list || [];
                      setAvailableClients(dbClients); 
                      localStorage.setItem('crm_clients', JSON.stringify(dbClients));
                  } 
              });
          } catch(e) {}
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
      total: 0,
      termsAndConditions: ''
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

  const openEdit = (quote: Quote, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (quote.status === 'Approved') {
          alert("Esta cotización ya fue aprobada/convertida y no se puede editar. Crea una nueva versión.");
          return;
      }
      setNewQuote(quote);
      setTaxEnabled(!!quote.taxEnabled);
      // Init custom label states from quote or settings
      setCustomLabel(quote.customLabel || settings.customQuotationLabel || 'FACTURADO');
      setShowCustomLabel(!!quote.showCustomLabel);
      
      setEditingId(quote.id);
      setIsModalOpen(true);
      setSelectedQuote(null);
  };

  const handleCancelEdit = () => {
      if (editingId) {
          const original = quotes.find(q => q.id === editingId);
          if (original) setSelectedQuote(original);
      }
      setIsModalOpen(false);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault(); e?.stopPropagation();
      if (!canDelete) {
          alert('⛔ ACCESO DENEGADO: No tienes permisos para eliminar cotizaciones.');
          return;
      }
      setConfirmModal({
          isOpen: true,
          title: 'Eliminar Cotización',
          message: '¿Estás seguro de eliminar esta cotización permanentemente?',
          type: 'danger',
          confirmText: 'Eliminar',
          showCancel: true,
          action: async () => {
              try {
                  await ensureAuth();
                  const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
                  let currentQuotes: Quote[] = [];
                  if (docSnap.exists()) currentQuotes = (docSnap.data() as any).list || [];
                  else currentQuotes = quotes; 
                  
                  const updatedQuotes = currentQuotes.filter(q => q.id !== id);
                  await setDoc(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(updatedQuotes) });
                  
                  syncLocal(updatedQuotes);
                  setSelectedQuote(null);
                  
                  if (currentUser) {
                      logAuditAction('Delete', `Eliminó cotización ${id}`, currentUser);
                  }

                  setConfirmModal({
                      isOpen: true,
                      title: 'Eliminado',
                      message: 'La cotización se ha eliminado correctamente.',
                      type: 'success',
                      confirmText: 'Aceptar',
                      showCancel: false,
                      action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
                  });
                  
              } catch(error: any) {
                  console.error("Error deleting quote:", error);
                  setConfirmModal({
                      isOpen: true,
                      title: 'Error',
                      message: `No se pudo eliminar: ${error.message}`,
                      type: 'danger',
                      confirmText: 'Cerrar',
                      showCancel: false,
                      action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
                  });
              }
          }
      });
  };

  const handleConvertToSale = async (quote: Quote) => {
      if (quote.items.length === 0) { alert('La cotización no tiene ítems.'); return; }
      if (quote.status === 'Approved') { alert('Esta cotización ya fue convertida.'); return; }
      setConfirmModal({
          isOpen: true,
          title: 'Convertir a Venta',
          message: `¿Convertir la cotización ${quote.id} en una venta confirmada? Esto actualizará el inventario.`,
          type: 'success',
          confirmText: 'Convertir',
          showCancel: true,
          action: async () => {
              try {
                  setIsConverting(true);
                  await ensureAuth();
                  const batch = writeBatch(db);
                  const currentYear = new Date().getFullYear();
                  const salesDocId = `sales_${currentYear}`;
                  const [invDoc, quotesDoc, salesShardDoc, salesLegacyDoc] = await Promise.all([
                      getDoc(doc(db, 'crm_data', 'inventory')),
                      getDoc(doc(db, 'crm_data', 'quotes')),
                      getDoc(doc(db, 'crm_data', salesDocId)),
                      getDoc(doc(db, 'crm_data', 'sales_history'))
                  ]);
                  let currentInventory: InventoryItem[] = invDoc.exists() ? (invDoc.data() as any).list : [];
                  let currentQuotes: Quote[] = quotesDoc.exists() ? (quotesDoc.data() as any).list : [];
                  let currentYearSales: Sale[] = salesShardDoc.exists() ? (salesShardDoc.data() as any).list : [];
                  let legacySales: Sale[] = salesLegacyDoc.exists() ? (salesLegacyDoc.data() as any).list : [];
                  const inventoryUpdates = [...currentInventory];
                  quote.items.forEach(saleItem => {
                      const desc = saleItem.description.trim().toLowerCase();
                      const productIndex = inventoryUpdates.findIndex(i => {
                          const nameMatch = i.name.trim().toLowerCase() === desc;
                          const keywordMatch = i.keywords?.toLowerCase().includes(desc);
                          return nameMatch || keywordMatch;
                      });
                      if (productIndex > -1 && inventoryUpdates[productIndex].type === 'Product') {
                          inventoryUpdates[productIndex].quantity = Math.max(0, inventoryUpdates[productIndex].quantity - saleItem.quantity);
                          if (inventoryUpdates[productIndex].quantity <= 0) inventoryUpdates[productIndex].status = 'Critical';
                          else if (inventoryUpdates[productIndex].quantity <= (inventoryUpdates[productIndex].minStock || 5)) inventoryUpdates[productIndex].status = 'Low Stock';
                          else inventoryUpdates[productIndex].status = 'In Stock';
                      }
                  });
                  const newSaleId = Math.random().toString(36).substring(2, 10).toUpperCase();
                  const linkedClient = availableClients.find(c => c.name === quote.clientName);
                  const newSale: Sale = {
                      id: newSaleId,
                      clientId: linkedClient ? linkedClient.id : 'gen-' + Date.now(),
                      clientName: quote.clientName || 'Cliente General',
                      date: new Date().toISOString(),
                      items: quote.items, 
                      subtotal: Number(quote.subtotal) || 0,
                      discount: Number(quote.discount) || 0, 
                      tax: Number(quote.tax) || 0,         
                      total: Number(quote.total) || 0,
                      amountPaid: 0, 
                      balance: Number(quote.total) || 0,
                      paymentStatus: 'Pending',
                      paymentMethod: 'Cash', 
                      notes: `Convertido desde Cotización ${quote.id}. ${quote.notes || ''}`
                  };
                  const updatedYearSales = [newSale, ...currentYearSales];
                  const updatedLegacySales = [newSale, ...legacySales]; 
                  const updatedQuotes = currentQuotes.map(q => q.id === quote.id ? { ...q, status: 'Approved' as const } : q);
                  batch.set(doc(db, 'crm_data', 'inventory'), { list: deepSanitize(inventoryUpdates) });
                  batch.set(doc(db, 'crm_data', salesDocId), { list: deepSanitize(updatedYearSales) });
                  batch.set(doc(db, 'crm_data', 'sales_history'), { list: deepSanitize(updatedLegacySales) });
                  batch.set(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(updatedQuotes) });
                  await batch.commit();
                  syncLocal(updatedQuotes);
                  setAvailableInventory(inventoryUpdates);
                  localStorage.setItem('crm_inventory', JSON.stringify(inventoryUpdates));
                  localStorage.setItem('crm_sales_history', JSON.stringify(updatedLegacySales)); 
                  setIsConverting(false);
                  setSelectedQuote(null);
                  
                  setConfirmModal({
                      isOpen: true,
                      title: 'Conversión Exitosa',
                      message: 'Se ha creado la venta y descontado el inventario correctamente.',
                      type: 'success',
                      confirmText: 'Ir a Ventas',
                      showCancel: false,
                      action: () => {
                          setConfirmModal(prev => ({...prev, isOpen: false}));
                          navigate('/sales');
                      }
                  });

              } catch (error: any) {
                  console.error("Critical error converting quote:", error);
                  setIsConverting(false);
                  setConfirmModal({
                      isOpen: true,
                      title: 'Error',
                      message: `Error al guardar en la nube: ${error.message}.`,
                      type: 'danger',
                      confirmText: 'Cerrar',
                      showCancel: false,
                      action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
                  });
              }
          }
      });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const cleanItems = (newQuote.items || []).filter(i => i.description.trim() !== '' || i.total > 0);
      try {
          await ensureAuth();
          const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
          let currentQuotes: Quote[] = [];
          if (docSnap.exists()) {
              currentQuotes = (docSnap.data() as any).list || [];
          } else {
              currentQuotes = quotes; 
          }
          let finalId = editingId;
          if (!finalId) {
              // Generate Random Short ID
              finalId = Math.random().toString(36).substring(2, 10).toUpperCase();
          }
          const finalQuote: Quote = {
              id: finalId,
              clientName: newQuote.clientName || 'Cliente General',
              clientEmail: newQuote.clientEmail || '',
              date: newQuote.date || new Date().toISOString(),
              validUntil: newQuote.validUntil || new Date().toISOString(),
              items: cleanItems,
              subtotal: newQuote.subtotal || 0,
              discount: newQuote.discount || 0,
              tax: newQuote.tax || 0,
              total: newQuote.total || 0,
              status: (newQuote.status as any) || 'Draft',
              notes: newQuote.notes || '',
              taxEnabled: taxEnabled,
              termsAndConditions: newQuote.termsAndConditions || settings.termsAndConditions || defaultSettings.termsAndConditions,
              customLabel: customLabel,
              showCustomLabel: showCustomLabel
          };
          
          const updatedQuotesRaw = editingId 
              ? currentQuotes.map(q => q.id === editingId ? finalQuote : q)
              : [finalQuote, ...currentQuotes];
          
          // Deduplicate and Sort
          const uniqueQuotes = Array.from(new Map(updatedQuotesRaw.map(q => [q.id, q])).values());
          const sortedQuotes = uniqueQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          await setDoc(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(sortedQuotes) });
          syncLocal(sortedQuotes);
          
          setIsModalOpen(false);
          if (editingId) setSelectedQuote(finalQuote);

          setConfirmModal({
              isOpen: true,
              title: 'Guardado Exitoso',
              message: `La cotización ${finalId} ha sido guardada correctamente.`,
              type: 'success',
              confirmText: 'Aceptar',
              showCancel: false,
              action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });

      } catch (error: any) {
          console.error("Error saving quote", error);
          setConfirmModal({
              isOpen: true,
              title: 'Error',
              message: `Error al guardar: ${error.message}`,
              type: 'danger',
              confirmText: 'Cerrar',
              showCancel: false,
              action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });
      } finally {
          setIsSaving(false);
      }
  };

  const getClientDetails = (name: string) => {
      return availableClients.find(c => c.name === name);
  };

  const filteredCatalog = availableInventory.filter(item => {
      const matchesTab = catalogTab === 'All' ? true : item.type === catalogTab;
      const matchesCategory = catalogCategory === 'All' ? true : item.category === catalogCategory;
      const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                            item.sku.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesTab && matchesCategory && matchesSearch;
  });

  const filteredClients = availableClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredQuotes = quotes.filter(q => q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.includes(searchTerm));
  const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category)))];

  const renderQuoteContent = (quoteData: Quote) => {
      // Helper to clean item descriptions for PDF
      const cleanDescription = (desc: string) => {
          return desc.replace(/\s*\((?:Precio|Mayorista).*?\)/gi, '').trim();
      };

      return (
      <div className="w-[210mm] bg-white text-slate-800 relative font-sans leading-normal shadow-2xl flex flex-col min-h-[297mm]" style={{padding:0}}>
        <div className="p-12 flex justify-between items-start border-b border-gray-100 shrink-0" style={{ backgroundColor: settings.pdfHeaderColor || '#162836' }}>
            <div className="flex items-center">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} style={{ maxHeight: '100px', width: 'auto' }} alt="Logo" />
                    ) : (
                        <h1 className="text-5xl font-bold text-white tracking-wider uppercase">{settings.companyName}</h1>
                    )}
            </div>
            <div className="text-right text-white">
                <h2 className="text-4xl font-bold tracking-tight mb-2 opacity-95">COTIZACIÓN</h2>
                <div className="text-xs font-medium opacity-80 uppercase tracking-widest space-y-1">
                    <p>Nro: {quoteData.id.replace('COT-', '')}</p>
                    <p>Fecha: {new Date(quoteData.date).toLocaleDateString()}</p>
                    <p>Válido hasta: {new Date(quoteData.validUntil).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
        
        <div className="px-12 py-8 flex-1 flex flex-col relative pb-20">
            <div className="flex justify-between gap-12 mb-10 text-sm">
                <div className="w-1/2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Cliente</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{quoteData.clientName}</h3>
                    {(() => {
                        const client = getClientDetails(quoteData.clientName);
                        return (
                            <div className="text-gray-600 text-xs mt-1 space-y-1 leading-relaxed">
                                {client?.company && <div className="font-medium">{client.company}</div>}
                                {client?.nit && <div>NIT/CI: {client.nit}</div>}
                                {quoteData.clientEmail && <div>{quoteData.clientEmail}</div>}
                                {client?.phone && <div>{client.phone}</div>}
                            </div>
                        );
                    })()}
                </div>
                <div className="w-1/2 text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Emitido Por</p>
                    <div className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold text-gray-900">{settings.companyName}</span>
                        {`\n${settings.address}\n${settings.phone}`}
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <div className="bg-gray-50 flex px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-y border-gray-200">
                    <div className="flex-1">Descripción / Servicio</div>
                    <div className="w-20 text-center">Cant.</div>
                    <div className="w-28 text-right">Precio Unit.</div>
                    <div className="w-28 text-right">Subtotal</div>
                </div>
                <div className="divide-y divide-gray-100 border-b border-gray-200">
                    {quoteData.items?.map((item, idx) => (
                        <div key={idx} className="flex px-4 py-4 text-sm items-start">
                            <div className="flex-1 pr-4">
                                <span className="font-semibold text-gray-800">{cleanDescription(item.description)}</span>
                            </div>
                            <div className="w-20 text-center text-gray-600">{item.quantity}</div>
                            <div className="w-28 text-right text-gray-600">{formatCurrency(item.unitPrice, settings)}</div>
                            <div className="w-28 text-right font-bold text-gray-900">{formatCurrency(item.total, settings)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between items-stretch gap-8 mt-auto">
                <div className="w-[55%] flex flex-col gap-4">
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex-1">
                        <div className="mb-6">
                            <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">Términos y Condiciones</h4>
                            <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                                {quoteData.termsAndConditions || settings.termsAndConditions || 'Validez de la oferta: 15 días.'}
                            </div>
                        </div>
                        
                        {settings.paymentInfo && (
                            <div>
                                <h4 className="font-bold text-gray-900 text-[11px] uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">Datos Bancarios</h4>
                                <div className="flex gap-4 items-start">
                                    {settings.qrCodeUrl && (
                                        <div className="w-20 h-20 bg-white p-1 rounded-lg border border-gray-200 flex-shrink-0">
                                            <img src={settings.qrCodeUrl} className="w-full h-full object-contain" alt="QR" />
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap flex-1">
                                        {settings.paymentInfo}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-[40%] flex flex-col justify-between">
                    <div className="bg-gray-50 p-6 rounded-xl space-y-3 border border-gray-200">
                        <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(quoteData.subtotal, settings)}</span></div>
                        {quoteData.discount > 0 && (<div className="flex justify-between text-sm text-red-500"><span>Descuento ({quoteData.discount}%)</span><span className="text-red-500">-{formatCurrency(quoteData.subtotal * (quoteData.discount/100), settings)}</span></div>)}
                        {quoteData.tax > 0 && (<div className="flex justify-between text-sm text-gray-600"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(quoteData.tax, settings)}</span></div>)}
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-300 pt-3 mt-2"><span>Total</span><span>{formatCurrency(quoteData.total, settings)}</span></div>
                        
                        {quoteData.showCustomLabel && quoteData.customLabel && (
                            <div className="text-right mt-1 pt-1">
                                <span className="text-xs font-bold text-red-600 uppercase tracking-widest px-2 py-1 border border-red-200 bg-red-50 rounded">
                                    {quoteData.customLabel}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="mb-12 text-center flex flex-col items-center">
                        {settings.signatureUrl && (<img src={settings.signatureUrl} className="h-28 object-contain mb-[-15px] z-10 relative" alt="Firma" />)}
                        <div className="border-t border-gray-400 pt-2 w-3/4 mx-auto relative z-0">
                            <p className="text-sm font-bold text-gray-900">{settings.signatureName}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{settings.signatureTitle}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full shrink-0">
            <div className="text-center py-4 border-t border-white/20" style={{ backgroundColor: settings.pdfHeaderColor || '#162836' }}>
                <p className="text-[10px] text-white tracking-wider font-medium uppercase">{settings.pdfFooterText || `${settings.website}`}</p>
            </div>
        </div>
    </div>
  );
  };

  useEffect(() => {
      if (pdfActionData && printRef.current) {
          setTimeout(() => {
              html2canvas(printRef.current!, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = pdf.internal.pageSize.getHeight();
                  const imgWidth = pdfWidth;
                  const imgHeight = (canvas.height * imgWidth) / canvas.width;
                  
                  let heightLeft = imgHeight;
                  let position = 0;

                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                  heightLeft -= pdfHeight;

                  while (heightLeft >= 1) {
                      position = heightLeft - imgHeight;
                      pdf.addPage();
                      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                      heightLeft -= pdfHeight;
                  }
                  
                  if (pdfActionData.action === 'download') {
                      pdf.save(`Cotizacion_${pdfActionData.data.id}.pdf`);
                  } else {
                      pdf.autoPrint();
                      const pdfBlob = pdf.output('bloburl');
                      window.open(pdfBlob, '_blank');
                  }
                  setPdfActionData(null);
              });
          }, 500);
      }
  }, [pdfActionData]);

  const handleDirectAction = (quote: Quote, action: 'print' | 'download', e?: React.MouseEvent) => {
      e?.preventDefault(); e?.stopPropagation();
      setPdfActionData({ data: quote, action });
  };

  const handleShareWhatsApp = (quoteToShare: Quote) => {
      if (!quoteToShare) return;
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const publicLink = `${baseUrl}#/view/quote/${quoteToShare.id}`;
      
      // Construct item summary
      const itemsSummary = quoteToShare.items.map(i => `- ${i.quantity}x ${i.description}`).join('\n');
      
      const text = `Le envío la Cotización ${quoteToShare.id}\n\nResumen:\n${itemsSummary}\n\nTotal: ${formatCurrency(quoteToShare.total, settings)}\n\nPuede verla y descargarla aquí:\n${publicLink}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
      if (!shareQuote) return;
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const publicLink = `${baseUrl}#/view/quote/${shareQuote.id}`;
      navigator.clipboard.writeText(publicLink);
      setIsShareModalOpen(false);
      alert("Enlace copiado al portapapeles.");
  };

  const handlePreview = (quote: Quote, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setPdfPreview(quote);
      setModalType('preview');
  };

  const handleSelectClient = (client: Client) => {
      setNewQuote(prev => ({ 
          ...prev, 
          clientName: client.name, 
          clientEmail: client.email 
      }));
      setClientSearch('');
      setIsClientModalOpen(false);
  };

  // --- ROBUST CREATE CLIENT (Updated to match Sales) ---
  const handleCreateClient = async () => {
      if (!newClientData.name) { alert('El nombre es obligatorio'); return; }
      
      const newClient: Client = {
          id: Math.random().toString(36).substr(2, 9),
          name: newClientData.name,
          company: newClientData.company || '',
          nit: newClientData.nit || '',
          email: newClientData.email || '',
          phone: newClientData.phone || '',
          address: newClientData.address || '',
          type: 'Client',
          avatar: `https://ui-avatars.com/api/?name=${newClientData.name}&background=random`
      };
      
      // Update Local State
      const updatedClients = [newClient, ...availableClients];
      setAvailableClients(updatedClients);
      localStorage.setItem('crm_clients', JSON.stringify(updatedClients));
      
      // Update DB
      try {
          await setDoc(doc(db, 'crm_data', 'clients'), { list: updatedClients });
      } catch(e) { console.error("Error creating client", e); }

      // Select and Close
      handleSelectClient(newClient);
      setNewClientData({ name: '', company: '', nit: '', email: '', phone: '', address: '' });
      setClientSearchMode(true);
  };

  return (
    <div className="space-y-4 pb-safe-area h-full flex flex-col bg-[#f4f6f7]">
      {/* ... (Confirmation Modal, PDF Preview Div, Header) ... */}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        showCancel={confirmModal.showCancel}
      />

      {pdfActionData && (
          <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
              <div ref={printRef}>
                  {renderQuoteContent(pdfActionData.data)}
              </div>
          </div>
      )}

      {/* MATCHED SALES HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Gestión comercial</p>
        </div>
        <button onClick={() => { setEditingId(null); setCustomLabel(settings.customQuotationLabel || 'FACTURADO'); setShowCustomLabel(false); setNewQuote({ clientName: '', date: new Date().toISOString().split('T')[0], validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Draft', items: [], subtotal: 0, discount: 0, tax: 0, total: 0, termsAndConditions: settings.termsAndConditions || defaultSettings.termsAndConditions }); setTaxEnabled(false); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-900 text-white px-5 py-3 rounded-xl text-base font-bold hover:bg-brand-800 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 min-h-[48px]">
            <Plus size={20} /> Nueva Cotización
        </button>
      </div>

      {/* MATCHED SALES LIST CONTAINER */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* SEARCH BAR */}
          <div className="p-4 border-b border-gray-100 flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                  <input 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-base" 
                    placeholder="Buscar por cliente o ID..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
              </div>
          </div>

          {/* UNIFIED LIST (Desktop & Mobile Responsive) */}
          <div className="flex-1 overflow-y-auto">
              {filteredQuotes.map((quote) => (
                  <div key={quote.id} onClick={() => setSelectedQuote(quote)} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center group cursor-pointer transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${quote.status === 'Approved' ? 'bg-green-500' : 'bg-brand-900'}`}>
                              {quote.status === 'Approved' ? <Check size={24} /> : <FileText size={24} />}
                          </div>
                          <div>
                              <p className="font-bold text-gray-900 text-base line-clamp-1">{quote.clientName}</p>
                              <p className="text-sm text-gray-500">
                                  <span className="hidden md:inline">{quote.id} • </span>
                                  {new Date(quote.date).toLocaleDateString()}
                              </p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-brand-900 text-lg whitespace-nowrap">{formatCurrency(quote.total, settings)}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${quote.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {quote.status === 'Approved' ? 'Aprobada' : 'Borrador'}
                          </span>
                      </div>
                  </div>
              ))}
              {filteredQuotes.length === 0 && <div className="text-center py-10 text-gray-400 text-base">No se encontraron cotizaciones.</div>}
          </div>
      </div>

      {selectedQuote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full h-full md:h-auto md:w-full md:max-w-lg md:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-none md:max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center pt-safe-top shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {selectedQuote.id}
                            {selectedQuote.status === 'Approved' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase border bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><Check size={10}/> Convertida</span>
                            ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase border bg-gray-100 text-gray-600 border-gray-200">Borrador</span>
                            )}
                        </h3>
                        {/* Swapped order: Client Name then Date */}
                        <p className="text-sm text-gray-500">{selectedQuote.clientName} • {new Date(selectedQuote.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setSelectedQuote(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={24}/></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Detalle de Cotización</h4>
                    <div className="space-y-3 mb-6">
                        {selectedQuote.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-start gap-3 flex-1">
                                    <span className="font-bold text-brand-900 bg-white border border-gray-200 px-2 py-1 rounded text-xs shadow-sm shrink-0 mt-0.5">{item.quantity}x</span>
                                    <span className="text-gray-800 font-medium leading-tight break-words">{item.description}</span>
                                </div>
                                <span className="font-bold text-gray-900 whitespace-nowrap ml-4">{formatCurrency(item.total, settings)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-xl">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(selectedQuote.subtotal, settings)}</span>
                        </div>
                        
                        {(selectedQuote.discount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                                <span>Descuento ({selectedQuote.discount}%)</span>
                                <span>-{formatCurrency(selectedQuote.subtotal * ((selectedQuote.discount || 0)/100), settings)}</span>
                            </div>
                        )}

                        {selectedQuote.tax > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{settings.taxName} ({settings.taxRate}%)</span>
                                <span>{formatCurrency(selectedQuote.tax, settings)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-2xl font-black text-brand-900 pt-2 border-t border-gray-200 mt-2">
                            <span>Total</span>
                            <span>{formatCurrency(selectedQuote.total, settings)}</span>
                        </div>
                        
                        {selectedQuote.showCustomLabel && selectedQuote.customLabel && (
                            <div className="flex justify-end mt-2">
                                <span className="text-xs font-bold text-red-600 uppercase tracking-widest px-2 py-1 border border-red-200 bg-red-50 rounded">
                                    {selectedQuote.customLabel}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-gray-200 grid grid-cols-2 gap-3 pb-safe-area shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
                    {selectedQuote.status !== 'Approved' && (
                        <button onClick={() => handleConvertToSale(selectedQuote)} disabled={isConverting} className="col-span-2 w-full py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all min-h-[48px]">
                            {isConverting ? <RefreshCw className="animate-spin" size={20}/> : <ShoppingCart size={20}/>} Convertir a Venta
                        </button>
                    )}
                    
                    <button onClick={(e) => handlePreview(selectedQuote, e)} className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm min-h-[48px]"><Eye size={18}/> Ver PDF</button>
                    <button onClick={() => { setIsShareModalOpen(true); setShareQuote(selectedQuote); }} className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 border border-green-100 font-bold rounded-xl hover:bg-green-100 transition-colors shadow-sm min-h-[48px]"><Share2 size={18}/> Compartir</button>
                    
                    {selectedQuote.status !== 'Approved' ? (
                        <>
                            <button onClick={(e) => openEdit(selectedQuote, e)} className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm min-h-[48px]"><Edit3 size={18}/> Editar</button>
                            {canDelete && (
                                <button onClick={(e) => handleDelete(selectedQuote.id, e)} className="flex items-center justify-center gap-2 py-3 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm min-h-[48px]"><Trash2 size={18}/> Eliminar</button>
                            )}
                        </>
                    ) : (
                        <button onClick={() => alert('Cotización ya convertida a venta.')} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-400 border border-gray-200 font-bold rounded-xl cursor-not-allowed min-h-[48px]">No Editable (Convertida)</button>
                    )}
                </div>
            </div>
        </div>
      )}

      {modalType === 'preview' && pdfPreview && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full h-full md:h-[90vh] md:rounded-2xl md:max-w-4xl flex flex-col shadow-2xl overflow-hidden relative">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 pt-safe-top">
                        <h3 className="font-bold text-lg text-gray-900">Vista Previa</h3>
                        <div className="flex gap-2">
                             <button onClick={() => handleDirectAction(pdfPreview, 'print')} className="px-4 py-2 bg-white border border-brand-900 text-brand-900 rounded-lg text-sm font-bold hover:bg-brand-50 flex items-center gap-2 min-h-[44px]"><Printer size={16}/> Imprimir</button>
                             <button onClick={() => handleDirectAction(pdfPreview, 'download')} className="px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 flex items-center gap-2 min-h-[44px]"><Download size={16}/> Descargar</button>
                             <button onClick={() => setModalType('none')} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center items-start">
                        <div className="shadow-2xl origin-top transform scale-[0.45] sm:scale-75 md:scale-90 lg:scale-100 mt-4">
                            {renderQuoteContent(pdfPreview)}
                        </div>
                    </div>
                </div>
            </div>
      )}

      {/* ... (Share Modal, Client Modal, Catalog Modal, Edit Modal - SAME AS BEFORE) ... */}
      {isShareModalOpen && shareQuote && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
              <div className="bg-white w-full h-full md:h-auto md:rounded-2xl md:max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200 flex flex-col justify-center">
                  <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20}/></button>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-brand-900"/> Compartir Cotización</h3>
                  <div className="space-y-3">
                      <button onClick={() => handleShareWhatsApp(shareQuote)} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]">Enviar por WhatsApp</button>
                      <button onClick={handleCopyLink} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]"><Copy size={18}/> Copiar Enlace</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* --- UNIFIED CLIENT SEARCH / CREATE MODAL --- */}
      {isClientModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
              <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-2xl shadow-xl flex flex-col animate-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 pt-safe-top shrink-0">
                      <h3 className="font-bold text-lg text-gray-900">{clientSearchMode ? 'Buscar Cliente' : 'Nuevo Cliente'}</h3>
                      <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full"><X size={24} /></button>
                  </div>
                  
                  {clientSearchMode ? (
                      // MODE: SEARCH
                      <div className="flex flex-col h-full overflow-hidden">
                          <div className="p-4 border-b border-gray-100 flex gap-2 shrink-0">
                              <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                  <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 text-gray-900 bg-white" onChange={(e) => setClientSearch(e.target.value)} />
                              </div>
                              <button onClick={() => setClientSearchMode(false)} className="px-4 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1 min-h-[48px] shadow-md"><Plus size={16}/> Nuevo</button>
                          </div>
                          <div className="p-2 flex-1 overflow-y-auto">
                              {isLoadingData && availableClients.length === 0 && (
                                   <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-brand-900" /></div>
                              )}
                              {filteredClients.map(c => (
                                  <div key={c.id} onClick={() => handleSelectClient(c)} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between group transition-colors">
                                      <div>
                                          <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                          <p className="text-xs text-gray-500">{c.company || 'Particular'}</p>
                                      </div>
                                      <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-900"/>
                                  </div>
                              ))}
                              {!isLoadingData && availableClients.length === 0 && (
                                  <p className="text-center text-gray-400 py-8 text-sm">No se encontraron clientes.</p>
                              )}
                          </div>
                      </div>
                  ) : (
                      // MODE: CREATE (Unified with Sales)
                      <div className="flex flex-col h-full overflow-hidden">
                          <div className="p-6 space-y-4 overflow-y-auto flex-1">
                              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Nombre Completo *</label><input autoFocus required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} placeholder="Ej. Juan Pérez"/></div>
                              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Empresa</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.company} onChange={e => setNewClientData({...newClientData, company: e.target.value})} placeholder="Opcional"/></div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">NIT / CI</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.nit} onChange={e => setNewClientData({...newClientData, nit: e.target.value})} /></div>
                                  <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Teléfono</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} /></div>
                              </div>
                              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Email</label><input type="email" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} /></div>
                              <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Dirección</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.address} onChange={e => setNewClientData({...newClientData, address: e.target.value})} /></div>
                          </div>
                          <div className="p-4 border-t border-gray-200 bg-white pb-safe-area flex gap-3 shrink-0">
                              <button onClick={() => setClientSearchMode(true)} className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors bg-white min-h-[48px]">Volver</button>
                              <button onClick={handleCreateClient} className="flex-1 px-6 py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20 min-h-[48px]">Crear Cliente</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {isCatalogModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
              <div className="bg-white w-full h-full md:h-[80vh] md:rounded-2xl md:max-w-5xl flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden border border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 pt-safe-top">
                      <div><h3 className="font-bold text-xl text-gray-900">Catálogo</h3><p className="text-sm text-gray-500">Selecciona ítems para añadir</p></div>
                      <button onClick={() => setIsCatalogModalOpen(false)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"><X size={24}/></button>
                  </div>
                  
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                      <div className="relative flex-1 w-full">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                          <input autoFocus type="text" placeholder="Buscar por nombre o código..." className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-900 bg-white shadow-sm" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                      </div>
                      <div className="flex gap-2 w-full md:w-auto relative">
                          <div className="relative">
                              <select className="appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-700 bg-white shadow-sm cursor-pointer w-full" value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}>
                                  {categories.map(cat => <option key={cat} value={cat} className="text-gray-900">{cat === 'All' ? 'Todas las Categorías' : cat}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white p-0 pb-20 md:pb-0">
                      <div className="divide-y divide-gray-100">
                          {filteredCatalog.map(item => (
                              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                              <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getCategoryColor(item.category)}`}>{item.category}</span>
                                              {item.sku && <span className="text-xs text-gray-400 font-mono">{item.sku}</span>}
                                          </div>
                                          <h4 className="text-base font-bold text-gray-900 leading-tight mb-1">{item.name}</h4>
                                      </div>
                                      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0 mt-4 md:mt-0">
                                          <button onClick={() => addItemFromCatalog(item)} className="flex flex-col items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-lg text-gray-900 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-500 uppercase">Unitario</span><span className="text-sm font-bold">{formatCurrency(item.price, settings)}</span></button>
                                          {item.priceDozen && item.priceDozen > 0 && <button onClick={() => addItemFromCatalog(item, item.priceDozen)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista A</span><span className="text-sm font-bold text-blue-700">{formatCurrency(item.priceDozen, settings)}</span></button>}
                                          {item.priceBox && item.priceBox > 0 && <button onClick={() => addItemFromCatalog(item, item.priceBox)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista B</span><span className="text-sm font-bold text-orange-700">{formatCurrency(item.priceBox, settings)}</span></button>}
                                          {item.priceWholesale && item.priceWholesale > 0 && <button onClick={() => addItemFromCatalog(item, item.priceWholesale)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista C</span><span className="text-sm font-bold text-purple-700">{formatCurrency(item.priceWholesale, settings)}</span></button>}
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {filteredCatalog.length === 0 && <div className="p-12 text-center text-gray-400"><p>No se encontraron resultados.</p></div>}
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-y-auto">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl md:max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 md:my-8 flex flex-col shadow-2xl">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 shrink-0 pt-safe-top">
              <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6 md:p-8 space-y-8 flex-1">
                <form id="quote-form" onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                            {/* Read-only input that triggers modal */}
                            <div 
                                className="flex gap-2 relative cursor-pointer"
                                onClick={() => { setClientSearchMode(true); setIsClientModalOpen(true); }}
                            >
                                <input 
                                    readOnly
                                    required 
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-gray-50 text-gray-900 outline-none cursor-pointer focus:border-brand-500 min-h-[44px]" 
                                    placeholder="Seleccionar Cliente..." 
                                    value={newQuote.clientName} 
                                />
                                <button type="button" className="px-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 border border-brand-900 shadow-md flex items-center justify-center min-h-[44px] min-w-[44px] pointer-events-none"><Search size={18}/></button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Emisión</label>
                            <div className="relative">
                                <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-900 appearance-none min-h-[44px]" value={newQuote.date} onChange={e => setNewQuote({...newQuote, date: e.target.value})} />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Válido Hasta</label>
                            <div className="relative">
                                <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-900 appearance-none min-h-[44px]" value={newQuote.validUntil} onChange={e => setNewQuote({...newQuote, validUntil: e.target.value})} />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700 text-sm">Ítems</h4>
                            <button type="button" onClick={() => setIsCatalogModalOpen(true)} className="text-sm bg-brand-50 text-brand-900 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 border border-brand-200 hover:bg-brand-100 min-h-[40px]"><Package size={16}/> Catálogo</button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {newQuote.items?.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="col-span-5 md:col-span-6"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-gray-900 outline-none focus:border-brand-500 text-sm truncate" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                    <div className="col-span-2"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-center text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                    <div className="col-span-3 md:col-span-3"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-right text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                    <div className="col-span-2 md:col-span-1 text-right"><button type="button" onClick={() => removeItem(item.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><Trash2 size={16}/></button></div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addManualItem} className="mt-3 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 p-2"><Plus size={12}/> Agregar Fila Manual</button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full md:w-1/2 ml-auto">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                <span className="text-sm font-medium text-gray-600">Subtotal</span>
                                <span className="text-sm font-bold text-gray-900">{formatCurrency(newQuote.subtotal || 0, settings)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600">Descuento</span>
                                    <div className="flex items-center bg-white px-2 py-0.5 rounded border border-gray-300">
                                        <input type="number" className="w-10 text-right text-xs outline-none font-bold text-gray-900 bg-white" value={newQuote.discount || ''} onChange={(e) => setNewQuote({...newQuote, discount: Number(e.target.value)})} placeholder="0"/>
                                        <span className="text-xs font-bold text-gray-500">%</span>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-red-500">- {formatCurrency((newQuote.subtotal || 0) * ((newQuote.discount || 0)/100), settings)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <ToggleSwitch checked={taxEnabled} onChange={setTaxEnabled} label={`${settings.taxName} (${settings.taxRate}%)`} />
                                </label>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(newQuote.tax || 0, settings)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-bold text-brand-900">{formatCurrency(newQuote.total || 0, settings)}</span>
                            </div>
                            
                            {/* CUSTOM LABEL TOGGLE */}
                            <div className="flex flex-col gap-2 pt-3 border-t border-gray-200/60">
                                <div className="flex justify-between items-center">
                                    <ToggleSwitch checked={showCustomLabel} onChange={setShowCustomLabel} label="Nota Extra" />
                                    {showCustomLabel && (
                                        <input 
                                            value={customLabel} 
                                            onChange={(e) => setCustomLabel(e.target.value)} 
                                            className="w-32 px-2 py-1 text-xs font-bold text-red-600 bg-white border border-gray-300 rounded text-right uppercase focus:border-red-500 outline-none"
                                            placeholder="FACTURADO"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Términos y Condiciones Específicos</label>
                                <span className={`text-xs font-bold ${newQuote.termsAndConditions?.length && newQuote.termsAndConditions.length > 600 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {newQuote.termsAndConditions?.length || 0}/600
                                </span>
                            </div>
                            <textarea 
                                maxLength={600}
                                className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-900 min-h-[150px] resize-y bg-white text-gray-700" 
                                placeholder="Opcional." 
                                value={newQuote.termsAndConditions} 
                                onChange={(e) => setNewQuote({...newQuote, termsAndConditions: e.target.value})} 
                            />
                        </div>
                    </div>
                </form>
            </div>
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2 shrink-0 pb-safe-area">
                <button type="button" onClick={handleCancelEdit} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 bg-white font-medium min-h-[48px]">Cancelar</button>
                <button 
                    form="quote-form" 
                    type="submit" 
                    disabled={isSaving || !newQuote.clientName || !newQuote.items || newQuote.items.length === 0} 
                    className="px-6 py-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[48px]"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={16}/> : null} {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
