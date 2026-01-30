import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, X, Package, Check, Printer, User, CreditCard, RefreshCw, Edit3, Download, Share2, Copy, Calendar, DollarSign, ChevronRight, Eye, ChevronDown, ShoppingBag, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { Sale, QuoteItem, AppSettings, InventoryItem, Client, User as UserType, AuditLog } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#1e293b',
    pdfHeaderColor: '#1e293b',
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

const formatCurrency = (amount: number, settings: AppSettings) => {
    const safeAmount = Number(amount) || 0;
    const val = safeAmount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

// --- NUMBER TO WORDS CONVERTER (SPANISH) ---
// (Functions Unidades, Decenas, etc. kept same for brevity, assuming existing logic is fine)
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
    // Hardcoded 00/100 as requested
    return `${letras} 00/100 ${currencyName.toUpperCase()}`;
};
// ---------------------------------------------

const logAuditAction = (action: 'Delete' | 'Update' | 'Create', description: string, user: UserType, metadata?: string) => {
    const log: AuditLog = {
        id: Date.now().toString(),
        action,
        module: 'Sales',
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

    setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs }).catch(()=>{});
};

// Toggle Switch Component for IVA
const ToggleSwitch = ({ enabled, onChange, label }: { enabled: boolean, onChange: (val: boolean) => void, label: string }) => (
    <div onClick={() => onChange(!enabled)} className="flex items-center gap-3 cursor-pointer group select-none">
        <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out relative ${enabled ? 'bg-brand-900' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <span className={`text-sm font-medium transition-colors ${enabled ? 'text-brand-900' : 'text-gray-500'}`}>{label}</span>
    </div>
);

// --- SCALABILITY HELPER: YEARLY SHARDING ---
const getSalesDocId = (year: string | number) => `sales_${year}`;

export const Sales = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
      const saved = localStorage.getItem('crm_active_user');
      return saved ? JSON.parse(saved) : null;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
      const saved = localStorage.getItem('crm_sales_history');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('crm_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [view, setView] = useState<'list' | 'create'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Share Modal State
  const [shareSale, setShareSale] = useState<Sale | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [modalType, setModalType] = useState<'none' | 'client' | 'catalog' | 'preview'>('none');
  const [modalSearch, setModalSearch] = useState('');
  const [catalogTab, setCatalogTab] = useState<'All' | 'Service' | 'Product'>('All');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');

  const [clientData, setClientData] = useState<Partial<Client>>({ name: '', company: '', nit: '', email: '', phone: '', address: '', notes: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [newSale, setNewSale] = useState<Partial<Sale>>({
      items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash'
  });
  const [taxEnabled, setTaxEnabled] = useState(false);
  
  const [pdfPreview, setPdfPreview] = useState<Sale | null>(null);
  const [pdfActionData, setPdfActionData] = useState<{data: Sale, action: 'print'|'download'} | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Permisos robustos
  const canDelete = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('delete_sales');

  useEffect(() => {
      const loadData = async () => {
          setIsLoadingData(true);
          const s = localStorage.getItem('crm_settings');
          if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) });

          // Load local state
          let localClients = localStorage.getItem('crm_clients');
          if (localClients) setAvailableClients(JSON.parse(localClients));
          let localInv = localStorage.getItem('crm_inventory');
          if (localInv) setAvailableInventory(JSON.parse(localInv));

          try {
              // Parallel Cloud Fetch
              const currentYear = new Date().getFullYear();
              const prevYear = currentYear - 1;

              // Architecture Fix: Load 'sales_history' (legacy) + 'sales_2024' + 'sales_2025'
              const [legacySnap, currentYearSnap, prevYearSnap, clientsSnap, invSnap] = await Promise.all([
                  getDoc(doc(db, 'crm_data', 'sales_history')),
                  getDoc(doc(db, 'crm_data', getSalesDocId(currentYear))),
                  getDoc(doc(db, 'crm_data', getSalesDocId(prevYear))),
                  getDoc(doc(db, 'crm_data', 'clients')),
                  getDoc(doc(db, 'crm_data', 'inventory'))
              ]);

              let allSalesLoaded: Sale[] = [];
              if (legacySnap.exists()) allSalesLoaded = [...allSalesLoaded, ...(legacySnap.data().list || [])];
              if (prevYearSnap.exists()) allSalesLoaded = [...allSalesLoaded, ...(prevYearSnap.data().list || [])];
              if (currentYearSnap.exists()) allSalesLoaded = [...allSalesLoaded, ...(currentYearSnap.data().list || [])];

              // Dedupe and Sort
              const uniqueSales = Array.from(new Map(allSalesLoaded.map(item => [item.id, item])).values());
              // Sort desc
              uniqueSales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              setSales(uniqueSales);
              localStorage.setItem('crm_sales_history', JSON.stringify(uniqueSales));

              if(clientsSnap.exists()) {
                  setAvailableClients(clientsSnap.data().list || []);
                  localStorage.setItem('crm_clients', JSON.stringify(clientsSnap.data().list || []));
              }
              if(invSnap.exists()) {
                  setAvailableInventory(invSnap.data().list || []);
                  localStorage.setItem('crm_inventory', JSON.stringify(invSnap.data().list || []));
              }
          } catch(e) {
              console.error("Data sync error:", e);
          }
          setIsLoadingData(false);
      };
      loadData();
  }, []);

  // --- SCALABLE SAVE FUNCTION ---
  const syncSalesToCloud = (updatedAllSales: Sale[]) => {
      // 1. Update UI & Local
      setSales(updatedAllSales);
      localStorage.setItem('crm_sales_history', JSON.stringify(updatedAllSales));
      
      // 2. Group by Year
      const salesByYear: Record<string, Sale[]> = {};
      
      updatedAllSales.forEach(sale => {
          const year = new Date(sale.date).getFullYear();
          if (!salesByYear[year]) salesByYear[year] = [];
          salesByYear[year].push(sale);
      });

      // 3. Fire and Forget Saves per Year Document
      Object.keys(salesByYear).forEach(year => {
          const docId = getSalesDocId(year);
          const yearSales = salesByYear[year];
          setDoc(doc(db, 'crm_data', docId), { list: yearSales }).catch(e => console.warn(`Cloud sync failed for ${docId}`, e));
      });
  };

  // Recalculate Totals
  useEffect(() => {
      const items = newSale.items || [];
      const sub = items.reduce((acc, item) => acc + item.total, 0);
      const discountPercentage = newSale.discount || 0;
      const discountAmount = sub * (discountPercentage / 100);
      const taxableAmount = sub - discountAmount;
      const taxAmount = taxEnabled ? taxableAmount * (settings.taxRate / 100) : 0;
      const total = taxableAmount + taxAmount;
      
      setNewSale(prev => ({ 
          ...prev, 
          subtotal: sub, 
          tax: taxAmount, 
          total: total,
          amountPaid: prev.paymentStatus === 'Paid' ? total : prev.amountPaid 
      }));
  }, [newSale.items, taxEnabled, settings.taxRate, newSale.paymentStatus, newSale.discount]);

  // ... (Handlers for Items, Clients, Inventory - No changes needed here, logic is local) ...
  const handleAddItem = (item: InventoryItem, priceOverride?: number) => {
      const priceToUse = priceOverride !== undefined ? priceOverride : item.price;
      const existingItemIndex = newSale.items?.findIndex(i => i.description === item.name && i.unitPrice === priceToUse);
      if (existingItemIndex !== undefined && existingItemIndex >= 0) {
          const updatedItems = [...(newSale.items || [])];
          updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + 1,
              total: (updatedItems[existingItemIndex].quantity + 1) * updatedItems[existingItemIndex].unitPrice
          };
          setNewSale({ ...newSale, items: updatedItems });
      } else {
          const newItem: QuoteItem = {
              id: Math.random().toString(36).substr(2, 9),
              description: item.name,
              quantity: 1,
              unitPrice: priceToUse,
              total: priceToUse
          };
          setNewSale({ ...newSale, items: [...(newSale.items || []), newItem] });
      }
      setModalType('none');
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
      const updatedItems = [...(newSale.items || [])];
      const item = updatedItems[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) updatedItems.splice(index, 1);
      else updatedItems[index] = { ...item, quantity: newQty, total: newQty * item.unitPrice };
      setNewSale({ ...newSale, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
      const updatedItems = [...(newSale.items || [])];
      updatedItems.splice(index, 1);
      setNewSale({...newSale, items: updatedItems});
  };

  const handleCreateClient = () => {
      if(clientData.name && clientData.name.trim()) {
          const client: Client = {
              id: Math.random().toString(36).substr(2,9),
              name: clientData.name,
              company: clientData.company || '',
              nit: clientData.nit || '',
              email: clientData.email || '',
              phone: clientData.phone || '',
              address: clientData.address || '',
              type: 'Client',
              notes: clientData.notes || ''
          };
          const updated = [...availableClients, client];
          setAvailableClients(updated);
          localStorage.setItem('crm_clients', JSON.stringify(updated));
          setDoc(doc(db, 'crm_data', 'clients'), { list: updated }).catch(()=>{});
          setNewSale({...newSale, clientName: client.name, clientId: client.id});
          setModalType('none');
          setIsCreatingClient(false);
          setClientData({ name: '', company: '', nit: '', email: '', phone: '', address: '', notes: '' });
      } else {
          alert('El nombre es obligatorio.');
      }
  };
  
  const updateInventoryStock = (saleItems: QuoteItem[], inventoryList: InventoryItem[], reverse: boolean = false) => {
      const inventoryUpdates = [...inventoryList];
      let inventoryChanged = false;

      saleItems.forEach(saleItem => {
          const productIndex = inventoryUpdates.findIndex(i => i.name === saleItem.description);
          if (productIndex > -1 && inventoryUpdates[productIndex].type === 'Product') {
              const modifier = reverse ? 1 : -1;
              inventoryUpdates[productIndex].quantity += (saleItem.quantity * modifier);
              
              const qty = inventoryUpdates[productIndex].quantity;
              const min = inventoryUpdates[productIndex].minStock || 5;
              
              if (qty <= 0) inventoryUpdates[productIndex].status = 'Critical';
              else if (qty <= min) inventoryUpdates[productIndex].status = 'Low Stock';
              else inventoryUpdates[productIndex].status = 'In Stock';
              
              inventoryChanged = true;
          }
      });

      if (inventoryChanged) {
          setAvailableInventory(inventoryUpdates);
          localStorage.setItem('crm_inventory', JSON.stringify(inventoryUpdates));
          const cleanInv = JSON.parse(JSON.stringify(inventoryUpdates));
          setDoc(doc(db, 'crm_data', 'inventory'), { list: cleanInv }).catch(e => console.error("Inv update fail", e));
      }
  };

  const handleFinalizeSale = () => {
      if (!newSale.clientName) { alert('Seleccione un cliente.'); return; }
      if (!newSale.items || newSale.items.length === 0) { alert('Agregue productos.'); return; }

      let currentInventory = availableInventory;
      let saleId = editingId;
      if (!saleId) {
          saleId = `VTA-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;
      }

      const finalSale: Sale = {
          id: saleId,
          clientId: newSale.clientId || 'generic',
          clientName: newSale.clientName,
          date: newSale.date || new Date().toISOString(), 
          items: newSale.items,
          subtotal: newSale.subtotal || 0,
          discount: newSale.discount || 0,
          tax: newSale.tax || 0,
          total: newSale.total || 0,
          amountPaid: newSale.amountPaid || 0,
          balance: (newSale.total || 0) - (newSale.amountPaid || 0),
          paymentStatus: newSale.paymentStatus as any,
          paymentMethod: newSale.paymentMethod as any,
          notes: ''
      };
      
      if (editingId) {
          const originalSale = sales.find(s => s.id === editingId);
          if (originalSale) {
              updateInventoryStock(originalSale.items, currentInventory, true); 
          }
      }
      
      updateInventoryStock(finalSale.items, currentInventory, false);

      let updatedSales = [...sales];
      if (editingId) {
          updatedSales = sales.map(s => s.id === editingId ? finalSale : s);
          if (currentUser) logAuditAction('Update', `Modificó venta ${finalSale.id}`, currentUser, `Total: ${finalSale.total}`);
      } else {
          updatedSales = [finalSale, ...sales];
          if (currentUser) logAuditAction('Create', `Nueva venta ${finalSale.id}`, currentUser, `Cliente: ${finalSale.clientName}, Total: ${finalSale.total}`);
      }

      syncSalesToCloud(updatedSales); // Uses Scalable Saver
      setPdfPreview(finalSale);
      setModalType('preview');
      setNewSale({ items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash' });
      setEditingId(null);
      setTaxEnabled(false);
      setView('list');
      
      // If editing, return to detail view of the updated sale
      if (editingId) {
          setSelectedSale(finalSale);
      }
  };

  const handleEditSale = (sale: Sale, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setNewSale({
          clientName: sale.clientName,
          clientId: sale.clientId,
          items: JSON.parse(JSON.stringify(sale.items)), 
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus,
          subtotal: sale.subtotal,
          discount: sale.discount || 0,
          tax: sale.tax,
          total: sale.total,
          amountPaid: sale.amountPaid,
          date: sale.date 
      });
      setTaxEnabled(sale.tax > 0);
      setEditingId(sale.id);
      setView('create');
      setSelectedSale(null); // Close modal
  };

  const handleCancelEdit = () => {
      // Return to list view
      setView('list');
      // If we were editing, restore the detail view
      if (editingId) {
          const original = sales.find(s => s.id === editingId);
          if (original) setSelectedSale(original);
      }
  };

  // --- SAFE DELETE HANDLER ---
  const handleDeleteSale = (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      if (!canDelete) {
          alert("ACCESO DENEGADO: No tienes permiso para eliminar ventas.");
          return;
      }

      if (window.confirm("ADVERTENCIA: ¿Eliminar recibo permanentemente? Stock será devuelto.")) {
          try {
              const saleToDelete = sales.find(s => s.id === id);
              
              if (saleToDelete) {
                  // Attempt to return stock
                  updateInventoryStock(saleToDelete.items, availableInventory, true);
                  
                  const updatedSales = sales.filter(s => s.id !== id);
                  syncSalesToCloud(updatedSales); // Scalable delete
                  
                  setSelectedSale(null); // Close modal
                  if (currentUser) logAuditAction('Delete', `Eliminó venta ${id}`, currentUser);
              }
          } catch(err) {
              console.error("Error deleting sale", err);
              alert("Error al eliminar. Verifique conexión.");
          }
      }
  };

  // ... (PDF Logic and rest of component remains identical) ...
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
                      pdf.save(`Venta_${pdfActionData.data.id}.pdf`);
                  } else {
                      const pdfBlob = pdf.output('bloburl');
                      window.open(pdfBlob, '_blank');
                  }
                  setPdfActionData(null);
              });
          }, 500);
      }
  }, [pdfActionData]);

  const handleDirectAction = (sale: Sale, action: 'print' | 'download', e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setPdfActionData({ data: sale, action });
  };

  const handleShareWhatsApp = (saleToShare: Sale) => {
      if (!saleToShare) return;
      
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      const publicLink = `${baseUrl}#/view/sale/${saleToShare.id}`;
      
      const itemsList = saleToShare.items.map(i => `- ${i.quantity}x ${i.description}`).join('\n');

      const text = `Le envío el Recibo ${saleToShare.id}\n\nResumen:\n${itemsList}\n\nTotal: ${formatCurrency(saleToShare.total, settings)}\n\nPuede revisarlo y descargar el recibo aquí:\n${publicLink}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
      if (!shareSale) return;
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
      const publicLink = `${baseUrl}#/view/sale/${shareSale.id}`;
      navigator.clipboard.writeText(publicLink);
      setIsShareModalOpen(false);
      alert("Enlace copiado al portapapeles.");
  };

  const handlePreview = (sale: Sale, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setPdfPreview(sale); 
      setModalType('preview');
  };

  // ... (Helpers for render) ...
  const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category)))];
  const filteredCatalog = availableInventory.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(modalSearch.toLowerCase());
      const matchesTab = catalogTab === 'All' || i.type === catalogTab;
      const matchesCat = catalogCategory === 'All' || i.category === catalogCategory;
      return matchesSearch && matchesTab && matchesCat;
  });
  const filteredClients = availableClients.filter(c => c.name.toLowerCase().includes(modalSearch.toLowerCase()));

  const renderReceiptContent = (saleData: Sale) => (
      <div className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans shadow-2xl" style={{padding:0}}>
        <div className="p-10 flex justify-between items-center" style={{ backgroundColor: settings.pdfHeaderColor || settings.primaryColor || '#1e293b' }}>
            <div className="flex items-center">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} style={{ maxHeight: '80px', width: 'auto' }} alt="Logo" />
                    ) : (
                        <h1 className="text-4xl font-bold text-white tracking-widest uppercase">{settings.companyName}</h1>
                    )}
            </div>
            <div className="text-right text-white">
                <h2 className="text-5xl font-bold tracking-tight mb-2 opacity-90 leading-none">RECIBO</h2>
                <div className="text-xs font-bold opacity-80 space-y-1 uppercase tracking-wide flex flex-col items-end">
                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{saleData.id.replace('VTA-', '')}</span></div>
                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">FECHA</span> <span className="w-32 whitespace-nowrap">{new Date(saleData.date).toLocaleDateString()} {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}</span></div>
                </div>
            </div>
        </div>
        <div className="px-12 pt-12">
            <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                <div className="w-[45%]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Recibí de:</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{saleData.clientName}</h3>
                </div>
                <div className="w-[45%] text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Casa Matriz:</p>
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
                    {saleData.items?.map((item, idx) => (
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
                <div className="w-[60%] pr-8">
                    <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">El monto de:</h4>
                        <div className="text-sm font-bold text-gray-700 italic border-l-4 border-gray-300 pl-3 py-1">
                            {convertNumberToWordsEs(saleData.total, settings.currencyName)}
                        </div>
                    </div>
                    {/* Add Disclaimer */}
                    <div className="mt-8 text-xs text-gray-500 italic bg-gray-50 p-3 rounded border border-gray-100">
                        <p>Nota: Este documento no es válido para crédito fiscal.</p>
                        <p className="mt-1">¡Gracias por su preferencia!</p>
                    </div>
                </div>
                <div className="w-[35%] flex flex-col items-end">
                    <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                        <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(saleData.subtotal, settings)}</span></div>
                        {saleData.discount !== undefined && saleData.discount > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>Descuento ({saleData.discount}%)</span><span className="text-red-500">-{formatCurrency(saleData.subtotal * (saleData.discount/100), settings)}</span></div>)}
                        {saleData.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(saleData.tax, settings)}</span></div>)}
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(saleData.total, settings)}</span></div>
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
    <div className="space-y-6 h-full flex flex-col relative pb-safe-area">
        {/* Hidden Container for Background Printing */}
        {pdfActionData && (
            <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
                <div ref={printRef}>
                    {renderReceiptContent(pdfActionData.data)}
                </div>
            </div>
        )}

        {/* Header and View toggle */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ventas</h1>
                <p className="text-sm text-gray-500">Punto de venta</p>
            </div>
            {view === 'list' ? (
                <button onClick={() => { setEditingId(null); setNewSale({ items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash' }); setTaxEnabled(false); setView('create'); }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 flex items-center gap-2 shadow-lg active:scale-95 transition-transform min-h-[44px]">
                    <Plus size={18} /> <span className="hidden sm:inline">Nueva Venta</span>
                </button>
            ) : (
                <button onClick={handleCancelEdit} className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors min-h-[44px]">
                    Cancelar
                </button>
            )}
        </div>

        {view === 'list' && (
            <div className="flex-1 flex flex-col">
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID Venta</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">Estado</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Ver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sales.map(sale => (
                                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 text-sm font-bold text-brand-900">{sale.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{sale.clientName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="font-medium text-gray-900">{sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}</div>
                                            <div className="text-xs text-gray-400">{sale.date ? new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(sale.total, settings)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronDown size={18} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors -rotate-90"/>
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No hay ventas registradas.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex-1 overflow-y-auto space-y-3 pb-20">
                    {sales.map(sale => (
                        <div key={sale.id} onClick={() => setSelectedSale(sale)} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3 relative cursor-pointer overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${sale.paymentStatus === 'Paid' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            <div className="flex justify-between items-start pl-2">
                                <div>
                                    <h4 className="font-bold text-brand-900 text-sm">{sale.id}</h4>
                                    <p className="text-sm text-gray-700 font-medium">{sale.clientName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50 pl-2">
                                <span className="font-bold text-lg text-gray-900">{formatCurrency(sale.total, settings)}</span>
                                <button className="text-sm text-blue-600 font-medium hover:underline">Ver Detalles</button>
                            </div>
                        </div>
                    ))}
                    {sales.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No hay ventas.</div>}
                </div>
            </div>
        )}

        {/* ... (Create View Remains Unchanged) ... */}
        {view === 'create' && (
            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden h-full">
                {/* Left Column: Items List */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Detalle de Venta</h3>
                        <button onClick={() => setModalType('catalog')} className="text-sm bg-brand-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-800 flex items-center gap-2 transition-colors shadow-lg shadow-brand-900/20 active:scale-95 min-h-[40px]">
                            <Plus size={16} /> Agregar Ítem
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        {newSale.items && newSale.items.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3">Descripción</th>
                                        <th className="px-4 py-3 text-center w-24">Cant.</th>
                                        <th className="px-4 py-3 text-right w-32">Precio</th>
                                        <th className="px-4 py-3 text-right w-32">Total</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {newSale.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <input 
                                                    className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400 focus:text-brand-900" 
                                                    value={item.description} 
                                                    onChange={(e) => {
                                                        const updated = [...newSale.items!];
                                                        updated[idx].description = e.target.value;
                                                        setNewSale({...newSale, items: updated});
                                                    }}
                                                    placeholder="Descripción del ítem..."
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg p-1 w-fit mx-auto border border-gray-200">
                                                    <button onClick={() => handleUpdateQuantity(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-red-500 text-xs font-bold transition-all active:scale-90 min-h-[32px]">-</button>
                                                    <span className="text-sm font-bold w-6 text-center text-gray-800">{item.quantity}</span>
                                                    <button onClick={() => handleUpdateQuantity(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-green-600 text-xs font-bold transition-all active:scale-90 min-h-[32px]">+</button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent outline-none text-sm text-right text-gray-600 focus:text-brand-900 font-medium" 
                                                    value={item.unitPrice} 
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const updated = [...newSale.items!];
                                                        updated[idx].unitPrice = val;
                                                        updated[idx].total = val * updated[idx].quantity;
                                                        setNewSale({...newSale, items: updated});
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                {formatCurrency(item.total, settings)}
                                            </td>
                                            <td className="px-2 text-center">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <ShoppingBag size={40} className="opacity-20 text-gray-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">El carrito está vacío</p>
                                <p className="text-xs text-gray-400 mt-1">Agrega productos o servicios para comenzar</p>
                                <button onClick={() => setModalType('catalog')} className="mt-4 text-brand-900 font-bold text-sm hover:underline">Abrir Catálogo</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Control Panel */}
                <div className="w-full md:w-96 flex flex-col gap-6 h-full overflow-y-auto pb-20 md:pb-0">
                    {/* Client Selector */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide"><User size={16}/> Cliente</h3>
                            {newSale.clientName && (
                                <button onClick={() => setModalType('client')} className="text-brand-900 text-xs font-bold hover:underline bg-brand-50 px-2 py-1 rounded-md border border-brand-100">
                                    Cambiar
                                </button>
                            )}
                        </div>
                        {newSale.clientName ? (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-brand-900 shadow-sm text-lg">
                                    {newSale.clientName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{newSale.clientName}</p>
                                    <p className="text-xs text-gray-500">ID: {newSale.clientId || 'N/A'}</p>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setModalType('client')} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-brand-900 hover:text-brand-900 transition-all flex flex-col items-center gap-2 group bg-gray-50/50 hover:bg-white min-h-[100px] justify-center">
                                <div className="bg-white p-2 rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                                    <Plus size={20} />
                                </div>
                                <span className="font-medium text-sm">Asignar Cliente</span>
                            </button>
                        )}
                    </div>

                    {/* Totals & Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5 flex-1">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide"><CreditCard size={16}/> Resumen</h3>
                        
                        <div className="space-y-3 pb-6 border-b border-gray-100">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span className="font-medium">Subtotal</span>
                                <span className="font-bold text-gray-900">{formatCurrency(newSale.subtotal || 0, settings)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 font-medium">Descuento</span>
                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 w-20">
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-right outline-none font-bold text-brand-900 text-sm" 
                                        value={newSale.discount || ''}
                                        onChange={e => setNewSale({...newSale, discount: Number(e.target.value)})}
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-bold text-gray-400">%</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-1">
                                <ToggleSwitch 
                                    enabled={taxEnabled} 
                                    onChange={setTaxEnabled} 
                                    label={`${settings.taxName} (${settings.taxRate}%)`} 
                                />
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(newSale.tax || 0, settings)}</span>
                            </div>

                            <div className="flex justify-between items-end pt-3 border-t border-gray-50">
                                <span className="font-bold text-lg text-gray-900">Total</span>
                                <span className="font-black text-3xl text-brand-900 tracking-tight">{formatCurrency(newSale.total || 0, settings)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Estado</label>
                                <select className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm font-medium outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all appearance-none cursor-pointer shadow-sm min-h-[48px]" value={newSale.paymentStatus} onChange={e => setNewSale({...newSale, paymentStatus: e.target.value as any})}>
                                    <option value="Paid" className="text-gray-900 font-bold">Pagado</option>
                                    <option value="Pending" className="text-gray-900 font-bold">Pendiente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Método</label>
                                <select className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl text-sm font-medium outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all appearance-none cursor-pointer shadow-sm min-h-[48px]" value={newSale.paymentMethod} onChange={e => setNewSale({...newSale, paymentMethod: e.target.value as any})}>
                                    <option value="Cash" className="text-gray-900">Efectivo</option>
                                    <option value="QR" className="text-gray-900">QR Simple</option>
                                    <option value="Transfer" className="text-gray-900">Transferencia</option>
                                    <option value="Card" className="text-gray-900">Tarjeta</option>
                                </select>
                            </div>
                        </div>

                        {newSale.paymentStatus !== 'Paid' && (
                            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                <label className="block text-xs font-bold text-yellow-800 uppercase mb-1 ml-1">A Cuenta (Bs)</label>
                                <input type="number" className="w-full px-4 py-2 bg-white border border-yellow-200 rounded-lg text-lg font-bold text-gray-900 outline-none focus:border-yellow-500 min-h-[44px]" value={newSale.amountPaid || ''} onChange={e => setNewSale({...newSale, amountPaid: Number(e.target.value)})} placeholder="0.00" />
                            </div>
                        )}

                        <button 
                            onClick={handleFinalizeSale}
                            disabled={!newSale.clientName || !newSale.items?.length}
                            className="w-full mt-auto py-4 bg-brand-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[56px]"
                        >
                            <Check size={24} /> {editingId ? 'Guardar Cambios' : 'Confirmar Venta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* SALE DETAIL MODAL (WIDER LAYOUT) */}
        {selectedSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-brand-900">{selectedSale.id}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${selectedSale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                    {selectedSale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar size={12}/> {new Date(selectedSale.date).toLocaleDateString()} {new Date(selectedSale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"><X size={24}/></button>
                    </div>

                    {/* Body - Grid Layout */}
                    <div className="flex-1 overflow-y-auto p-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                            {/* Left: Info & Items */}
                            <div className="md:col-span-2 p-6 space-y-6 border-b md:border-b-0 md:border-r border-gray-100">
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="w-12 h-12 rounded-full bg-white text-brand-900 flex items-center justify-center shadow-sm font-bold text-xl">{selectedSale.clientName.charAt(0)}</div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cliente</p>
                                        <p className="font-bold text-gray-900 text-lg">{selectedSale.clientName}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-3 border-b border-gray-100 pb-1">Detalle de Venta</p>
                                    <div className="space-y-3">
                                        {selectedSale.items?.map((item, idx) => (
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

                            {/* Right: Totals & Actions */}
                            <div className="md:col-span-1 bg-gray-50/50 p-6 flex flex-col gap-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                    <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(selectedSale.subtotal, settings)}</span></div>
                                    {selectedSale.discount !== undefined && selectedSale.discount > 0 && <div className="flex justify-between text-sm text-red-500"><span>Descuento</span><span>-{formatCurrency(selectedSale.subtotal * (selectedSale.discount/100), settings)}</span></div>}
                                    {selectedSale.tax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Impuesto</span><span>{formatCurrency(selectedSale.tax, settings)}</span></div>}
                                    <div className="flex justify-between text-xl font-black text-brand-900 border-t border-gray-200 pt-3 mt-1"><span>Total</span><span>{formatCurrency(selectedSale.total, settings)}</span></div>
                                    {selectedSale.amountPaid !== undefined && selectedSale.amountPaid < selectedSale.total && (
                                        <div className="flex justify-between text-sm text-green-600 border-t border-gray-200 pt-2">
                                            <span>Pagado</span><span>{formatCurrency(selectedSale.amountPaid, settings)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1"></div> {/* Spacer */}

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={(e) => handlePreview(selectedSale, e)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors min-h-[48px]">
                                            <Eye size={18}/> Vista PDF
                                        </button>
                                        <button onClick={(e) => handleDirectAction(selectedSale, 'print', e)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors min-h-[48px]">
                                            <Printer size={18}/> Imprimir
                                        </button>
                                        <button onClick={(e) => { setShareSale(selectedSale); setIsShareModalOpen(true); }} className="col-span-2 flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl font-bold hover:bg-green-100 transition-colors min-h-[48px]">
                                            <Share2 size={18}/> Compartir
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                                        <button onClick={(e) => handleEditSale(selectedSale, e)} className="flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold transition-colors min-h-[44px]">
                                            <Edit3 size={16}/> Editar
                                        </button>
                                        {canDelete ? (
                                            <button onClick={(e) => handleDeleteSale(selectedSale.id, e)} className="flex items-center justify-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors min-h-[44px]">
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

        {/* Share Modal (Same as Quotations) */}
        {isShareModalOpen && shareSale && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in duration-200 mx-4">
                    <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"><X size={20}/></button>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-brand-900"/> Compartir Recibo</h3>
                    <div className="space-y-3">
                        <button onClick={() => handleShareWhatsApp(shareSale)} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]">Enviar por WhatsApp</button>
                        <button onClick={handleCopyLink} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]"><Copy size={18}/> Copiar Enlace</button>
                    </div>
                </div>
            </div>
        )}

        {/* PREVIEW MODAL */}
        {modalType === 'preview' && pdfPreview && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                            {renderReceiptContent(pdfPreview)}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Catalog and Client modals remain same structure, omitted for brevity but preserved in full implementation) ... */}
        {/* CATALOG MODAL */}
        {modalType === 'catalog' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in duration-200 mx-4 overflow-hidden border border-gray-200">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                        <div><h3 className="font-bold text-xl text-gray-900">Catálogo</h3><p className="text-sm text-gray-500">Selecciona ítems para la venta</p></div>
                        <button onClick={() => setModalType('none')} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"><X size={24}/></button>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input autoFocus type="text" placeholder="Buscar por nombre..." className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-900 bg-white shadow-sm" value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto relative">
                            <div className="relative">
                                <select className="appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-700 bg-white shadow-sm cursor-pointer w-full" value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}>
                                    {categories.map(cat => <option key={cat} value={cat} className="text-gray-900 bg-white">{cat === 'All' ? 'Todas las Categorías' : cat}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-white p-0">
                        {filteredCatalog.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {filteredCatalog.map(item => (
                                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider bg-gray-100 text-gray-600 border-gray-200">{item.category}</span>
                                                    {item.sku && <span className="text-xs text-gray-400 font-mono">{item.sku}</span>}
                                                </div>
                                                <h4 className="text-base font-bold text-gray-900 leading-tight mb-1">{item.name}</h4>
                                                {item.type === 'Product' && (
                                                    <span className={`text-[10px] font-bold ${item.quantity <= (item.minStock || 5) ? 'text-red-500' : 'text-green-600'}`}>
                                                        Stock: {item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0 mt-4 md:mt-0">
                                                <button onClick={() => handleAddItem(item)} className="flex flex-col items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-lg text-gray-900 transition-all min-w-[100px] active:scale-95 min-h-[44px]">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Unitario</span>
                                                    <span className="text-sm font-bold">{formatCurrency(item.price, settings)}</span>
                                                </button>
                                                {item.priceDozen && item.priceDozen > 0 && <button onClick={() => handleAddItem(item, item.priceDozen)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-gray-700 transition-all min-w-[100px] active:scale-95 min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista A</span><span className="text-sm font-bold text-blue-700">{formatCurrency(item.priceDozen, settings)}</span></button>}
                                                {item.priceBox && item.priceBox > 0 && <button onClick={() => handleAddItem(item, item.priceBox)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-lg text-gray-700 transition-all min-w-[100px] active:scale-95 min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista B</span><span className="text-sm font-bold text-orange-700">{formatCurrency(item.priceBox, settings)}</span></button>}
                                                {item.priceWholesale && item.priceWholesale > 0 && <button onClick={() => handleAddItem(item, item.priceWholesale)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-gray-700 transition-all min-w-[100px] active:scale-95 min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista C</span><span className="text-sm font-bold text-purple-700">{formatCurrency(item.priceWholesale, settings)}</span></button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                                <AlertCircle size={48} className="text-gray-300 mb-4"/>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron ítems</h3>
                                <p className="text-gray-500 text-sm mb-6 max-w-md">Parece que no tienes productos o servicios registrados, o la búsqueda no arrojó resultados.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {modalType === 'client' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md h-[550px] shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col relative mx-4">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">{isCreatingClient ? 'Nuevo Cliente' : 'Seleccionar Cliente'}</h3>
                        <button onClick={() => setModalType('none')} className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 text-gray-400"><X size={20}/></button>
                    </div>
                    {!isCreatingClient ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-gray-100 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                    <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 bg-white text-gray-900" value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
                                </div>
                                <button onClick={() => setIsCreatingClient(true)} className="px-3 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1 min-h-[40px]"><Plus size={16}/> Nuevo</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                {isLoadingData && availableClients.length === 0 && <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-brand-900" /></div>}
                                {filteredClients.map(c => (
                                    <button key={c.id} onClick={() => { setNewSale({...newSale, clientName: c.name, clientId: c.id}); setModalType('none'); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group border border-transparent hover:border-gray-200 min-h-[48px]">
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-900 flex items-center justify-center font-bold text-xs group-hover:bg-brand-900 group-hover:text-white transition-colors">{c.name.charAt(0)}</div>
                                        <div><p className="font-bold text-sm text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.company}</p></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 flex flex-col h-full overflow-y-auto">
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Nombre Completo</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Empresa</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.company} onChange={e => setClientData({...clientData, company: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">{settings.taxIdLabel || 'NIT'}</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.nit} onChange={e => setClientData({...clientData, nit: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Teléfono</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Email</label><input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Dirección</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-h-[44px]" value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} /></div>
                            </div>
                            <div className="mt-auto flex gap-3 pt-6">
                                <button onClick={() => setIsCreatingClient(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 min-h-[44px]">Cancelar</button>
                                <button onClick={handleCreateClient} className="flex-1 py-2 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 min-h-[44px]">Guardar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
