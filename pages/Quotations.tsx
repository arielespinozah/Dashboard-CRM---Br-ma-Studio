import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, Edit3, Package, Download, Share2, Copy, Printer, Calendar as CalendarIcon, Check, Eye, ShoppingCart, Lock, ArrowRight, X, RefreshCw, ChevronDown, AlertTriangle, User, FileText, DollarSign } from 'lucide-react';
import { Quote, QuoteItem, AppSettings, Client, InventoryItem, User as UserType, AuditLog, Sale } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db, auth } from '../firebase'; // Import auth
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'; 
import { signInAnonymously } from 'firebase/auth'; // Import sign in
import { useNavigate } from 'react-router-dom';

// --- HELPER DE SANITIZACIÓN ROBUSTA ---
const deepSanitize = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        return value;
    }));
};

// --- HELPER DE SEGURIDAD (Blindaje) ---
const ensureAuth = async () => {
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
            // Pequeña espera para asegurar propagación
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error("Error de re-autenticación", error);
            throw new Error("No se pudo establecer una conexión segura para escribir en la base de datos.");
        }
    }
};

const formatCurrency = (amount: number, settings: AppSettings) => {
    const safeAmount = Number(amount) || 0;
    const val = safeAmount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const getCategoryColor = (category: string) => {
    if (!category) return 'bg-gray-50 text-gray-600 border-gray-200';
    const colors = [
        'bg-blue-50 text-blue-700 border-blue-200',
        'bg-green-50 text-green-700 border-green-200',
        'bg-purple-50 text-purple-700 border-purple-200',
        'bg-orange-50 text-orange-700 border-orange-200'
    ];
    return colors[category.length % colors.length];
};

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
    signatureTitle: 'CEO'
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
        metadata
    };
    
    const savedLogs = localStorage.getItem('crm_audit_logs');
    const logs = savedLogs ? JSON.parse(savedLogs) : [];
    const updatedLogs = [log, ...logs];
    localStorage.setItem('crm_audit_logs', JSON.stringify(updatedLogs));
    
    // Fire and forget
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
  
  // Detalle State
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
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
  const [newClientName, setNewClientName] = useState('');
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [clientSearch, setClientSearch] = useState(''); 
  
  const [catalogTab, setCatalogTab] = useState<'All' | 'Service' | 'Product'>('All');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');

  const [taxEnabled, setTaxEnabled] = useState(false);

  const canDelete = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('view_quotes');

  // Sync Local Helper
  const syncLocal = (newQuotes: Quote[]) => {
      setQuotes(newQuotes);
      localStorage.setItem('crm_quotes', JSON.stringify(newQuotes));
  };

  useEffect(() => {
      const fetchData = async () => {
          const savedSettings = localStorage.getItem('crm_settings');
          if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });

          let localClients = localStorage.getItem('crm_clients');
          if (localClients) setAvailableClients(JSON.parse(localClients));
          
          let localInv = localStorage.getItem('crm_inventory');
          if (localInv) setAvailableInventory(JSON.parse(localInv));

          try {
              getDoc(doc(db, 'crm_data', 'quotes')).then(s => { if(s.exists()) { setQuotes(s.data().list || []); localStorage.setItem('crm_quotes', JSON.stringify(s.data().list || [])); } });
              getDoc(doc(db, 'crm_data', 'inventory')).then(s => { if(s.exists()) { setAvailableInventory(s.data().list || []); localStorage.setItem('crm_inventory', JSON.stringify(s.data().list || [])); } });
              getDoc(doc(db, 'crm_data', 'clients')).then(s => { if(s.exists()) setAvailableClients(s.data().list || []); });
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

  // --- ATOMIC DELETE (SECURED) ---
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      if (!canDelete) {
          alert('⛔ ACCESO DENEGADO: No tienes permisos para eliminar cotizaciones.');
          return;
      }
      
      if (!window.confirm('⚠️ ADVERTENCIA: ¿Eliminar esta cotización permanentemente?')) {
          return;
      }

      try {
          // FORCE AUTH CHECK
          await ensureAuth();

          // 1. Fetch FRESH Data
          const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
          let currentQuotes: Quote[] = [];
          if (docSnap.exists()) currentQuotes = docSnap.data().list || [];
          else currentQuotes = quotes; 

          // 2. Filter out the deleted item
          const updatedQuotes = currentQuotes.filter(q => q.id !== id);

          // 3. Save
          await setDoc(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(updatedQuotes) });
          
          // 4. Update UI
          syncLocal(updatedQuotes);
          setSelectedQuote(null);
          
          if (currentUser) {
              logAuditAction('Delete', `Eliminó cotización ${id}`, currentUser);
          }
          alert("Cotización eliminada correctamente.");
      } catch(error: any) {
          console.error("Error deleting quote:", error);
          alert(`Error de sistema al eliminar: ${error.message}. Verifica tu conexión a internet.`);
      }
  };

  // --- ROBUST ATOMIC CONVERSION (SECURED) ---
  const handleConvertToSale = async (quote: Quote) => {
      try {
          if (quote.items.length === 0) { alert('La cotización no tiene ítems.'); return; }
          if (quote.status === 'Approved') { alert('Esta cotización ya fue convertida.'); return; }
          
          if (!window.confirm(`¿Convertir cotización ${quote.id} en Venta confirmada?`)) {
              return;
          }

          setIsConverting(true);

          // FORCE AUTH CHECK
          await ensureAuth();

          // 1. Initialize Batch
          const batch = writeBatch(db);

          // 2. Fetch ALL needed data
          const currentYear = new Date().getFullYear();
          const salesDocId = `sales_${currentYear}`;
          
          const [invDoc, quotesDoc, salesShardDoc, salesLegacyDoc] = await Promise.all([
              getDoc(doc(db, 'crm_data', 'inventory')),
              getDoc(doc(db, 'crm_data', 'quotes')),
              getDoc(doc(db, 'crm_data', salesDocId)),
              getDoc(doc(db, 'crm_data', 'sales_history'))
          ]);

          let currentInventory: InventoryItem[] = invDoc.exists() ? invDoc.data().list : [];
          let currentQuotes: Quote[] = quotesDoc.exists() ? quotesDoc.data().list : [];
          let currentYearSales: Sale[] = salesShardDoc.exists() ? salesShardDoc.data().list : [];
          let legacySales: Sale[] = salesLegacyDoc.exists() ? salesLegacyDoc.data().list : [];

          // 3. Deduct Inventory
          const inventoryUpdates = [...currentInventory];
          
          quote.items.forEach(saleItem => {
              const normalizedDesc = saleItem.description.trim().toLowerCase();
              const productIndex = inventoryUpdates.findIndex(i => i.name.trim().toLowerCase() === normalizedDesc);
              
              if (productIndex > -1 && inventoryUpdates[productIndex].type === 'Product') {
                  inventoryUpdates[productIndex].quantity = Math.max(0, inventoryUpdates[productIndex].quantity - saleItem.quantity);
                  
                  if (inventoryUpdates[productIndex].quantity <= 0) inventoryUpdates[productIndex].status = 'Critical';
                  else if (inventoryUpdates[productIndex].quantity <= (inventoryUpdates[productIndex].minStock || 5)) inventoryUpdates[productIndex].status = 'Low Stock';
                  else inventoryUpdates[productIndex].status = 'In Stock';
              }
          });

          // 4. Create Sale Object
          const newSaleId = `VTA-${currentYear}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
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

          // 5. Update Lists
          const updatedYearSales = [newSale, ...currentYearSales];
          const updatedLegacySales = [newSale, ...legacySales]; 
          const updatedQuotes = currentQuotes.map(q => q.id === quote.id ? { ...q, status: 'Approved' as const } : q);

          // 6. Queue Batch Operations
          batch.set(doc(db, 'crm_data', 'inventory'), { list: deepSanitize(inventoryUpdates) });
          batch.set(doc(db, 'crm_data', salesDocId), { list: deepSanitize(updatedYearSales) });
          batch.set(doc(db, 'crm_data', 'sales_history'), { list: deepSanitize(updatedLegacySales) });
          batch.set(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(updatedQuotes) });

          // 7. Commit
          await batch.commit();

          // 8. Update UI
          syncLocal(updatedQuotes);
          setAvailableInventory(inventoryUpdates);
          localStorage.setItem('crm_inventory', JSON.stringify(inventoryUpdates));
          localStorage.setItem('crm_sales_history', JSON.stringify(updatedLegacySales)); 

          setIsConverting(false);
          setSelectedQuote(null);
          
          alert('✅ Conversión exitosa. Se ha creado la venta y descontado el inventario.');
          navigate('/sales'); 

      } catch (error: any) {
          console.error("Critical error converting quote:", error);
          setIsConverting(false);
          alert(`Error al guardar en la nube: ${error.message}.`);
      }
  };

  // AUDIT FIX: Atomic Save (Fetch-Modify-Save)
  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      
      const cleanItems = (newQuote.items || []).filter(i => i.description.trim() !== '' || i.total > 0);

      try {
          await ensureAuth();

          const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
          let currentQuotes: Quote[] = [];
          if (docSnap.exists()) {
              currentQuotes = docSnap.data().list || [];
          } else {
              currentQuotes = quotes; 
          }

          let finalId = editingId;
          if (!finalId) {
              const year = new Date().getFullYear();
              const currentYearQuotes = currentQuotes.filter(q => q.id.startsWith(`COT-${year}`));
              const nextNum = currentYearQuotes.length + 1;
              finalId = `COT-${year}-${String(nextNum).padStart(4, '0')}`;
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
              // ENLACE DE TERMINOS: Si está vacío, usa el de settings
              termsAndConditions: newQuote.termsAndConditions || settings.termsAndConditions || defaultSettings.termsAndConditions
          };

          const updatedQuotes = editingId 
              ? currentQuotes.map(q => q.id === editingId ? finalQuote : q)
              : [finalQuote, ...currentQuotes];

          await setDoc(doc(db, 'crm_data', 'quotes'), { list: deepSanitize(updatedQuotes) });
          
          syncLocal(updatedQuotes);
          setIsModalOpen(false);
          
          if (editingId) {
              setSelectedQuote(finalQuote);
          }
      } catch (error: any) {
          console.error("Error saving quote", error);
          alert(`Error al guardar: ${error.message}`);
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
  const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category)))];

  const renderQuoteContent = (quoteData: Quote) => (
      <div className="w-[210mm] bg-white text-slate-800 relative font-sans leading-normal shadow-2xl flex flex-col min-h-[297mm]" style={{padding:0}}>
        <div className="p-12 flex justify-between items-start border-b border-gray-100 shrink-0" style={{ backgroundColor: settings.pdfHeaderColor || '#162836' }}>
            <div className="flex items-center">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} style={{ maxHeight: '100px', width: 'auto' }} alt="Logo" />
                    ) : (
                        <h1 className="text-3xl font-bold text-white tracking-wider uppercase">{settings.companyName}</h1>
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
                                <span className="font-semibold text-gray-800">{item.description}</span>
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
      const publicLink = `${baseUrl}#/view/quote/${quoteToShare.id}`;
      const itemsList = quoteToShare.items?.map(i => `- ${i.quantity}x ${i.description}`).join('\n') || '';
      const text = `Le envío la Cotización ${quoteToShare.id}\n\nResumen:\n${itemsList}\n\nTotal: ${formatCurrency(quoteToShare.total, settings)}\n\nPuede verla y descargarla aquí:\n${publicLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
      if (!shareQuote) return;
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      const publicLink = `${baseUrl}#/view/quote/${shareQuote.id}`;
      navigator.clipboard.writeText(publicLink);
      setIsShareModalOpen(false);
      alert("Enlace copiado al portapapeles.");
  };

  const handlePreview = (quote: Quote, e?: React.MouseEvent) => {
      e?.preventDefault(); e?.stopPropagation();
      setPdfPreview(quote);
      setModalType('preview');
  }

  // Handle Save is now defined above with Async logic

  const handleSelectClient = (client: Client) => {
      setNewQuote(prev => ({...prev, clientName: client.name, clientEmail: client.email}));
      setIsClientModalOpen(false);
      setClientSearchMode(true);
  };

  const handleQuickCreateClient = () => {
      if (!newClientName.trim()) return;
      const newClient: Client = {
          id: Math.random().toString(36).substr(2, 9),
          name: newClientName,
          company: '',
          email: '',
          phone: '',
          address: '',
          type: 'Prospect',
          avatar: `https://ui-avatars.com/api/?name=${newClientName}&background=random`
      };
      const updatedClients = [...availableClients, newClient];
      setAvailableClients(updatedClients);
      localStorage.setItem('crm_clients', JSON.stringify(updatedClients));
      
      setDoc(doc(db, 'crm_data', 'clients'), { list: updatedClients }).catch(()=>{});
      
      setNewQuote(prev => ({ ...prev, clientName: newClient.name }));
      setIsClientModalOpen(false);
      setNewClientName('');
  };

  return (
    <div className="space-y-6 relative h-full pb-safe-area">
      {pdfActionData && (
          <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
              <div ref={printRef}>
                  {renderQuoteContent(pdfActionData.data)}
              </div>
          </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Gestión comercial</p>
        </div>
        {/* Force settings to have default terms to ensure they propagate on New Quote */}
        <button onClick={() => { setEditingId(null); setNewQuote({ clientName: '', date: new Date().toISOString().split('T')[0], validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Draft', items: [], subtotal: 0, discount: 0, tax: 0, total: 0, termsAndConditions: settings.termsAndConditions || defaultSettings.termsAndConditions }); setTaxEnabled(false); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 shadow-lg active:scale-95 transition-transform min-h-[44px]">
            <Plus size={18} /> <span className="hidden sm:inline">Nueva</span>
        </button>
      </div>

      <div className="flex-1">
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Cliente</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Fecha</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide text-right">Ver</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {quotes.map((quote) => (
                    <tr key={quote.id} onClick={() => setSelectedQuote(quote)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 text-sm font-medium text-brand-900 flex items-center gap-2">
                            {quote.id}
                            {quote.status === 'Approved' && <Check size={14} className="text-green-500" title="Aprobada / Convertida"/>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">{quote.clientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                            <div>{new Date(quote.date).toLocaleDateString()}</div>
                            {quote.date.includes('T') && <div className="text-xs text-gray-400">{new Date(quote.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(quote.total, settings)}</td>
                        <td className="px-6 py-4 text-right">
                            <ChevronDown size={18} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors -rotate-90"/>
                        </td>
                    </tr>
                    ))}
                    {quotes.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay cotizaciones</td></tr>}
                </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4 pb-20">
              {quotes.map(quote => (
                  <div key={quote.id} onClick={() => setSelectedQuote(quote)} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform relative cursor-pointer overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${quote.status === 'Approved' ? 'bg-green-500' : 'bg-brand-900'}`}></div>
                      <div className="flex justify-between items-start pl-3">
                          <div>
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                  {quote.id}
                                  {quote.status === 'Approved' && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">Venta</span>}
                              </h4>
                              <p className="text-sm text-gray-600 font-medium mt-1">{quote.clientName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {quote.date ? new Date(quote.date).toLocaleDateString() : 'N/A'}
                              </p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-50 pl-3">
                          <span className="font-bold text-lg text-gray-900">{formatCurrency(quote.total, settings)}</span>
                          <button className="text-sm text-brand-900 font-bold hover:underline">Detalles</button>
                      </div>
                  </div>
              ))}
              {quotes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No hay cotizaciones.</div>}
          </div>
      </div>

      {selectedQuote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-bold text-brand-900">{selectedQuote.id}</h3>
                              {selectedQuote.status === 'Approved' ? (
                                  <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 uppercase flex items-center gap-1"><Check size={10}/> Convertida</span>
                              ) : (
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 uppercase">Borrador</span>
                              )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon size={12}/> {new Date(selectedQuote.date).toLocaleDateString()}
                          </p>
                      </div>
                      <button onClick={() => setSelectedQuote(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                          <div className="md:col-span-2 p-6 space-y-6 border-b md:border-b-0 md:border-r border-gray-100">
                              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <div className="w-12 h-12 rounded-full bg-white text-brand-900 flex items-center justify-center shadow-sm font-bold text-xl">{selectedQuote.clientName.charAt(0)}</div>
                                  <div>
                                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cliente</p>
                                      <p className="font-bold text-gray-900 text-lg">{selectedQuote.clientName}</p>
                                      {selectedQuote.clientEmail && <p className="text-sm text-gray-500">{selectedQuote.clientEmail}</p>}
                                  </div>
                              </div>

                              <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase mb-3 border-b border-gray-100 pb-1">Detalle de Ítems</p>
                                  <div className="space-y-3">
                                      {selectedQuote.items?.map((item, idx) => (
                                          <div key={idx} className="flex justify-between items-center text-sm p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                              <div className="flex items-center gap-3">
                                                  <span className="font-bold text-brand-900 bg-brand-50 px-2 py-1 rounded text-xs">{item.quantity}x</span> 
                                                  <span className="text-gray-700 font-medium">{item.description}</span>
                                              </div>
                                              <span className="font-bold text-gray-900">{formatCurrency(item.total, settings)}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="md:col-span-1 bg-gray-50/50 p-6 flex flex-col gap-6">
                              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                  <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(selectedQuote.subtotal, settings)}</span></div>
                                  {selectedQuote.discount > 0 && <div className="flex justify-between text-sm text-red-500"><span>Descuento</span><span>-{formatCurrency(selectedQuote.subtotal * (selectedQuote.discount/100), settings)}</span></div>}
                                  {selectedQuote.tax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Impuesto</span><span>{formatCurrency(selectedQuote.tax, settings)}</span></div>}
                                  <div className="flex justify-between text-xl font-black text-brand-900 border-t border-gray-200 pt-3 mt-1"><span>Total</span><span>{formatCurrency(selectedQuote.total, settings)}</span></div>
                              </div>

                              <div className="flex-1"></div>

                              <div className="space-y-3">
                                  {selectedQuote.status !== 'Approved' ? (
                                      <button onClick={() => handleConvertToSale(selectedQuote)} disabled={isConverting} className="w-full py-3.5 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all min-h-[48px]">
                                          {isConverting ? <RefreshCw className="animate-spin" size={20}/> : <ShoppingCart size={20}/>} Convertir a Venta
                                      </button>
                                  ) : (
                                      <div className="w-full py-3 bg-green-100 text-green-700 border border-green-200 rounded-xl font-bold flex items-center justify-center gap-2 opacity-80 cursor-default min-h-[48px]">
                                          <Check size={20}/> Venta Registrada
                                      </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={(e) => handlePreview(selectedQuote, e)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors min-h-[48px]">
                                          <Eye size={18}/> Vista PDF
                                      </button>
                                      <button onClick={(e) => handleDirectAction(selectedQuote, 'print', e)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors min-h-[48px]">
                                          <Printer size={18}/> Imprimir
                                      </button>
                                      <button onClick={(e) => { setIsShareModalOpen(true); setShareQuote(selectedQuote); }} className="col-span-2 flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl font-bold hover:bg-green-100 transition-colors min-h-[48px]">
                                          <Share2 size={18}/> Compartir
                                      </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                                      {selectedQuote.status !== 'Approved' ? (
                                          <button onClick={(e) => openEdit(selectedQuote, e)} className="flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
                                              <Edit3 size={16}/> Editar
                                          </button>
                                      ) : <span className="text-center text-gray-300 text-sm py-2">No editable</span>}
                                      
                                      {canDelete ? (
                                          <button onClick={(e) => handleDelete(selectedQuote.id, e)} className="flex items-center justify-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors min-h-[44px]">
                                              <Trash2 size={16}/> Eliminar
                                          </button>
                                      ) : <span className="text-center text-gray-300 text-sm py-2">No borrable</span>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Modals remain identical, logic updated above) ... */}
      
      {modalType === 'preview' && pdfPreview && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-900">Vista Previa</h3>
                        <div className="flex gap-2">
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

      {isShareModalOpen && shareQuote && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200 mx-4">
                  <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20}/></button>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-brand-900"/> Compartir Cotización</h3>
                  <div className="space-y-3">
                      <button onClick={() => handleShareWhatsApp(shareQuote)} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]">Enviar por WhatsApp</button>
                      <button onClick={handleCopyLink} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]"><Copy size={18}/> Copiar Enlace</button>
                  </div>
              </div>
          </div>
      )}
      
      {isClientModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md h-[450px] flex flex-col shadow-2xl relative overflow-hidden mx-4">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">{clientSearchMode ? 'Buscar Cliente' : 'Nuevo Cliente Rápido'}</h3>
                      <button onClick={() => setIsClientModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500"><X size={20}/></button>
                  </div>
                  {clientSearchMode ? (
                      <div className="flex flex-col h-full">
                          <div className="p-4 border-b border-gray-100 flex gap-2">
                              <div className="relative flex-1">
                                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                  <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 text-gray-900 bg-white" onChange={(e) => setClientSearch(e.target.value)} />
                              </div>
                              <button onClick={() => setClientSearchMode(false)} className="px-3 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1 min-h-[40px]"><Plus size={16}/> Nuevo</button>
                          </div>
                          <div className="p-4 flex-1 overflow-y-auto">
                              {isLoadingData && availableClients.length === 0 && (
                                   <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-brand-900" /></div>
                              )}
                              {filteredClients.map(c => (
                                  <div key={c.id} onClick={() => handleSelectClient(c)} className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded-lg min-h-[48px] flex flex-col justify-center">
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
                              <button onClick={() => setClientSearchMode(true)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 min-h-[44px]">Cancelar</button>
                              <button onClick={handleQuickCreateClient} className="flex-1 py-2 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 min-h-[44px]">Crear y Usar</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {isCatalogModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 mx-4 overflow-hidden border border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
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

                  <div className="flex-1 overflow-y-auto bg-white p-0">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6 md:p-8 space-y-8">
                <form id="quote-form" onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                            <div className="flex gap-2 relative">
                                <input required className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-500" placeholder="Cliente" value={newQuote.clientName} onChange={e => setNewQuote({...newQuote, clientName: e.target.value})} />
                                <button type="button" onClick={() => { setClientSearchMode(true); setIsClientModalOpen(true); }} className="px-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 border border-brand-900 shadow-md flex items-center justify-center min-h-[44px] min-w-[44px]"><Search size={18}/></button>
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
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={handleCancelEdit} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 bg-white font-medium min-h-[48px]">Cancelar</button>
                <button form="quote-form" type="submit" disabled={isSaving} className="px-6 py-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[48px]">
                    {isSaving ? <RefreshCw className="animate-spin" size={16}/> : null} {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};