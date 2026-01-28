import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Mail, Phone, MapPin, Edit3, Trash2, X, RefreshCw, ChevronRight, Check, Briefcase, ShoppingBag, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Client, Sale } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>(() => {
      const saved = localStorage.getItem('crm_clients');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [sales, setSales] = useState<Sale[]>(() => {
      const saved = localStorage.getItem('crm_sales_history');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [isLoaded, setIsLoaded] = useState(false); 

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Client' | 'Prospect'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Detail Drawer State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerTab, setDrawerTab] = useState<'Info' | 'History'>('Info');

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', company: '', email: '', phone: '', address: '', type: 'Prospect', notes: ''
  });

  // Fetch from cloud on mount
  useEffect(() => {
      const fetchClients = async () => {
          try {
              const docSnap = await getDoc(doc(db, 'crm_data', 'clients'));
              if (docSnap.exists()) {
                  const list = docSnap.data().list;
                  setClients(list);
                  localStorage.setItem('crm_clients', JSON.stringify(list));
              }
              const salesSnap = await getDoc(doc(db, 'crm_data', 'sales_history'));
              if(salesSnap.exists()) {
                  setSales(salesSnap.data().list);
                  localStorage.setItem('crm_sales_history', JSON.stringify(salesSnap.data().list));
              }
          } catch (e) { console.error("Error fetching data", e); }
          finally { setIsLoaded(true); }
      };
      fetchClients();
  }, []);

  const syncToFirestore = async (updatedClients: Client[]) => {
      try {
          await setDoc(doc(db, 'crm_data', 'clients'), { list: updatedClients });
      } catch (e) {}
  };

  useEffect(() => {
      if (!isLoaded) return;
      localStorage.setItem('crm_clients', JSON.stringify(clients));
      syncToFirestore(clients);
  }, [clients, isLoaded]);

  // --- Excel Logic ---
  const handleExportExcel = () => {
      const dataToExport = clients.map(c => ({
          ID: c.id,
          Nombre: c.name,
          Empresa: c.company,
          Email: c.email,
          Telefono: c.phone,
          Direccion: c.address,
          Tipo: c.type === 'Client' ? 'Cliente' : 'Prospecto',
          Notas: c.notes
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, "Clientes_BramaStudio.xlsx");
  };

  const handleDownloadTemplate = () => {
      const template = [
          { Nombre: "Ejemplo Juan", Empresa: "Empresa S.A.", Email: "juan@ejemplo.com", Telefono: "70012345", Direccion: "Av. Siempre Viva", Tipo: "Cliente", Notas: "Nota opcional" }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
      XLSX.writeFile(wb, "Plantilla_Importar_Clientes.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const newClients: Client[] = data.map((row: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: row.Nombre || 'Sin Nombre',
              company: row.Empresa || '',
              email: row.Email || '',
              phone: row.Telefono || '',
              address: row.Direccion || '',
              type: row.Tipo === 'Cliente' ? 'Client' : 'Prospecto',
              notes: row.Notas || '',
              avatar: `https://ui-avatars.com/api/?name=${row.Nombre}&background=random`
          }));

          if (confirm(`¿Importar ${newClients.length} clientes encontrados en el archivo?`)) {
              setClients(prev => [...prev, ...newClients]);
              alert('Clientes importados exitosamente.');
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
  };

  // --- Standard Logic ---
  const handleEdit = (client: Client) => {
    setFormData(client);
    setEditingId(client.id);
    setIsModalOpen(true);
    setSelectedClient(null); 
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar cliente?')) {
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    }
  };

  const handleConvertToClient = (client: Client) => {
      if (confirm(`¿Convertir a ${client.name} en Cliente oficial?`)) {
          const updatedClient = { ...client, type: 'Client' as const };
          setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
          setSelectedClient(updatedClient);
      }
  };

  const openNewClient = () => {
    setEditingId(null);
    setFormData({ name: '', company: '', email: '', phone: '', address: '', type: 'Prospect', notes: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        setClients(prev => prev.map(c => c.id === editingId ? { ...c, ...formData } as Client : c));
    } else {
        const newClient: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name: formData.name || 'Nuevo Cliente',
            company: formData.company || '',
            email: formData.email || '',
            phone: formData.phone || '',
            address: formData.address,
            type: formData.type as any,
            avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=random`,
            notes: formData.notes
        };
        setClients(prev => [...prev, newClient]);
    }
    setIsModalOpen(false);
  };

  const filteredClients = clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'All' ? true : c.type === activeTab;
      return matchesSearch && matchesTab;
  });

  const getClientHistory = (client: Client) => {
      return sales.filter(s => s.clientName === client.name || s.clientId === client.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-500">Gestiona tu cartera de clientes y prospectos</p>
        </div>
        <div className="flex flex-wrap gap-2">
             {!isLoaded && <span className="text-xs text-brand-900 flex items-center gap-1"><RefreshCw className="animate-spin" size={12}/> Sync</span>}
            
            <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2" title="Descargar formato">
                <FileSpreadsheet size={16}/> <span className="hidden sm:inline">Plantilla</span>
            </button>
            <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 w-full opacity-0 cursor-pointer" title="Importar Excel"/>
                <button className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                    <Upload size={16}/> <span className="hidden sm:inline">Importar</span>
                </button>
            </div>
            <button onClick={handleExportExcel} className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                <Download size={16}/> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={openNewClient} disabled={!isLoaded} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus size={16} /> Nuevo
            </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
              <button onClick={() => setActiveTab('All')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
              <button onClick={() => setActiveTab('Client')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'Client' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}>Clientes</button>
              <button onClick={() => setActiveTab('Prospect')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'Prospect' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-orange-500'}`}>Prospectos</button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar nombre, empresa..." className="w-full pl-9 pr-4 py-2 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"/>
          </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Nombre / Empresa</div>
          <div className="col-span-3">Correo Electrónico</div>
          <div className="col-span-3">Teléfono</div>
          <div className="col-span-2 text-right">Estado</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-12">
        {filteredClients.map(client => (
          <div key={client.id} onClick={() => { setSelectedClient(client); setDrawerTab('Info'); }} className={`bg-white rounded-xl p-4 border transition-all cursor-pointer group hover:shadow-md ${selectedClient?.id === client.id ? 'border-brand-500 ring-1 ring-brand-200 bg-brand-50/10' : 'border-gray-100 hover:border-brand-200'}`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold border border-gray-200">{client.name.charAt(0)}</div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{client.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{client.company || 'Particular'}</p>
                    </div>
                </div>
                
                {/* Mobile: Show contact info in a cleaner way */}
                <div className="col-span-1 md:col-span-3 flex md:hidden flex-col gap-1 mt-1">
                     <div className="flex items-center text-xs text-gray-600"><Mail size={12} className="mr-2 text-gray-400"/>{client.email || 'No email'}</div>
                     <div className="flex items-center text-xs text-gray-600"><Phone size={12} className="mr-2 text-gray-400"/>{client.phone || 'No telf.'}</div>
                </div>

                <div className="hidden md:flex col-span-3 items-center text-xs text-gray-600 font-medium truncate"><Mail size={14} className="text-gray-300 mr-2 flex-shrink-0"/><span className="truncate">{client.email || '---'}</span></div>
                <div className="hidden md:flex col-span-3 items-center text-xs text-gray-600 font-medium truncate"><Phone size={14} className="text-gray-300 mr-2 flex-shrink-0"/><span className="truncate">{client.phone || '---'}</span></div>
                
                <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-0 border-gray-50">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${client.type === 'Client' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{client.type === 'Client' ? 'Cliente' : 'Prospecto'}</span>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-900 transition-colors hidden md:block"/>
                </div>
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && <div className="text-center py-20 text-gray-400"><p>No se encontraron registros.</p></div>}
      </div>

      {/* Client Details Drawer */}
      {selectedClient && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-40 border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4 items-center">
                          <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-2xl font-bold text-gray-700">{selectedClient.name.charAt(0)}</div>
                          <div><h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2><p className="text-sm text-gray-500 font-medium">{selectedClient.company}</p></div>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="flex gap-4 border-b border-gray-200">
                      <button onClick={() => setDrawerTab('Info')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${drawerTab === 'Info' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Información</button>
                      <button onClick={() => setDrawerTab('History')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${drawerTab === 'History' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Historial Compras</button>
                  </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                  {drawerTab === 'Info' ? (
                      <div className="space-y-6">
                          {selectedClient.type === 'Prospect' ? (
                              <button onClick={() => handleConvertToClient(selectedClient)} className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold text-sm hover:bg-brand-800 shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 transition-all"><Briefcase size={16} /> Convertir a Cliente</button>
                          ) : (
                              <div className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Check size={16} /> Cliente Verificado</div>
                          )}

                          <div className="space-y-4">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Información de Contacto</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Mail size={16}/></div>{selectedClient.email || <span className="text-gray-400 italic">No registrado</span>}</div>
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Phone size={16}/></div>{selectedClient.phone || <span className="text-gray-400 italic">No registrado</span>}</div>
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><MapPin size={16}/></div>{selectedClient.address || <span className="text-gray-400 italic">No registrada</span>}</div>
                          </div>

                          {selectedClient.notes && (
                              <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 mb-3">Notas Internas</h3>
                                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 leading-relaxed">{selectedClient.notes}</div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {getClientHistory(selectedClient).length > 0 ? (
                              getClientHistory(selectedClient).map(sale => (
                                  <div key={sale.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                      <div>
                                          <p className="text-sm font-bold text-gray-900">{new Date(sale.date).toLocaleDateString()}</p>
                                          <p className="text-xs text-gray-500">Venta: {sale.id}</p>
                                          <div className="text-xs text-gray-600 mt-1">{sale.items.length} artículos: {sale.items.map(i => i.description).join(', ').substring(0, 30)}...</div>
                                      </div>
                                      <div className="text-right">
                                          <span className="block font-bold text-brand-900">Bs. {sale.total}</span>
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}</span>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-10 text-gray-400">
                                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-20"/>
                                  <p className="text-sm">Sin compras registradas.</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {drawerTab === 'Info' && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                      <button onClick={() => handleEdit(selectedClient)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm transition-colors"><Edit3 size={16}/> Editar</button>
                      <button onClick={() => handleDelete(selectedClient.id)} className="flex-1 py-2.5 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 shadow-sm transition-colors"><Trash2 size={16}/> Eliminar</button>
                  </div>
              )}
          </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-lg text-gray-900">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}><option value="Prospect">Prospecto</option><option value="Client">Cliente</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label><textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 h-20 resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Información adicional..." /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors bg-white">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-xl font-medium hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};