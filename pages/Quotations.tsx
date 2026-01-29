import React, { useState, useRef, useEffect } from 'react';
import { FileText, Search, Plus, Trash2, X, Edit3, Package, Download, RefreshCw, Share2, Copy, ExternalLink, Link as LinkIcon, DollarSign, Printer, Calendar as CalendarIcon, ChevronDown, Check, Eye, ShoppingCart, Lock } from 'lucide-react';
import { Quote, QuoteItem, AppSettings, Client, InventoryItem, User, AuditLog, Sale } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (amount: number, settings: AppSettings) => {
    const val = amount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const getCategoryColor = (category: string) => {
    const colors = [
        'bg-blue-50 text-blue-700 border-blue-100',
        'bg-purple-50 text-purple-700 border-purple-100',
        'bg-pink-50 text-pink-700 border-pink-100',
        'bg-orange-50 text-orange-700 border-orange-100',
        'bg-teal-50 text-teal-700 border-teal-100',
        'bg-indigo-50 text-indigo-700 border-indigo-100',
        'bg-rose-50 text-rose-700 border-rose-100',
        'bg-cyan-50 text-cyan-700 border-cyan-100',
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// --- NUMBER TO WORDS CONVERTER (SPANISH) ---
// (Functions Miles, Millones, etc. remain the same, kept for consistency)
const Unidades = (num: number) => {
    switch (num) {
        case 1: return "UN";
        case 2: return "DOS";
        case 3: return "TRES";
        case 4: return "CUATRO";
        case 5: return "CINCO";
        case 6: return "SEIS";
        case 7: return "SIETE";
        case 8: return "OCHO";
        case 9: return "NUEVE";
        default: return "";
    }
};

const Decenas = (num: number) => {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
        case 1:
            switch (unidad) {
                case 0: return "DIEZ";
                case 1: return "ONCE";
                case 2: return "DOCE";
                case 3: return "TRECE";
                case 4: return "CATORCE";
                case 5: return "QUINCE";
                default: return "DIECI" + Unidades(unidad);
            }
        case 2:
            switch (unidad) {
                case 0: return "VEINTE";
                default: return "VEINTI" + Unidades(unidad);
            }
        case 3: return DecenasY("TREINTA", unidad);
        case 4: return DecenasY("CUARENTA", unidad);
        case 5: return DecenasY("CINCUENTA", unidad);
        case 6: return DecenasY("SESENTA", unidad);
        case 7: return DecenasY("SETENTA", unidad);
        case 8: return DecenasY("OCHENTA", unidad);
        case 9: return DecenasY("NOVENTA", unidad);
        case 0: return Unidades(unidad);
        default: return "";
    }
};

const DecenasY = (strSin: string, numUnidades: number) => {
    if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
    return strSin;
};

const Centenas = (num: number) => {
    const centenas = Math.floor(num / 100);
    const decenas = num - (centenas * 100);
    switch (centenas) {
        case 1:
            if (decenas > 0) return "CIENTO " + Decenas(decenas);
            return "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decenas);
        case 3: return "TRESCIENTOS " + Decenas(decenas);
        case 4: return "CUATROCIENTOS " + Decenas(decenas);
        case 5: return "QUINIENTOS " + Decenas(decenas);
        case 6: return "SEISCIENTOS " + Decenas(decenas);
        case 7: return "SETECIENTOS " + Decenas(decenas);
        case 8: return "OCHOCIENTOS " + Decenas(decenas);
        case 9: return "NOVECIENTOS " + Decenas(decenas);
        default: return Decenas(decenas);
    }
};

const Seccion = (num: number, divisor: number, strSingular: string, strPlural: string) => {
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    let letras = "";
    if (cientos > 0) {
        if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
        else letras = strSingular;
    }
    if (resto > 0) letras += "";
    return letras;
};

const Miles = (num: number) => {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
    const strCentenas = Centenas(resto);
    if (strMiles === "") return strCentenas;
    return strMiles + " " + strCentenas;
};

const Millones = (num: number) => {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMillones = Seccion(num, divisor, "UN MILLON", "MILLONES");
    const strMiles = Miles(resto);
    if (strMillones === "") return strMiles;
    return strMillones + " " + strMiles;
};

const convertNumberToWordsEs = (amount: number, currencyName: string) => {
    const data = {
        entero: Math.floor(amount),
    };
    const letras = data.entero === 0 ? "CERO" : Millones(data.entero);
    return `${letras} 00/100 ${currencyName.toUpperCase()}`;
};
// ---------------------------------------------

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

const logAuditAction = async (action: 'Delete' | 'Update' | 'Create', description: string, user: User, metadata?: string) => {
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

    try {
        await setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs });
    } catch(e) { console.error("Audit Error", e); }
};

