import React, { useState, useRef, useEffect } from 'react';
import { FileText, Search, Filter, Download, MessageCircle, Plus, Trash2, X, Eye, Edit3, Save } from 'lucide-react';
import { Quote, QuoteItem, AppSettings, Client } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Mock initial Data (kept for demo)
const initialQuotes: Quote[] = [
  { 
      id: 'COT-2023-001', 
      clientName: 'Juan Perez', 
      date: '2023-10-24', 
      validUntil: '2023-11-24',
      subtotal: 1500,
      tax: 0,
      total: 1500, 
      status: 'Approved', 
      items: [
          { id: '1', description: 'Diseño de Logo', quantity: 1, unitPrice: 1500, total: 1500 }
      ] 
  },
];

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113, Santa Cruz, Bolivia',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836',
    paymentInfo: 'Banco Ganadero\nCuenta: 123-45678-9',
    termsAndConditions: 'Validez: 15 días.',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA'
};

export const Quotations = () => {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  // Client Selection
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Tax Toggle State for the current form
  const [taxEnabled, setTaxEnabled] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load settings
  useEffect(() => {
      const saved = localStorage.getItem('crm_settings');
      if (saved) setSettings(JSON.parse(saved));

      const savedClients = localStorage.getItem('crm_clients');
      if (savedClients) setAvailableClients(JSON.parse(savedClients));
  }, []);

  // Form State
  const [newQuote, setNewQuote] = useState<Partial<Quote>>({
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Draft',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0
  });

  const formatCurrency = (amount: number) => {
      const val = amount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
      return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
  };

  // Recalculate totals whenever items or taxEnabled changes
  useEffect(() => {
      const sub = newQuote.items?.reduce((acc, item) => acc + item.total, 0) || 0;
      const tax = taxEnabled ? sub * (settings.taxRate / 100) : 0;
      const total = sub + tax;
      setNewQuote(prev => ({ ...prev, subtotal: sub, tax, total }));
  }, [newQuote.items, taxEnabled, settings.taxRate]);

  const addItem = () => {
      const newItem: QuoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
      };
      setNewQuote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
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
      setTaxEnabled(!!quote.taxEnabled); // Restore tax toggle state
      setEditingId(quote.id);
      setIsModalOpen(true);
  };

  const handleSelectClient = (client: Client) => {
      setNewQuote(prev => ({ ...prev, clientName: client.name }));
      setIsClientModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      const quoteData: Quote = {
          ...(newQuote as Quote),
          taxEnabled: taxEnabled // Persist tax state
      };

      if (editingId) {
          setQuotes(prev => prev.map(q => q.id === editingId ? { ...quoteData, id: editingId } : q));
      } else {
          const quoteId = `COT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`;
          setQuotes([{ ...quoteData, id: quoteId }, ...quotes]);
      }
      setIsModalOpen(false);
  };

  const handleShareWhatsApp = (quote: Quote) => {
     const itemsList = quote.items.map(i => `- ${i.description} (${i.quantity} x ${formatCurrency(i.unitPrice)})`).join('%0A');
     const text = `Hola *${quote.clientName}*,%0A%0AEspero que estés muy bien.%0A%0ADesde *${settings.companyName}* te enviamos el detalle de la cotización *${quote.id}*:%0A%0A${itemsList}%0A%0A*Total: ${formatCurrency(quote.total)}*%0A%0ADescarga el PDF adjunto para más detalle.%0A%0ASaludos,%0AEquipo ${settings.companyName}`;
     window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const preparePDFDownload = (quote: Quote) => {
      setPdfPreview(quote);
      setTimeout(() => {
          if (printRef.current) {
              html2canvas(printRef.current, { scale: 2, useCORS: true }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`Cotizacion_${quote.id}.pdf`);
                  setPdfPreview(null);
              });
          }
      }, 500);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Approved: 'bg-green-100 text-green-700',
      Sent: 'bg-blue-100 text-blue-700',
      Draft: 'bg-gray-100 text-gray-700',
      Paid: 'bg-purple-100 text-purple-700',
      Rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.Draft}`}>
        {status === 'Approved' ? 'Aprobado' : status === 'Sent' ? 'Enviado' : status === 'Draft' ? 'Borrador' : status}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative h-full">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Administra tus propuestas comerciales</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
                setEditingId(null);
                setNewQuote({
                    clientName: '', date: new Date().toISOString().split('T')[0],
                    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Draft', items: [], subtotal: 0, tax: 0, total: 0
                });
                setTaxEnabled(false);
                addItem(); 
                setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-all active:scale-95"
          >
            <Plus size={16} /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cotizaciones..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all shadow-sm text-gray-900"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {quotes.filter(q => 
                    q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    q.id.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setViewingQuote(quote)}>
                    <td className="px-6 py-4 text-sm font-medium text-brand-900">{quote.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{quote.clientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{quote.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(quote.total)}</td>
                    <td className="px-6 py-4 text-sm"><StatusBadge status={quote.status} /></td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                        <button onClick={() => preparePDFDownload(quote)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg tooltip transition-colors" title="Descargar PDF">
                             <Download size={18} />
                        </button>
                        <button onClick={() => setViewingQuote(quote)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye size={18} />
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* CREATE / EDIT Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
                <p className="text-sm text-gray-500">Detalles de la propuesta</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full border border-gray-200"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
                   <div className="flex gap-2">
                       <input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                          value={newQuote.clientName} onChange={e => setNewQuote({...newQuote, clientName: e.target.value})} placeholder="Nombre del cliente"/>
                       <button type="button" onClick={() => setIsClientModalOpen(true)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200" title="Buscar Cliente">
                            <Search size={20} />
                       </button>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha Emisión</label>
                   <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                      value={newQuote.date} onChange={e => setNewQuote({...newQuote, date: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Válida Hasta</label>
                   <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                      value={newQuote.validUntil} onChange={e => setNewQuote({...newQuote, validUntil: e.target.value})} />
                </div>
              </div>

              <div>
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-800">Ítems / Servicios</h4>
                    <button type="button" onClick={addItem} className="text-sm flex items-center gap-1.5 text-brand-900 font-medium bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors">
                        <Plus size={16} /> Agregar
                    </button>
                 </div>
                 <div className="space-y-3">
                     {newQuote.items?.map((item) => (
                         <div key={item.id} className="flex gap-4 items-start bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                             <div className="flex-1">
                                 <input type="text" placeholder="Descripción" className="w-full bg-transparent border-b border-gray-300 focus:border-brand-900 outline-none px-1 py-1 text-sm text-gray-900"
                                    value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} required />
                             </div>
                             <div className="w-20">
                                 <input type="number" placeholder="Cant." min="1" className="w-full bg-transparent border-b border-gray-300 focus:border-brand-900 outline-none px-1 py-1 text-sm text-center text-gray-900"
                                    value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                             </div>
                             <div className="w-24">
                                 <input type="number" placeholder="Precio" min="0" className="w-full bg-transparent border-b border-gray-300 focus:border-brand-900 outline-none px-1 py-1 text-sm text-right text-gray-900"
                                    value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                             </div>
                             <div className="w-28 text-right text-sm font-medium py-1 text-gray-700">{formatCurrency(item.total)}</div>
                             <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                         </div>
                     ))}
                 </div>
              </div>

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
                 <div className="space-y-1 text-right pt-2">
                     <div className="text-sm text-gray-500 flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(newQuote.subtotal || 0)}</span></div>
                     {taxEnabled && (
                        <div className="text-sm text-gray-500 flex justify-between"><span>{settings.taxName} ({settings.taxRate}%):</span> <span>{formatCurrency(newQuote.tax || 0)}</span></div>
                     )}
                     <div className="text-xl font-bold text-gray-900 flex justify-between pt-2 border-t border-gray-200 mt-2"><span>Total:</span> <span>{formatCurrency(newQuote.total || 0)}</span></div>
                 </div>
              </div>

              <div className="grid grid-cols-1">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Notas Adicionales</label>
                 <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900 text-sm h-24 resize-none"
                    value={newQuote.notes} onChange={e => setNewQuote({...newQuote, notes: e.target.value})}></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 bg-white">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-brand-900 text-white rounded-xl hover:bg-brand-800 shadow-lg shadow-brand-900/20 flex items-center gap-2">
                    <Save size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT SELECTION MODAL */}
      {isClientModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900">Seleccionar Cliente</h3>
                      <button onClick={() => setIsClientModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  <div className="p-4 bg-white border-b border-gray-50">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar cliente..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-900/10"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="p-2 overflow-y-auto max-h-[300px]">
                      {availableClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
                          <div key={client.id} onClick={() => handleSelectClient(client)} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg border-b border-gray-50 last:border-0">
                              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center text-xs font-bold">{client.name.charAt(0)}</div>
                              <div>
                                  <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.company || 'Sin empresa'}</p>
                              </div>
                          </div>
                      ))}
                      {availableClients.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No hay clientes registrados.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* DETAIL Modal (View Only) */}
      {viewingQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                     <h3 className="font-bold text-lg text-gray-900">Detalle Cotización</h3>
                     <button onClick={() => setViewingQuote(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm text-gray-500">Cliente</p>
                            <h4 className="font-bold text-gray-900 text-lg">{viewingQuote.clientName}</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Monto Total</p>
                            <h4 className="font-bold text-brand-900 text-xl">{formatCurrency(viewingQuote.total)}</h4>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                         <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Ítems</h5>
                         <ul className="space-y-2">
                             {viewingQuote.items.map(i => (
                                 <li key={i.id} className="flex justify-between text-sm">
                                     <span className="text-gray-700">{i.quantity} x {i.description}</span>
                                     <span className="font-medium text-gray-900">{formatCurrency(i.total)}</span>
                                 </li>
                             ))}
                         </ul>
                    </div>
                    <div className="flex flex-col gap-3">
                         <button onClick={() => openEdit(viewingQuote)} className="w-full flex justify-center items-center gap-2 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                             <Edit3 size={18} /> Editar Cotización
                         </button>
                         <button onClick={() => handleShareWhatsApp(viewingQuote)} className="w-full flex justify-center items-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
                             <MessageCircle size={18} /> Enviar WhatsApp
                         </button>
                         <button onClick={() => preparePDFDownload(viewingQuote)} className="w-full flex justify-center items-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                             <Download size={18} /> Descargar PDF
                         </button>
                    </div>
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
                        <h2 className="text-4xl font-bold tracking-tight mb-2">COTIZACIÓN</h2>
                        <div className="text-xs opacity-80 space-y-1">
                            <div className="flex justify-between gap-8"><span>NRO:</span> <span className="font-mono">{pdfPreview.id.replace('COT-', '')}</span></div>
                            <div className="flex justify-between gap-8"><span>EMISIÓN:</span> <span>{pdfPreview.date}</span></div>
                            <div className="flex justify-between gap-8"><span>VÁLIDO HASTA:</span> <span>{pdfPreview.validUntil}</span></div>
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
                            <p className="text-gray-500 whitespace-pre-line">{settings.address}</p>
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
                        </div>
                        <div className="w-1/2 pl-12">
                             <div className="flex justify-between py-2 text-sm text-gray-600 font-bold mb-2">
                                 <span>SUB TOTAL</span>
                                 <span>{formatCurrency(pdfPreview.subtotal)}</span>
                             </div>
                             {pdfPreview.tax > 0 && (
                                <div className="flex justify-between py-2 text-sm text-gray-600 font-bold mb-2">
                                    <span>{settings.taxName} ({settings.taxRate}%)</span>
                                    <span>{formatCurrency(pdfPreview.tax)}</span>
                                </div>
                             )}
                             <div className="flex justify-between py-3 text-xl font-bold text-gray-900 border-b-2 border-gray-900" style={{ borderColor: settings.primaryColor }}>
                                 <span>TOTAL</span>
                                 <span>{formatCurrency(pdfPreview.total)}</span>
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