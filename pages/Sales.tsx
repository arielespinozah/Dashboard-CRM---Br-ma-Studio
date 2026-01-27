import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, X, Package, Check, Printer, User, CreditCard, RefreshCw, Edit3 } from 'lucide-react';
import { Sale, QuoteItem, AppSettings, InventoryItem, Client, User as UserType } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    const val = amount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

// Robust Number to Words Function
const convertNumberToWordsEs = (amount: number, currencyName: string) => {
    const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const getHundreds = (num: number): string => {
        if (num > 999) return '';
        if (num === 100) return 'CIEN';
        
        let str = '';
        const h = Math.floor(num / 100);
        const r = num % 100;

        if (h > 0) str += HUNDREDS[h] + ' ';

        if (r > 0) {
            if (r < 10) str += UNITS[r];
            else if (r >= 10 && r < 20) str += TEENS[r - 10];
            else {
                const t = Math.floor(r / 10);
                const u = r % 10;
                str += TENS[t];
                if (u > 0) str += ' Y ' + UNITS[u];
            }
        }
        return str.trim();
    };

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    let words = '';
    if (integerPart === 0) words = 'CERO';
    else if (integerPart < 1000) words = getHundreds(integerPart);
    else if (integerPart < 1000000) {
        const k = Math.floor(integerPart / 1000);
        const r = integerPart % 1000;
        words = (k === 1 ? 'MIL' : getHundreds(k) + ' MIL') + (r > 0 ? ' ' + getHundreds(r) : '');
    } else {
        words = integerPart.toString(); // Fallback for very large numbers
    }

    return `${words} CON ${decimalPart.toString().padStart(2, '0')}/100 ${currencyName.toUpperCase()}`;
};

