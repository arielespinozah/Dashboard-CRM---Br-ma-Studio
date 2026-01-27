import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Download, MessageCircle, Plus, Trash2, X, Eye, Save, DollarSign } from 'lucide-react';
import { Sale, QuoteItem, AppSettings } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Mock Data
const initialSales: Sale[] = [
  { 
      id: 'VEN-2023-001', 
      clientId: 'c1',
      clientName: 'Juan Perez', 
      date: '2023-10-24', 
      subtotal: 1500,
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
    termsAndConditions: ''
};

export const Sales = () => {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const saved = localStorage.getItem('crm_settings');
      if (saved) setSettings(JSON.parse(saved));
  }, []);

  // Form State
  const [newSale, setNewSale] = useState<Partial<Sale>>({
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      paymentStatus: 'Pending',
      paymentMethod: 'Cash',
      items: [],
      amountPaid: 0
  });

  const calculateTotals = (items: QuoteItem[]) => {
      const total = items.reduce((acc, item) => acc + item.total, 0);
      return total;
  };

  const addItem = () => {
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
      };
      const items = [...(newSale.items || []), newItem];
      setNewSale({ ...newSale, items, total: calculateTotals(items) });
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
      setNewSale({ ...newSale, items: updatedItems, total: calculateTotals(updatedItems) });
  };

  const removeItem = (id: string) => {
      const updatedItems = newSale.items?.filter(item => item.id !== id) || [];
      setNewSale({ ...newSale, items: updatedItems, total: calculateTotals(updatedItems) });
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
          clientId: 'temp', // Simplified
          subtotal: total,
          total: total,
          amountPaid: paid,
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
                    paymentStatus: 'Pending', paymentMethod: 'Cash', items: [], amountPaid: 0, total: 0
                });
                addItem(); 
                setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all active:scale-95"
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
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition-all shadow-sm text-gray-900"
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
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Bs. {sale.total}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">Bs. {sale.amountPaid}</td>
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
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Ítems</label>
                        <button type="button" onClick={addItem} className="text-sm text-brand-600 font-medium flex items-center gap-1"><Plus size={16}/> Agregar</button>
                     </div>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                         {newSale.items?.map(item => (
                             <div key={item.id} className="flex gap-2 items-center">
                                 <input type="text" placeholder="Desc" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none"
                                    value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} required />
                                 <input type="number" placeholder="#" className="w-16 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none"
                                    value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                 <input type="number" placeholder="$" className="w-24 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none"
                                    value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                 <div className="w-20 text-right text-sm font-bold">Bs. {item.total}</div>
                                 <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 p-1"><Trash2 size={16} /></button>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Payment Logic */}
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                     <div className="flex justify-between items-center mb-4">
                         <span className="text-lg font-bold text-gray-900">Total a Pagar:</span>
                         <span className="text-2xl font-bold text-gray-900">Bs. {newSale.total}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Monto Abonado / Anticipo</label>
                             <input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-bold text-lg" 
                                value={newSale.amountPaid} onChange={e => setNewSale({...newSale, amountPaid: Number(e.target.value)})} />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Pendiente</label>
                             <div className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-bold text-lg">
                                 Bs. {(newSale.total || 0) - (newSale.amountPaid || 0)}
                             </div>
                         </div>
                     </div>
                 </div>

                 <div className="flex justify-end gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-gray-200 rounded-xl bg-white text-gray-700">Cancelar</button>
                     <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-xl shadow-lg">Finalizar Venta</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* PDF TEMPLATE (PRO-FORMA STYLE) */}
      {pdfPreview && (
         <div className="fixed top-0 left-0 w-full h-0 overflow-hidden">
            <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans">
                {/* DARK HEADER */}
                <div className="bg-[#1e293b] text-white p-12 flex justify-between items-center">
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
                        <h2 className="text-4xl font-bold tracking-tight mb-2">PRO-FORMA</h2>
                        <div className="text-xs opacity-80 space-y-1">
                            <div className="flex justify-between gap-8"><span>INVOICE NRO:</span> <span className="font-mono">{pdfPreview.id.replace('VEN-', '')}</span></div>
                            <div className="flex justify-between gap-8"><span>EMISIÓN:</span> <span>{pdfPreview.date}</span></div>
                        </div>
                    </div>
                </div>

                <div className="p-12">
                    {/* INFO GRID */}
                    <div className="flex justify-between mb-16 text-sm">
                        <div className="w-1/2">
                            <p className="font-bold text-gray-900 mb-2">Cotización a:</p>
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
                        <div className="bg-[#1e293b] text-white flex px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-t-sm">
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
                                    <div className="w-32 text-right text-gray-600">{item.unitPrice.toLocaleString()} Bs</div>
                                    <div className="w-32 text-right font-bold text-gray-900">{item.total.toLocaleString()} Bs</div>
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
                                    Nota: Saldo Pendiente de Bs. {pdfPreview.balance}
                                </p>
                            )}
                        </div>
                        <div className="w-1/2 pl-12">
                             <div className="flex justify-between py-2 text-sm text-gray-600 font-bold mb-2">
                                 <span>SUB TOTAL</span>
                                 <span>{pdfPreview.subtotal.toLocaleString()} Bs</span>
                             </div>
                             {pdfPreview.amountPaid > 0 && (
                                <div className="flex justify-between py-2 text-sm text-green-600 font-bold border-b border-gray-200 mb-2">
                                    <span>ANTICIPO / PAGADO</span>
                                    <span>- {pdfPreview.amountPaid.toLocaleString()} Bs</span>
                                </div>
                             )}
                             <div className="flex justify-between py-3 text-xl font-bold text-gray-900 border-b-2 border-gray-900">
                                 <span>TOTAL {pdfPreview.paymentStatus !== 'Paid' ? 'PENDIENTE' : ''}</span>
                                 <span>{pdfPreview.balance.toLocaleString()} Bs</span>
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