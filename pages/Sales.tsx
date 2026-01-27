import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Download, MessageCircle, Plus, Trash2, X, Eye, Save, DollarSign, Package, Briefcase } from 'lucide-react';
import { Sale, QuoteItem, AppSettings, Category, InventoryItem } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Mock Catalog Data (Ideally shared context or localStorage)
const initialCatalog: InventoryItem[] = [
    { id: '1', name: 'Diseño de Logo Pro', price: 1500, category: 'Diseño', sku: 'SRV-001', quantity: 999, minStock: 0, status: 'In Stock', lastUpdated: '', type: 'Service' },
    { id: '2', name: 'Mantenimiento PC', price: 250, category: 'Soporte', sku: 'SRV-002', quantity: 999, minStock: 0, status: 'In Stock', lastUpdated: '', type: 'Service' },
    { id: '3', name: 'Sello Automático Trodat', price: 80, category: 'Insumos', sku: 'PRD-001', quantity: 15, minStock: 5, status: 'In Stock', lastUpdated: '', type: 'Product' },
    { id: '4', name: 'Impresión Lona m2', price: 60, category: 'Imprenta', sku: 'PRD-002', quantity: 50, minStock: 10, status: 'In Stock', lastUpdated: '', type: 'Product' },
];

const initialSales: Sale[] = [
  { 
      id: 'VEN-2023-001', 
      clientId: 'c1',
      clientName: 'Juan Perez', 
      date: '2023-10-24', 
      subtotal: 1500,
      tax: 0,
      total: 1500, 
      amountPaid: 1500,
      balance: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'Transfer',
      items: [
          { id: '1', description: 'Diseño de Logo', quantity: 1, unitPrice: 1500, total: 1500 }
      ] 
  }
];

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113, Santa Cruz, Bolivia',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#1e293b',
    paymentInfo: '',
    termsAndConditions: '',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA'
};