export const Quotations = () => {
  const navigate = useNavigate();
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
  const [modalType, setModalType] = useState<'none' | 'preview'>('none');
  
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

  const saveQuotes = async (newQuotes: Quote[]) => {
      setQuotes(newQuotes);
      localStorage.setItem('crm_quotes', JSON.stringify(newQuotes));
      try {
          await setDoc(doc(db, 'crm_data', 'quotes'), { list: newQuotes });
      } catch(e) {
          console.error("Error syncing quotes", e);
      }
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
              const docSnap = await getDoc(doc(db, 'crm_data', 'quotes'));
              if(docSnap.exists()) {
                  const cloudQuotes = docSnap.data().list;
                  setQuotes(cloudQuotes);
                  localStorage.setItem('crm_quotes', JSON.stringify(cloudQuotes));
              }
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
  };

  // --- STRICT DELETE HANDLER ---
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      if (currentUser?.role !== 'Admin') {
          alert('ACCESO DENEGADO: Solo el administrador puede eliminar cotizaciones.');
          return;
      }
      
      if (window.confirm('ADVERTENCIA: ¿Eliminar esta cotización permanentemente? Se registrará en auditoría.')) {
          const qToDelete = quotes.find(q => q.id === id);
          const updatedQuotes = quotes.filter(q => q.id !== id);
          
          setQuotes(updatedQuotes);
          localStorage.setItem('crm_quotes', JSON.stringify(updatedQuotes));
          
          try {
              await setDoc(doc(db, 'crm_data', 'quotes'), { list: updatedQuotes });
              
              if (currentUser && qToDelete) {
                  await logAuditAction('Delete', `Eliminó cotización ${id}`, currentUser, `Cliente: ${qToDelete.clientName}, Total: ${qToDelete.total}`);
              }
          } catch(err) {
              console.error("Cloud delete failed", err);
          }
      }
  };

  // --- PDF Logic ---
  useEffect(() => {
      if (pdfActionData && printRef.current) {
          setTimeout(() => {
              html2canvas(printRef.current!, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  
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
      e?.preventDefault();
      e?.stopPropagation();
      setPdfActionData({ data: quote, action });
  };

  const openShareModal = (quote: Quote) => {
      setShareQuote(quote);
      setIsShareModalOpen(true);
  };

  // --- WHATSAPP FIXED TEXT ---
  const handleShareWhatsApp = (quote: Quote, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      const publicLink = `${baseUrl}#/view/quote/${quote.id}`;
      
      const itemsList = quote.items.map(i => `- ${i.quantity}x ${i.description}`).join('\n');

      const text = `Le envío la Cotización ${quote.id}\n\nResumen:\n${itemsList}\n\nTotal: ${formatCurrency(quote.total, settings)}\n\nPuede verla y descargarla en PDF aquí:\n${publicLink}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePreview = (quote: Quote, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setPdfPreview(quote);
      setModalType('preview');
  }

  const handleCopyLink = () => {
      if (!shareQuote) return;
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) {
          baseUrl = baseUrl.replace('blob:', '');
      }
      const link = `${baseUrl}#/view/quote/${shareQuote.id}`;
      navigator.clipboard.writeText(link);
      alert('Enlace copiado al portapapeles');
  };

  // --- NEW HANDLERS START ---
  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Filter out empty rows
      const cleanItems = (newQuote.items || []).filter(i => i.description.trim() !== '' || i.total > 0);

      const finalQuote: Quote = {
          id: editingId || `COT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`,
          clientName: newQuote.clientName || 'Cliente General',
          clientEmail: newQuote.clientEmail,
          date: newQuote.date || new Date().toISOString(),
          validUntil: newQuote.validUntil || new Date().toISOString(),
          items: cleanItems,
          subtotal: newQuote.subtotal || 0,
          discount: newQuote.discount || 0,
          tax: newQuote.tax || 0,
          total: newQuote.total || 0,
          status: (newQuote.status as any) || 'Draft',
          notes: newQuote.notes,
          taxEnabled: taxEnabled,
          termsAndConditions: newQuote.termsAndConditions
      };

      const updatedQuotes = editingId 
          ? quotes.map(q => q.id === editingId ? finalQuote : q)
          : [finalQuote, ...quotes];

      saveQuotes(updatedQuotes);
      
      if (currentUser) {
          logAuditAction(editingId ? 'Update' : 'Create', `${editingId ? 'Actualizó' : 'Creó'} cotización ${finalQuote.id}`, currentUser, `Total: ${finalQuote.total}`);
      }
      
      setIsModalOpen(false);
  };

  const handleSelectClient = (client: Client) => {
      setNewQuote(prev => ({
          ...prev,
          clientName: client.name,
          clientEmail: client.email
      }));
      setIsClientModalOpen(false);
      setClientSearchMode(true);
  };

  const handleQuickCreateClient = async () => {
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
      
      try {
          await setDoc(doc(db, 'crm_data', 'clients'), { list: updatedClients });
      } catch(e) { console.error("Error creating quick client", e); }

      setNewQuote(prev => ({ ...prev, clientName: newClient.name }));
      setIsClientModalOpen(false);
      setNewClientName('');
  };

  // --- CONVERT TO SALE LOGIC (FIXED) ---
  const handleConvertToSale = async (quote: Quote) => {
      if (quote.items.length === 0) { alert('La cotización no tiene ítems.'); return; }
      if (quote.status === 'Approved') { alert('Esta cotización ya fue convertida.'); return; }

      // PRE-CHECK STOCK
      const missingStockItems: string[] = [];
      quote.items.forEach(item => {
          const invItem = availableInventory.find(i => i.name === item.description && i.type === 'Product');
          if (invItem && invItem.quantity < item.quantity) {
              missingStockItems.push(`${item.description} (Stock: ${invItem.quantity}, Req: ${item.quantity})`);
          }
      });

      if (missingStockItems.length > 0) {
          if (!window.confirm(`ADVERTENCIA: Stock insuficiente para:\n\n${missingStockItems.join('\n')}\n\n¿Continuar y dejar stock negativo?`)) {
              return;
          }
      } else {
          if (!window.confirm(`¿Convertir cotización ${quote.id} en Venta confirmada?\n\nSe descontará inventario y se bloqueará la cotización.`)) return;
      }

      // 1. Create Sale Object
      const newSaleId = `VTA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const newSale: Sale = {
          id: newSaleId,
          clientId: availableClients.find(c => c.name === quote.clientName)?.id || 'gen',
          clientName: quote.clientName,
          date: new Date().toISOString(),
          items: quote.items,
          subtotal: quote.subtotal,
          discount: quote.discount,
          tax: quote.tax,
          total: quote.total,
          amountPaid: quote.total, // Assume full payment for conversion simplicity
          balance: 0,
          paymentStatus: 'Paid',
          paymentMethod: 'Cash',
          notes: `Generado desde Cotización ${quote.id}`
      };

      try {
          // 2. Load and Update Sales
          const salesSnap = await getDoc(doc(db, 'crm_data', 'sales_history'));
          let currentSales: Sale[] = salesSnap.exists() ? salesSnap.data().list : [];
          const updatedSales = [newSale, ...currentSales];
          await setDoc(doc(db, 'crm_data', 'sales_history'), { list: updatedSales });
          localStorage.setItem('crm_sales_history', JSON.stringify(updatedSales));

          // 3. Update Inventory
          const inventoryUpdates = [...availableInventory];
          let inventoryChanged = false;
          newSale.items.forEach(saleItem => {
              const productIndex = inventoryUpdates.findIndex(i => i.name === saleItem.description);
              if (productIndex > -1 && inventoryUpdates[productIndex].type === 'Product') {
                  inventoryUpdates[productIndex].quantity -= saleItem.quantity;
                  // Status update
                  if (inventoryUpdates[productIndex].quantity <= 0) inventoryUpdates[productIndex].status = 'Critical';
                  else if (inventoryUpdates[productIndex].quantity <= (inventoryUpdates[productIndex].minStock || 5)) inventoryUpdates[productIndex].status = 'Low Stock';
                  else inventoryUpdates[productIndex].status = 'In Stock';
                  
                  inventoryChanged = true;
              }
          });

          if (inventoryChanged) {
              setAvailableInventory(inventoryUpdates);
              localStorage.setItem('crm_inventory', JSON.stringify(inventoryUpdates));
              await setDoc(doc(db, 'crm_data', 'inventory'), { list: inventoryUpdates });
          }

          // 4. Update Quote Status
          const updatedQuotes = quotes.map(q => q.id === quote.id ? { ...q, status: 'Approved' as const } : q);
          setQuotes(updatedQuotes);
          await saveQuotes(updatedQuotes);

          alert('Conversión exitosa.');
          navigate('/sales'); // Redirect to Sales

      } catch (e) {
          console.error("Conversion failed", e);
          alert('Error al convertir. Verifica tu conexión.');
      }
  };
  // --- NEW HANDLERS END ---

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

  // Use clientSearch state for clients to prevent collision
  const filteredClients = availableClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category)))];

  // Render Helper for PDF (Same as before)
  const renderQuoteContent = (quoteData: Quote) => (
      <div className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans leading-normal shadow-2xl" style={{padding:0}}>
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
                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{quoteData.id.replace('COT-', '')}</span></div>
                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">EMISIÓN</span> <span className="w-32 whitespace-nowrap">{new Date(quoteData.date).toLocaleDateString()} {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}</span></div>
                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-32">VÁLIDO HASTA</span> <span className="w-32">{new Date(quoteData.validUntil).toLocaleDateString()}</span></div>
                </div>
            </div>
        </div>
        <div className="px-12 pt-12">
            <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                <div className="w-[45%]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Cotizado a:</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{quoteData.clientName}</h3>
                    {(() => {
                        const client = getClientDetails(quoteData.clientName);
                        return (
                            <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                                {client?.company && <div className="font-medium text-gray-600">{client.company}</div>}
                                {client?.phone && <div>{client.phone}</div>}
                                {quoteData.clientEmail && <div>{quoteData.clientEmail}</div>}
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
                    {quoteData.items.map((item, idx) => (
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
                        <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">El monto de:</h4>
                        <div className="text-sm font-bold text-gray-700 italic border-l-4 border-gray-300 pl-3 py-1">
                            {convertNumberToWordsEs(quoteData.total, settings.currencyName)}
                        </div>
                    </div>
                    
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
                            {quoteData.termsAndConditions || settings.termsAndConditions || 'Sin términos definidos.'}
                        </div>
                    </div>
                </div>
                <div className="w-[40%] flex flex-col items-end">
                    <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                        <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(quoteData.subtotal, settings)}</span></div>
                        {quoteData.discount > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>Descuento ({quoteData.discount}%)</span><span>-{formatCurrency(quoteData.subtotal * (quoteData.discount/100), settings)}</span></div>)}
                        {quoteData.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(quoteData.tax, settings)}</span></div>)}
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(quoteData.total, settings)}</span></div>
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
  );

  return (
    <div className="space-y-6 relative h-full pb-safe-area">
      {/* Hidden Container for Background Printing */}
      {pdfActionData && (
          <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
              <div ref={printRef}>
                  {renderQuoteContent(pdfActionData.data)}
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Administra tus propuestas comerciales</p>
        </div>
        <button onClick={() => { setEditingId(null); setNewQuote({ clientName: '', date: new Date().toISOString().split('T')[0], validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Draft', items: [], subtotal: 0, discount: 0, tax: 0, total: 0, termsAndConditions: settings.termsAndConditions }); setTaxEnabled(false); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg active:scale-95 transition-transform">
            <Plus size={16} /> <span className="hidden sm:inline">Nueva Cotización</span>
        </button>
      </div>

      {/* Quote List */}
      <div className="flex-1">
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Cliente</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wide text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 text-sm font-medium text-brand-900 flex items-center gap-2">
                            {quote.id}
                            {quote.status === 'Approved' && <Check size={14} className="text-green-500" title="Aprobada / Convertida"/>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{quote.clientName}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(quote.total, settings)}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                            <div className="flex gap-1 relative z-50">
                                {quote.status !== 'Approved' ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleConvertToSale(quote); }} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Convertir a Venta"><ShoppingCart size={18}/></button>
                                ) : (
                                    <span className="p-2 text-gray-300 cursor-not-allowed"><Lock size={18}/></span>
                                )}
                                <button onClick={(e) => handlePreview(quote, e)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Vista Previa"><Eye size={18} /></button>
                                <button onClick={(e) => handleShareWhatsApp(quote, e)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Compartir"><Share2 size={18}/></button>
                                <button onClick={(e) => handleDirectAction(quote, 'download', e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Descargar"><Download size={18} /></button>
                                <button onClick={(e) => handleDirectAction(quote, 'print', e)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Imprimir"><Printer size={18} /></button>
                                {quote.status !== 'Approved' ? (
                                    <button onClick={(e) => openEdit(quote, e)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar"><Edit3 size={18} /></button>
                                ) : (
                                    <span className="p-2 text-gray-300 cursor-not-allowed"><Edit3 size={18}/></span>
                                )}
                                {currentUser?.role === 'Admin' && (
                                    <button 
                                        onClick={(e) => handleDelete(quote.id, e)} 
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors relative z-50" 
                                        title="Eliminar (Auditado)"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
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
                  <div key={quote.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform relative">
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className="font-bold text-brand-900 text-sm flex items-center gap-2">
                                  {quote.id}
                                  {quote.status === 'Approved' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Venta</span>}
                              </h4>
                              <p className="text-sm text-gray-700 font-medium">{quote.clientName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{quote.date ? new Date(quote.date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="font-bold text-lg text-gray-900">{formatCurrency(quote.total, settings)}</span>
                          <div className="flex gap-2 relative z-50">
                              {quote.status !== 'Approved' && <button onClick={(e) => { e.stopPropagation(); handleConvertToSale(quote); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShoppingCart size={16}/></button>}
                              <button onClick={(e) => handlePreview(quote, e)} className="p-2 bg-gray-50 text-gray-600 rounded-lg"><Eye size={16}/></button>
                              <button onClick={(e) => handleShareWhatsApp(quote, e)} className="p-2 bg-green-50 text-green-600 rounded-lg"><Share2 size={16}/></button>
                              <button onClick={(e) => handleDirectAction(quote, 'print', e)} className="p-2 bg-gray-50 text-gray-600 rounded-lg"><Printer size={16}/></button>
                              {currentUser?.role === 'Admin' && (
                                  <button onClick={(e) => handleDelete(quote.id, e)} className="p-2 bg-red-50 text-red-600 rounded-lg relative z-50"><Trash2 size={16}/></button>
                              )}
                          </div>
                      </div>
                  </div>
              ))}
              {quotes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No hay cotizaciones.</div>}
          </div>
      </div>

      {/* PREVIEW MODAL */}
      {modalType === 'preview' && pdfPreview && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-900">Vista Previa</h3>
                        <div className="flex gap-2">
                             <button onClick={() => handleDirectAction(pdfPreview, 'download')} className="px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 flex items-center gap-2"><Download size={16}/> Descargar</button>
                             <button onClick={() => setModalType('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center">
                        <div className="shadow-2xl origin-top transform scale-90 md:scale-100">
                            {renderQuoteContent(pdfPreview)}
                        </div>
                    </div>
                </div>
            </div>
      )}

      {/* ... (Modals omitted for brevity, they remain unchanged) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          {/* ... Modal Content ... */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-6 md:p-8 space-y-8">
                <form id="quote-form" onSubmit={handleSave} className="space-y-8">
                    {/* ... Form Content ... */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                            <div className="flex gap-2 relative">
                                <input required className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-500" placeholder="Cliente" value={newQuote.clientName} onChange={e => setNewQuote({...newQuote, clientName: e.target.value})} />
                                <button type="button" onClick={() => { setClientSearchMode(true); setIsClientModalOpen(true); }} className="px-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 border border-brand-900 shadow-md flex items-center justify-center"><Search size={18}/></button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Emisión</label>
                            <div className="relative">
                                <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-900 appearance-none" value={newQuote.date} onChange={e => setNewQuote({...newQuote, date: e.target.value})} />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Válido Hasta</label>
                            <div className="relative">
                                <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-900 appearance-none" value={newQuote.validUntil} onChange={e => setNewQuote({...newQuote, validUntil: e.target.value})} />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                            </div>
                        </div>
                    </div>
                    
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Términos y Condiciones Específicos</label>
                            <textarea className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-900 min-h-[150px] resize-y bg-white text-gray-700" placeholder="Opcional." value={newQuote.termsAndConditions} onChange={(e) => setNewQuote({...newQuote, termsAndConditions: e.target.value})} />
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

      {/* Share & Client & Catalog Modals */}
      {isShareModalOpen && shareQuote && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200 mx-4">
                  <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-brand-900"/> Compartir Cotización</h3>
                  <div className="space-y-3">
                      <button onClick={handleShareWhatsApp} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">Enviar por WhatsApp</button>
                      <button onClick={handleCopyLink} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"><Copy size={18}/> Copiar Enlace</button>
                  </div>
              </div>
          </div>
      )}
      
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
                                  <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 text-gray-900 bg-white" onChange={(e) => setClientSearch(e.target.value)} />
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

      {isCatalogModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 mx-4 overflow-hidden border border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                      <div><h3 className="font-bold text-xl text-gray-900">Catálogo</h3><p className="text-sm text-gray-500">Selecciona ítems para añadir</p></div>
                      <button onClick={() => setIsCatalogModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"><X size={24}/></button>
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
                                          <button onClick={() => addItemFromCatalog(item)} className="flex flex-col items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-lg text-gray-900 transition-all min-w-[100px]"><span className="text-[10px] font-bold text-gray-500 uppercase">Unitario</span><span className="text-sm font-bold">{formatCurrency(item.price, settings)}</span></button>
                                          {item.priceDozen && item.priceDozen > 0 && <button onClick={() => addItemFromCatalog(item, item.priceDozen)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-gray-700 transition-all min-w-[100px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista A</span><span className="text-sm font-bold text-blue-700">{formatCurrency(item.priceDozen, settings)}</span></button>}
                                          {item.priceBox && item.priceBox > 0 && <button onClick={() => addItemFromCatalog(item, item.priceBox)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-lg text-gray-700 transition-all min-w-[100px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista B</span><span className="text-sm font-bold text-orange-700">{formatCurrency(item.priceBox, settings)}</span></button>}
                                          {item.priceWholesale && item.priceWholesale > 0 && <button onClick={() => addItemFromCatalog(item, item.priceWholesale)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-gray-700 transition-all min-w-[100px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista C</span><span className="text-sm font-bold text-purple-700">{formatCurrency(item.priceWholesale, settings)}</span></button>}
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
    </div>
  );
};