export const Sales = () => {
  // Get Current User for Permissions
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

  const [modalType, setModalType] = useState<'none' | 'client' | 'catalog' | 'preview'>('none');
  const [modalSearch, setModalSearch] = useState('');
  const [catalogTab, setCatalogTab] = useState<'All' | 'Service' | 'Product'>('All');

  const [newClientName, setNewClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [newSale, setNewSale] = useState<Partial<Sale>>({
      items: [], amountPaid: 0, subtotal: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash'
  });
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [pdfSale, setPdfSale] = useState<Sale | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const loadData = async () => {
          const s = localStorage.getItem('crm_settings');
          if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) });

          let localClients = localStorage.getItem('crm_clients');
          if (localClients) setAvailableClients(JSON.parse(localClients));
          else {
              setIsLoadingData(true);
              try {
                  const docSnap = await getDoc(doc(db, 'crm_data', 'clients'));
                  if (docSnap.exists()) {
                      setAvailableClients(docSnap.data().list);
                      localStorage.setItem('crm_clients', JSON.stringify(docSnap.data().list));
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
                      setAvailableInventory(docSnap.data().list);
                      localStorage.setItem('crm_inventory', JSON.stringify(docSnap.data().list));
                  }
              } catch(e) {}
          }

          try {
              const docSnap = await getDoc(doc(db, 'crm_data', 'sales_history'));
              if(docSnap.exists()) {
                  setSales(docSnap.data().list);
                  localStorage.setItem('crm_sales_history', JSON.stringify(docSnap.data().list));
              }
          } catch(e) {}
          
          setIsLoadingData(false);
      };
      loadData();
  }, []);

  const syncSalesToCloud = async (newSales: Sale[]) => {
      setSales(newSales);
      localStorage.setItem('crm_sales_history', JSON.stringify(newSales));
      try {
          await setDoc(doc(db, 'crm_data', 'sales_history'), { list: newSales });
      } catch(e) {}
  };

  useEffect(() => {
      const items = newSale.items || [];
      const sub = items.reduce((acc, item) => acc + item.total, 0);
      const tax = taxEnabled ? sub * (settings.taxRate / 100) : 0;
      const total = sub + tax;
      
      setNewSale(prev => ({ 
          ...prev, 
          subtotal: sub, 
          tax, 
          total,
          amountPaid: prev.paymentStatus === 'Paid' ? total : prev.amountPaid 
      }));
  }, [newSale.items, taxEnabled, settings.taxRate, newSale.paymentStatus]);

  // ACTIONS
  const handleAddItem = (item: InventoryItem) => {
      const existingItemIndex = newSale.items?.findIndex(i => i.description === item.name);
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
              unitPrice: item.price,
              total: item.price
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

  const handleCreateClient = () => {
      if(newClientName.trim()) {
          const client: Client = {
              id: Math.random().toString(36).substr(2,9),
              name: newClientName,
              company: 'Nuevo Cliente',
              email: '',
              phone: '',
              type: 'Client'
          };
          const updated = [...availableClients, client];
          setAvailableClients(updated);
          localStorage.setItem('crm_clients', JSON.stringify(updated));
          setNewSale({...newSale, clientName: client.name, clientId: client.id});
          setModalType('none');
          setIsCreatingClient(false);
          setNewClientName('');
      }
  };
  
  const handleFinalizeSale = () => {
      if (!newSale.clientName) { alert('Seleccione un cliente.'); return; }
      if (!newSale.items || newSale.items.length === 0) { alert('Agregue productos.'); return; }

      let saleId = editingId;
      if (!saleId) {
          saleId = `VTA-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;
      }

      const finalSale: Sale = {
          id: saleId,
          clientId: newSale.clientId || 'generic',
          clientName: newSale.clientName,
          date: new Date().toISOString(),
          items: newSale.items,
          subtotal: newSale.subtotal || 0,
          tax: newSale.tax || 0,
          total: newSale.total || 0,
          amountPaid: newSale.amountPaid || 0,
          balance: (newSale.total || 0) - (newSale.amountPaid || 0),
          paymentStatus: newSale.paymentStatus as any,
          paymentMethod: newSale.paymentMethod as any,
          notes: ''
      };
      
      let updatedSales = [...sales];
      if (editingId) {
          updatedSales = sales.map(s => s.id === editingId ? finalSale : s);
      } else {
          updatedSales = [finalSale, ...sales];
      }

      syncSalesToCloud(updatedSales);
      setPdfSale(finalSale);
      setModalType('preview');
      // Reset form
      setNewSale({ items: [], amountPaid: 0, subtotal: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash' });
      setEditingId(null);
      setTaxEnabled(false);
      setView('list');
  };

  const handleEditSale = (sale: Sale) => {
      setNewSale({
          clientName: sale.clientName,
          clientId: sale.clientId,
          items: sale.items,
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus,
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          amountPaid: sale.amountPaid
      });
      setTaxEnabled(sale.tax > 0);
      setEditingId(sale.id);
      setView('create');
  };

  const handleDeleteSale = (id: string) => {
      if (currentUser?.role !== 'Admin') {
          alert("Acción denegada. Solo el administrador puede eliminar recibos.");
          return;
      }
      if (confirm("¿Estás seguro de eliminar este recibo permanentemente? Esta acción no se puede deshacer.")) {
          const updatedSales = sales.filter(s => s.id !== id);
          syncSalesToCloud(updatedSales);
      }
  };

  const printPDF = () => {
      if (receiptRef.current && pdfSale) {
          html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save(`Venta_${pdfSale.id}.pdf`);
              setModalType('none');
              setPdfSale(null);
          });
      }
  };

  const getClientDetails = (name: string) => {
      return availableClients.find(c => c.name === name);
  };

  const filteredCatalog = availableInventory.filter(i => i.name.toLowerCase().includes(modalSearch.toLowerCase()) && (catalogTab === 'All' || i.type === catalogTab));
  const filteredClients = availableClients.filter(c => c.name.toLowerCase().includes(modalSearch.toLowerCase()));

  return (
    <div className="space-y-6 h-full flex flex-col relative">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ventas</h1>
                <p className="text-sm text-gray-500">Punto de venta</p>
            </div>
            {view === 'list' ? (
                <button onClick={() => { setEditingId(null); setNewSale({ items: [], amountPaid: 0, subtotal: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash' }); setTaxEnabled(false); setView('create'); }} className="bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 flex items-center gap-2 shadow-lg active:scale-95">
                    <Plus size={18} /> Nueva Venta
                </button>
            ) : (
                <button onClick={() => setView('list')} className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                    Cancelar
                </button>
            )}
        </div>

        {view === 'list' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID Venta</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sales.map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-brand-900">{sale.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{sale.clientName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(sale.total, settings)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                                        <button 
                                            onClick={() => { setPdfSale(sale); setModalType('preview'); }}
                                            className="p-2 text-gray-400 hover:text-brand-900 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Ver Recibo"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleEditSale(sale)}
                                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSale(sale.id)}
                                            className={`p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${currentUser?.role !== 'Admin' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            title="Eliminar (Solo Admin)"
                                            disabled={currentUser?.role !== 'Admin'}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sales.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No hay ventas registradas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {view === 'create' && (
             <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><User size={18}/> Datos del Cliente</h3>
                            <button onClick={() => { setModalSearch(''); setIsCreatingClient(false); setModalType('client'); }} className="text-sm text-blue-600 font-bold hover:underline">
                                {newSale.clientName ? 'Cambiar' : 'Seleccionar'}
                            </button>
                        </div>
                        {newSale.clientName ? (
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-lg">{newSale.clientName.charAt(0)}</div>
                                <div><p className="font-bold text-gray-900">{newSale.clientName}</p><p className="text-xs text-gray-500">{newSale.clientId ? 'Cliente Registrado' : 'Cliente Casual'}</p></div>
                            </div>
                        ) : (
                            <div onClick={() => { setModalSearch(''); setIsCreatingClient(false); setModalType('client'); }} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors group">
                                <p className="text-gray-400 font-medium group-hover:text-brand-900 transition-colors">Click para asignar un cliente</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Package size={18}/> Productos & Servicios</h3>
                            <button onClick={() => { setModalSearch(''); setModalType('catalog'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-900 rounded-lg text-xs font-bold hover:bg-brand-100 border border-brand-100 transition-colors">
                                <Plus size={14}/> Agregar Ítem
                            </button>
                        </div>
                        <div className="flex-1">
                            <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <div className="col-span-6">Descripción</div><div className="col-span-2 text-center">Cant.</div><div className="col-span-2 text-right">P. Unit</div><div className="col-span-2 text-right">Total</div>
                            </div>
                            <div className="space-y-2">
                                {newSale.items?.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                                        <div className="col-span-6 font-medium text-gray-900">{item.description}</div>
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <button onClick={() => handleUpdateQuantity(idx, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold">-</button>
                                            <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(idx, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold">+</button>
                                        </div>
                                        <div className="col-span-2 text-right text-gray-600 text-sm">{item.unitPrice}</div>
                                        <div className="col-span-2 text-right font-bold text-gray-900 text-sm">{formatCurrency(item.total, settings)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><CreditCard size={18}/> Resumen de Pago</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(newSale.subtotal || 0, settings)}</span></div>
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <button type="button" onClick={() => setTaxEnabled(!taxEnabled)} className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${taxEnabled ? 'bg-brand-900' : 'bg-gray-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                    <span>Incluir {settings.taxName} ({settings.taxRate}%)</span>
                                </label>
                                <span>{formatCurrency(newSale.tax || 0, settings)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200 flex justify-between items-end"><span className="text-gray-900 font-bold">Total a Pagar</span><span className="text-3xl font-bold text-brand-900 tracking-tight">{formatCurrency(newSale.total || 0, settings)}</span></div>
                        </div>
                        <button onClick={handleFinalizeSale} className="w-full py-4 bg-brand-900 text-white rounded-xl font-bold text-lg hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2"><Check size={20} /> {editingId ? 'Guardar Cambios' : 'Finalizar Venta'}</button>
                    </div>
                </div>
             </div>
        )}

        {/* 3. PDF Preview Modal */}
        {modalType === 'preview' && pdfSale && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                        <h3 className="font-bold flex items-center gap-2"><Check size={20} className="text-green-400"/> Venta Registrada</h3>
                        <div className="flex gap-2">
                             <button onClick={printPDF} className="px-4 py-1.5 bg-white text-brand-900 rounded-lg text-sm font-bold hover:bg-gray-100 flex items-center gap-2"><Printer size={16}/> Imprimir</button>
                             <button onClick={() => { setModalType('none'); setPdfSale(null); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
                        <div ref={receiptRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans shadow-2xl">
                             {/* HEADER PDF */}
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
                                        <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{pdfSale.id.replace('VTA-', '')}</span></div>
                                        <div className="flex justify-end gap-6"><span className="opacity-70 text-right w-24">FECHA</span> <span className="w-32 whitespace-nowrap">{new Date(pdfSale.date).toLocaleDateString()} {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-12 pt-12">
                                {/* INFO ROW */}
                                <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                                    <div className="w-[45%]">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Recibí de:</p>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{pdfSale.clientName}</h3>
                                        {(() => {
                                            const client = getClientDetails(pdfSale.clientName);
                                            return (
                                                <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                                                    {client?.company && <div className="font-medium text-gray-600">{client.company}</div>}
                                                    {client?.phone && <div>{client.phone}</div>}
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

                                {/* TABLE */}
                                <div className="mb-10">
                                    <div className="bg-gray-50 flex px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 rounded-md mb-2">
                                        <div className="flex-1">Descripción</div>
                                        <div className="w-20 text-center">Cant.</div>
                                        <div className="w-28 text-right">P. Unit</div>
                                        <div className="w-28 text-right">Total</div>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {pdfSale.items.map((item, idx) => (
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

                                {/* FOOTER SECTION */}
                                <div className="flex justify-between items-start">
                                    {/* Left: Amount in Words */}
                                    <div className="w-[60%] pr-8">
                                        <div className="mb-6">
                                            <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">El monto de:</h4>
                                            <div className="text-sm font-bold text-gray-700 italic border-l-4 border-gray-300 pl-3 py-1">
                                                SON: {convertNumberToWordsEs(pdfSale.total, settings.currencyName)}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8">
                                            <p className="text-[10px] text-gray-500 italic uppercase">
                                                Gracias por su preferencia. Este documento es comprobante de pago sin derecho a crédito fiscal.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Totals & Signature */}
                                    <div className="w-[35%] flex flex-col items-end">
                                        <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                                            <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(pdfSale.subtotal, settings)}</span></div>
                                            {pdfSale.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(pdfSale.tax, settings)}</span></div>)}
                                            <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(pdfSale.total, settings)}</span></div>
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

                            {/* FOOTER */}
                            <div className="absolute bottom-0 left-0 w-full">
                                <div className="bg-gray-100 text-center py-3 border-t border-gray-200">
                                    <p className="text-[10px] text-gray-500 tracking-wider font-medium uppercase">{settings.pdfFooterText || `${settings.website} • ${settings.address}`}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Existing Client & Catalog Modals - kept as is) ... */}
        {modalType === 'client' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md h-[450px] shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col relative">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">{isCreatingClient ? 'Nuevo Cliente' : 'Seleccionar Cliente'}</h3>
                        <button onClick={() => setModalType('none')}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                    </div>
                    {!isCreatingClient ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-gray-100 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                    <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500" value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
                                </div>
                                <button onClick={() => setIsCreatingClient(true)} className="px-3 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1"><Plus size={16}/> Nuevo</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                {isLoadingData && filteredClients.length === 0 && <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-brand-900" /></div>}
                                {filteredClients.map(c => (
                                    <button key={c.id} onClick={() => { setNewSale({...newSale, clientName: c.name, clientId: c.id}); setModalType('none'); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs">{c.name.charAt(0)}</div>
                                        <div><p className="font-bold text-sm text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.company}</p></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 flex flex-col h-full">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Cliente</label>
                            <input autoFocus type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-4 bg-white text-gray-900 outline-none focus:border-brand-500" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                            <div className="mt-auto flex gap-3">
                                <button onClick={() => setIsCreatingClient(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Cancelar</button>
                                <button onClick={handleCreateClient} className="flex-1 py-2 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800">Crear y Seleccionar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {modalType === 'catalog' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl animate-in zoom-in duration-200">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">Catálogo</h3>
                        <button onClick={() => setModalType('none')}><X size={20} className="text-gray-400"/></button>
                    </div>
                     <div className="p-4 space-y-4 bg-white border-b border-gray-100">
                         <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                            {['All', 'Service', 'Product'].map(t => (
                                <button key={t} onClick={() => setCatalogTab(t as any)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${catalogTab === t ? 'bg-white shadow text-brand-900' : 'text-gray-500'}`}>
                                    {t === 'All' ? 'Todos' : t === 'Service' ? 'Servicios' : 'Productos'}
                                </button>
                            ))}
                         </div>
                         <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input autoFocus type="text" placeholder="Buscar ítem..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500" value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-3">
                            {filteredCatalog.map(item => (
                                <div key={item.id} onClick={() => handleAddItem(item)} className="bg-white p-3 rounded-xl border border-gray-200 hover:border-brand-500 cursor-pointer shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h4>
                                        <span className="text-xs font-bold text-brand-600">{formatCurrency(item.price, settings)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.category}</p>
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