export const Sales = () => {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  // Catalog State
  const [catalogItems, setCatalogItems] = useState<InventoryItem[]>(initialCatalog);
  const [catalogTab, setCatalogTab] = useState<'Service' | 'Product'>('Service');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Sale Form State
  const [newSale, setNewSale] = useState<Partial<Sale>>({
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      paymentStatus: 'Pending',
      paymentMethod: 'Cash',
      items: [],
      amountPaid: 0,
      subtotal: 0,
      tax: 0,
      total: 0
  });
  const [taxEnabled, setTaxEnabled] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const saved = localStorage.getItem('crm_settings');
      if (saved) setSettings(JSON.parse(saved));
  }, []);

  const formatCurrency = (amount: number) => {
      const val = amount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
      return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
  };

  // Calculation Logic
  useEffect(() => {
      const sub = newSale.items?.reduce((acc, item) => acc + item.total, 0) || 0;
      const tax = taxEnabled ? sub * (settings.taxRate / 100) : 0;
      const total = sub + tax;
      setNewSale(prev => ({ ...prev, subtotal: sub, tax, total }));
  }, [newSale.items, taxEnabled, settings.taxRate]);

  const addItemFromCatalog = (catalogItem: any) => {
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: catalogItem.name,
          quantity: 1,
          unitPrice: catalogItem.price,
          total: catalogItem.price
      };
      setNewSale(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      setIsCatalogOpen(false);
  };

  const addManualItem = () => {
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
      };
      setNewSale(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
      const updatedItems = newSale.items?.map(item => {
          if (item.id === id) {
              const updated = { ...item, [field]: value };
              if (field === 'quantity' || field === 'unitPrice') {
                  updated.total = Number(updated.quantity) * Number(updated.unitPrice);
              }
              return updated;
          }
          return item;
      }) || [];
      setNewSale(prev => ({ ...prev, items: updatedItems }));
  };

  const removeItem = (id: string) => {
      const updatedItems = newSale.items?.filter(item => item.id !== id) || [];
      setNewSale(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const total = newSale.total || 0;
      const paid = Number(newSale.amountPaid) || 0;
      const balance = total - paid;
      
      let status: 'Paid' | 'Partial' | 'Pending' = 'Pending';
      if (paid >= total) status = 'Paid';
      else if (paid > 0) status = 'Partial';

      const saleId = `VEN-${new Date().getFullYear()}-${String(sales.length + 1).padStart(3, '0')}`;
      
      const sale: Sale = {
          ...(newSale as Sale),
          id: saleId,
          clientId: 'temp', 
          balance: balance,
          paymentStatus: status
      };

      setSales([sale, ...sales]);
      setIsModalOpen(false);
  };

  const preparePDFDownload = (sale: Sale) => {
      setPdfPreview(sale);
      setTimeout(() => {
          if (printRef.current) {
              html2canvas(printRef.current, { scale: 2, useCORS: true }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`NotaVenta_${sale.id}.pdf`);
                  setPdfPreview(null);
              });
          }
      }, 500);
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ventas y Recibos</h1>
          <p className="text-sm text-gray-500">Registra ventas, anticipos y genera comprobantes</p>
        </div>
        <button 
            onClick={() => {
                setNewSale({
                    clientName: '', date: new Date().toISOString().split('T')[0],
                    paymentStatus: 'Pending', paymentMethod: 'Cash', items: [], amountPaid: 0, subtotal: 0, tax: 0, total: 0
                });
                setTaxEnabled(false);
                setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-all active:scale-95"
        >
            <Plus size={16} /> Nueva Venta
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar ventas..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all shadow-sm text-gray-900"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingSale(sale)}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{sale.clientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{sale.date}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(sale.total)}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{formatCurrency(sale.amountPaid)}</td>
                        <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                sale.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {sale.paymentStatus === 'Paid' ? 'Pagado' : sale.paymentStatus === 'Partial' ? 'Parcial' : 'Pendiente'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                             <button onClick={(e) => { e.stopPropagation(); preparePDFDownload(sale); }} className="p-2 text-gray-500 hover:text-gray-900">
                                 <Download size={18} />
                             </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* CREATE SALE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
             <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="font-bold text-xl text-gray-900">Registrar Venta</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>
             <form onSubmit={handleSave} className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none" 
                            value={newSale.clientName} onChange={e => setNewSale({...newSale, clientName: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input type="date" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none" 
                            value={newSale.date} onChange={e => setNewSale({...newSale, date: e.target.value})} />
                     </div>
                 </div>

                 {/* Items */}
                 <div>
                     <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-gray-700">Ítems</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsCatalogOpen(true)} className="text-sm bg-brand-50 text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium flex items-center gap-1 transition-colors">
                                <Package size={16}/> Catálogo
                            </button>
                            <button type="button" onClick={addManualItem} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-1 transition-colors">
                                <Plus size={16}/> Manual
                            </button>
                        </div>
                     </div>
                     <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                         {newSale.items?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Agrega productos o servicios</p>}
                         {newSale.items?.map(item => (
                             <div key={item.id} className="flex gap-2 items-center bg-gray-50/50 p-2 rounded-lg">
                                 <input type="text" placeholder="Desc" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none"
                                    value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} required />
                                 <input type="number" placeholder="#" className="w-16 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none text-center"
                                    value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                 <input type="number" placeholder="$" className="w-24 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none text-right"
                                    value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                 <div className="w-28 text-right text-sm font-bold text-brand-900">{formatCurrency(item.total)}</div>
                                 <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Payment Logic */}
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                     <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                             <input 
                                type="checkbox" 
                                id="taxToggle"
                                checked={taxEnabled} 
                                onChange={(e) => setTaxEnabled(e.target.checked)}
                                className="w-4 h-4 text-brand-900 rounded focus:ring-brand-900 border-gray-300"
                             />
                             <label htmlFor="taxToggle" className="text-sm text-gray-700 font-medium select-none">Incluir {settings.taxName} ({settings.taxRate}%)</label>
                         </div>
                     </div>
                     <div className="space-y-1 text-right mb-4 border-b border-gray-200 pb-4">
                         <div className="text-sm text-gray-500 flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(newSale.subtotal || 0)}</span></div>
                         {taxEnabled && (
                            <div className="text-sm text-gray-500 flex justify-between"><span>{settings.taxName}:</span> <span>{formatCurrency(newSale.tax || 0)}</span></div>
                         )}
                         <div className="text-2xl font-bold text-gray-900 flex justify-between pt-2"><span>Total:</span> <span>{formatCurrency(newSale.total || 0)}</span></div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Monto Abonado</label>
                             <input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-bold text-lg" 
                                value={newSale.amountPaid} onChange={e => setNewSale({...newSale, amountPaid: Number(e.target.value)})} />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Pendiente</label>
                             <div className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-bold text-lg">
                                 {formatCurrency((newSale.total || 0) - (newSale.amountPaid || 0))}
                             </div>
                         </div>
                     </div>
                 </div>

                 <div className="flex justify-end gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                     <button type="submit" className="px-6 py-2 bg-brand-900 text-white rounded-xl shadow-lg hover:bg-brand-800 font-medium">Finalizar Venta</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* CATALOG MODAL - ENHANCED */}
      {isCatalogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">Seleccionar Ítem</h3>
                      <button onClick={() => setIsCatalogOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  
                  {/* Tabs & Search */}
                  <div className="p-4 bg-white border-b border-gray-50 space-y-3">
                      <div className="flex p-1 bg-gray-100 rounded-lg w-full">
                          <button 
                            onClick={() => setCatalogTab('Service')} 
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${catalogTab === 'Service' ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                              <div className="flex items-center justify-center gap-2"><Briefcase size={14}/> Servicios</div>
                          </button>
                          <button 
                            onClick={() => setCatalogTab('Product')} 
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${catalogTab === 'Product' ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                              <div className="flex items-center justify-center gap-2"><Package size={14}/> Productos</div>
                          </button>
                      </div>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            autoFocus
                            type="text" 
                            placeholder={`Buscar ${catalogTab === 'Service' ? 'servicios' : 'productos'}...`}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-900/10"
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="p-2 overflow-y-auto flex-1">
                      {catalogItems.filter(item => 
                          (item.type === catalogTab || (!item.type && catalogTab === 'Service')) && // Fallback for mock data without type
                          item.name.toLowerCase().includes(catalogSearch.toLowerCase())
                      ).map(item => (
                          <div key={item.id} 
                               onClick={() => addItemFromCatalog(item)}
                               className="flex justify-between items-center p-3 hover:bg-brand-50 cursor-pointer rounded-lg border border-transparent hover:border-brand-100 group transition-colors">
                              <div>
                                  <p className="font-semibold text-gray-900">{item.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{item.category}</span>
                                      {item.sku && <span className="text-xs text-gray-400">SKU: {item.sku}</span>}
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="font-bold text-brand-900">{formatCurrency(item.price)}</div>
                                  {item.type === 'Product' && (
                                      <div className={`text-xs ${item.quantity < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                                          Stock: {item.quantity}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* PDF TEMPLATE */}
      {pdfPreview && (
         <div className="fixed top-0 left-0 w-full h-0 overflow-hidden">
            <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans">
                {/* DARK HEADER */}
                <div className="bg-[#1e293b] text-white p-12 flex justify-between items-center" style={{ backgroundColor: settings.primaryColor }}>
                    <div className="flex items-center gap-4">
                         {settings.logoUrl ? (
                             <img src={settings.logoUrl} className="h-16 object-contain bg-white rounded-lg p-1" />
                         ) : <div className="h-12 w-12 bg-white rounded-full"></div>}
                         <div>
                             <h1 className="text-2xl font-bold tracking-widest uppercase">Bráma</h1>
                             <p className="text-xs tracking-[0.3em] uppercase opacity-80">Estudio Creativo</p>
                         </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-bold tracking-tight mb-2">RECIBO</h2>
                        <div className="text-xs opacity-80 space-y-1">
                            <div className="flex justify-between gap-8"><span>NRO:</span> <span className="font-mono">{pdfPreview.id.replace('VEN-', '')}</span></div>
                            <div className="flex justify-between gap-8"><span>EMISIÓN:</span> <span>{pdfPreview.date}</span></div>
                        </div>
                    </div>
                </div>

                <div className="p-12">
                    {/* INFO GRID */}
                    <div className="flex justify-between mb-16 text-sm">
                        <div className="w-1/2">
                            <p className="font-bold text-gray-900 mb-2">Cliente:</p>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{pdfPreview.clientName}</h3>
                            <p className="text-gray-500">Calle Sin Nombre #123</p>
                            <p className="text-gray-500">Santa Cruz, Bolivia</p>
                        </div>
                        <div className="w-1/2 text-right">
                            <h3 className="font-bold text-gray-900 mb-1">{settings.companyName}</h3>
                            <p className="text-gray-500">{settings.address}</p>
                            <p className="text-gray-500">{settings.phone}</p>
                            <p className="text-gray-500">{settings.website}</p>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="mb-12">
                        <div className="bg-[#1e293b] text-white flex px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-t-sm" style={{ backgroundColor: settings.primaryColor }}>
                            <div className="flex-1">Descripción</div>
                            <div className="w-24 text-center">Cantidad</div>
                            <div className="w-32 text-right">Precio</div>
                            <div className="w-32 text-right">Total</div>
                        </div>
                        <div className="divide-y divide-gray-100 border-x border-b border-gray-100">
                            {pdfPreview.items.map((item, idx) => (
                                <div key={idx} className={`flex px-6 py-4 text-sm ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <div className="flex-1 font-medium text-gray-800">{item.description}</div>
                                    <div className="w-24 text-center text-gray-600">{item.quantity}</div>
                                    <div className="w-32 text-right text-gray-600">{formatCurrency(item.unitPrice)}</div>
                                    <div className="w-32 text-right font-bold text-gray-900">{formatCurrency(item.total)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALS & PAYMENT INFO */}
                    <div className="flex justify-between items-start mb-20">
                        <div className="w-1/2 pr-12">
                            <h4 className="font-bold text-gray-900 mb-2 text-sm">Método de pago</h4>
                            <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed mb-4">
                                {settings.paymentInfo || 'Efectivo / Transferencia'}
                            </div>
                            {pdfPreview.paymentStatus !== 'Paid' && (
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                                    Nota: Saldo Pendiente de {formatCurrency(pdfPreview.balance)}
                                </p>
                            )}
                        </div>
                        <div className="w-1/2 pl-12">
                             <div className="flex justify-between py-2 text-sm text-gray-600 font-bold mb-1">
                                 <span>SUB TOTAL</span>
                                 <span>{formatCurrency(pdfPreview.subtotal)}</span>
                             </div>
                             {pdfPreview.tax > 0 && (
                                 <div className="flex justify-between py-2 text-sm text-gray-600 font-bold mb-1">
                                     <span>{settings.taxName} ({settings.taxRate}%)</span>
                                     <span>{formatCurrency(pdfPreview.tax)}</span>
                                 </div>
                             )}
                             {pdfPreview.amountPaid > 0 && (
                                <div className="flex justify-between py-2 text-sm text-green-600 font-bold border-b border-gray-200 mb-2">
                                    <span>ANTICIPO / PAGADO</span>
                                    <span>- {formatCurrency(pdfPreview.amountPaid)}</span>
                                </div>
                             )}
                             <div className="flex justify-between py-3 text-xl font-bold text-gray-900 border-b-2 border-gray-900" style={{ borderColor: settings.primaryColor }}>
                                 <span>TOTAL {pdfPreview.paymentStatus !== 'Paid' ? 'PENDIENTE' : ''}</span>
                                 <span>{formatCurrency(pdfPreview.balance)}</span>
                             </div>
                        </div>
                    </div>

                    {/* FOOTER & SIGNATURE */}
                    <div className="flex justify-between items-end mt-auto">
                        <div className="w-2/3">
                            <h4 className="font-bold text-gray-900 mb-2 text-sm">Términos y condiciones</h4>
                            <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                                {settings.termsAndConditions || 'Para iniciar cualquier proyecto se requiere anticipo.'}
                            </p>
                            <p className="text-xs font-bold text-gray-900 mt-6 uppercase tracking-widest">¡MUCHAS GRACIAS!</p>
                        </div>
                        <div className="text-center">
                            <div className="h-16 w-40 border-b border-gray-400 mb-2 mx-auto"></div>
                            <p className="text-xs font-bold text-gray-900">Ariel Espinoza Heredia</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">CEO PROPIETARIO</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center border-t border-gray-100 pt-4">
                         <p className="text-xs text-gray-400 tracking-widest">{settings.website}</p>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};