
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Mail, Phone, MapPin, Edit3, Trash2, X, RefreshCw, ChevronRight, Check, Briefcase, ShoppingBag, Upload, Download, FileSpreadsheet, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
import { Client, Sale, AppSettings, Project } from '../types';
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

  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('crm_projects');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); 

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Client' | 'Prospect'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Detail Drawer State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerTab, setDrawerTab] = useState<'Info' | 'History'>('Info');

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', company: '', nit: '', email: '', phone: '', address: '', type: 'Prospect', notes: ''
  });

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
              const projSnap = await getDoc(doc(db, 'crm_data', 'projects'));
              if(projSnap.exists()) {
                  setProjects(projSnap.data().list);
                  localStorage.setItem('crm_projects', JSON.stringify(projSnap.data().list));
              }
              const settingsSnap = await getDoc(doc(db, 'crm_data', 'settings'));
              if(settingsSnap.exists()) {
                  setSettings(settingsSnap.data() as AppSettings);
              }
          } catch (e) { console.error("Error fetching data", e); }
          finally { setIsLoaded(true); }
      };
      fetchClients();
  }, []);

  useEffect(() => {
      if (!isLoaded) return;
      localStorage.setItem('crm_clients', JSON.stringify(clients));
      setDoc(doc(db, 'crm_data', 'clients'), { list: clients }).catch(()=>{});
  }, [clients, isLoaded]);

  // Calculate LTV
  const getClientLTV = (client: Client) => {
      return sales
        .filter(s => s.clientId === client.id || s.clientName === client.name)
        .reduce((sum, s) => sum + s.total, 0);
  };

  const handleExportExcel = () => {
      const dataToExport = clients.map(c => ({
          ID: c.id,
          Nombre: c.name,
          Empresa: c.company,
          [settings?.taxIdLabel || 'NIT']: c.nit,
          Email: c.email,
          Telefono: c.phone,
          Direccion: c.address,
          Tipo: c.type === 'Client' ? 'Cliente' : 'Prospecto',
          Compras_Totales: getClientLTV(c),
          Notas: c.notes
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, "Clientes_BramaStudio.xlsx");
  };

  const handleDownloadTemplate = () => {
      const taxLabel = settings?.taxIdLabel || 'NIT';
      const template = [
          { Nombre: "Ejemplo Juan", Empresa: "Empresa S.A.", [taxLabel]: "1234567", Email: "juan@ejemplo.com", Telefono: "70012345", Direccion: "Av. Siempre Viva", Tipo: "Cliente", Notas: "Nota opcional" }
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
          const taxLabel = settings?.taxIdLabel || 'NIT';

          let importedCount = 0;
          let duplicatesSkipped = 0;

          const newClients: Client[] = [];
          
          data.forEach((row: any) => {
              const name = row.Nombre || 'Sin Nombre';
              const email = row.Email || '';
              
              const exists = clients.some(c => 
                  c.name.toLowerCase() === name.toLowerCase() || 
                  (email && c.email.toLowerCase() === email.toLowerCase())
              );

              if (!exists) {
                  newClients.push({
                      id: Math.random().toString(36).substr(2, 9),
                      name: name,
                      company: row.Empresa || '',
                      nit: row[taxLabel] || row['NIT'] || '',
                      email: email,
                      phone: row.Telefono || '',
                      address: row.Direccion || '',
                      type: row.Tipo === 'Cliente' ? 'Client' : 'Prospect',
                      notes: row.Notas || '',
                      avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
                  });
                  importedCount++;
              } else {
                  duplicatesSkipped++;
              }
          });

          if (newClients.length > 0) {
              if (confirm(`Se encontraron ${importedCount} clientes nuevos (${duplicatesSkipped} duplicados omitidos). ¿Importar ahora?`)) {
                  setClients(prev => [...prev, ...newClients]);
                  alert('Clientes importados exitosamente.');
              }
          } else {
              alert('No se encontraron clientes nuevos para importar.');
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; 
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
    setEditingId(client.id);
    setIsModalOpen(true);
    setSelectedClient(null); 
  };

  const handleDelete = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const hasSales = sales.some(s => s.clientId === id || s.clientName === client.name);
    const hasProjects = projects.some(p => p.client === client.name); 

    if (hasSales || hasProjects) {
        alert('ADVERTENCIA: No se puede eliminar este cliente porque tiene ventas o proyectos asociados. Considere cambiar su estado a "Prospecto" o agregar una nota de "Inactivo" para mantener el historial.');
        return;
    }

    if (confirm('¿Eliminar cliente permanentemente? Esta acción no se puede deshacer.')) {
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    }
  };

  const handleConvertToClient = (client: Client) => {
      // Duplicate check for official clients (NIT/Email strictness)
      const duplicate = clients.find(c => c.type === 'Client' && c.id !== client.id && ( (c.nit && c.nit === client.nit) || (c.email && c.email === client.email) ));
      
      if (duplicate) {
          alert(`Error: Ya existe un Cliente con este NIT o Email (${duplicate.name}). Fusione los registros manualmente.`);
          return;
      }

      if (confirm(`¿Convertir a ${client.name} en Cliente oficial?`)) {
          const updatedClient = { ...client, type: 'Client' as const };
          setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
          setSelectedClient(updatedClient);
      }
  };

  const openNewClient = () => {
    setEditingId(null);
    setFormData({ name: '', company: '', nit: '', email: '', phone: '', address: '', type: 'Prospect', notes: '' });
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
            nit: formData.nit || '',
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

  const getClientProjects = (client: Client) => {
      return projects.filter(p => p.client === client.name);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-safe-area">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-500">Gestiona tu cartera de clientes y prospectos</p>
        </div>
        <div className="flex flex-wrap gap-2">
             {!isLoaded && <span className="text-xs text-brand-900 flex items-center gap-1"><RefreshCw className="animate-spin" size={12}/> Sync</span>}
            
            <button onClick={handleDownloadTemplate} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-h-[44px]" title="Descargar formato">
                <FileSpreadsheet size={18}/> <span className="hidden sm:inline">Plantilla</span>
            </button>
            <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 w-full opacity-0 cursor-pointer" title="Importar Excel"/>
                <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-h-[44px]">
                    <Upload size={18}/> <span className="hidden sm:inline">Importar</span>
                </button>
            </div>
            <button onClick={handleExportExcel} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 min-h-[44px]">
                <Download size={18}/> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={openNewClient} disabled={!isLoaded} className="flex items-center gap-2 px-5 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                <Plus size={18} /> Nuevo
            </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
              <button onClick={() => setActiveTab('All')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all min-h-[40px] ${activeTab === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
              <button onClick={() => setActiveTab('Client')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all min-h-[40px] ${activeTab === 'Client' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}>Clientes</button>
              <button onClick={() => setActiveTab('Prospect')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all min-h-[40px] ${activeTab === 'Prospect' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-orange-500'}`}>Prospectos</button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar nombre, empresa..." className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 border border-gray-100 rounded-lg focus:border-brand-300 transition-colors"/>
          </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100 rounded-t-xl border-b border-gray-200">
          <div className="col-span-4">Nombre / Empresa</div>
          <div className="col-span-3">Contacto</div>
          <div className="col-span-3 text-right">Compras (LTV)</div>
          <div className="col-span-2 text-right">Estado</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-12 bg-white md:bg-transparent rounded-b-xl border border-gray-100 md:border-none">
        {filteredClients.map(client => {
            const ltv = getClientLTV(client);
            return (
              <div key={client.id} onClick={() => { setSelectedClient(client); setDrawerTab('Info'); }} className={`bg-white rounded-xl p-4 border transition-all cursor-pointer group hover:shadow-md relative overflow-hidden ${selectedClient?.id === client.id ? 'border-brand-500 ring-1 ring-brand-200 bg-brand-50/10' : 'border-gray-100 hover:border-brand-200'}`}>
                {/* Mobile Status Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:hidden ${client.type === 'Client' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pl-3 md:pl-0">
                    <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold border border-gray-200">{client.name.charAt(0)}</div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{client.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{client.company || 'Particular'}</p>
                        </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-3">
                         <div className="flex items-center text-xs text-gray-600 truncate"><Mail size={12} className="mr-2 text-gray-400"/>{client.email || '--'}</div>
                         <div className="flex items-center text-xs text-gray-600 truncate mt-1"><Phone size={12} className="mr-2 text-gray-400"/>{client.phone || '--'}</div>
                    </div>

                    <div className="col-span-3 text-right hidden md:block">
                        <span className={`text-sm font-bold ${ltv > 0 ? 'text-brand-900' : 'text-gray-400'}`}>Bs. {ltv.toLocaleString()}</span>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-0 border-gray-50">
                        <div className="md:hidden font-bold text-brand-900 text-sm">Bs. {ltv.toLocaleString()}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${client.type === 'Client' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{client.type === 'Client' ? 'Cliente' : 'Prospecto'}</span>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-900 transition-colors hidden md:block"/>
                    </div>
                </div>
              </div>
            );
        })}
        {filteredClients.length === 0 && <div className="text-center py-20 text-gray-400"><p>No se encontraron registros.</p></div>}
      </div>

      {/* Client Details Drawer */}
      {selectedClient && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-[100] border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4 items-center">
                          <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-2xl font-bold text-gray-700">{selectedClient.name.charAt(0)}</div>
                          <div><h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2><p className="text-sm text-gray-500 font-medium">{selectedClient.company}</p></div>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="flex gap-4 border-b border-gray-200">
                      <button onClick={() => setDrawerTab('Info')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${drawerTab === 'Info' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Información</button>
                      <button onClick={() => setDrawerTab('History')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${drawerTab === 'History' ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Historial</button>
                  </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                  {drawerTab === 'Info' ? (
                      <div className="space-y-6">
                          {selectedClient.type === 'Prospect' ? (
                              <button onClick={() => handleConvertToClient(selectedClient)} className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold text-sm hover:bg-brand-800 shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"><Briefcase size={18} /> Convertir a Cliente</button>
                          ) : (
                              <div className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold text-sm flex items-center justify-center gap-2 min-h-[48px]"><Check size={18} /> Cliente Verificado</div>
                          )}

                          <div className="space-y-4">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Información de Contacto</h3>
                              {selectedClient.nit && (
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><CreditCard size={16}/></div>
                                    <span className="font-mono">{selectedClient.nit} <span className="text-xs text-gray-400 ml-1">({settings?.taxIdLabel || 'NIT'})</span></span>
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Mail size={16}/></div>{selectedClient.email || <span className="text-gray-400 italic">No registrado</span>}</div>
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Phone size={16}/></div>{selectedClient.phone || <span className="text-gray-400 italic">No registrado</span>}</div>
                              <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><MapPin size={16}/></div>{selectedClient.address || <span className="text-gray-400 italic">No registrada</span>}</div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resumen de Actividad</h3>
                              <div className="grid grid-cols-2 gap-4 text-center">
                                  <div>
                                      <p className="text-2xl font-bold text-gray-900">{getClientHistory(selectedClient).length}</p>
                                      <p className="text-[10px] text-gray-500 uppercase">Compras</p>
                                  </div>
                                  <div>
                                      <p className="text-2xl font-bold text-gray-900">{getClientProjects(selectedClient).length}</p>
                                      <p className="text-[10px] text-gray-500 uppercase">Proyectos</p>
                                  </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                                  <p className="text-xs text-gray-500 uppercase mb-1">Valor Total (LTV)</p>
                                  <p className="text-xl font-black text-brand-900">Bs. {getClientLTV(selectedClient).toLocaleString()}</p>
                              </div>
                          </div>

                          {selectedClient.notes && (
                              <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 mb-3">Notas Internas</h3>
                                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 leading-relaxed">{selectedClient.notes}</div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-6">
                          {/* Active Projects */}
                          <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Proyectos Activos</h3>
                              {getClientProjects(selectedClient).length > 0 ? (
                                  getClientProjects(selectedClient).map(p => (
                                      <div key={p.id} className="mb-3 bg-white border border-gray-200 p-3 rounded-lg flex justify-between items-center shadow-sm">
                                          <div>
                                              <p className="text-sm font-bold text-gray-900">{p.title}</p>
                                              <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-md text-gray-600 uppercase">{p.status}</span>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-xs text-gray-500">{new Date(p.dueDate).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                  ))
                              ) : <p className="text-sm text-gray-400 italic">No tiene proyectos.</p>}
                          </div>

                          {/* Sales History */}
                          <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Historial de Compras</h3>
                              {getClientHistory(selectedClient).length > 0 ? (
                                  getClientHistory(selectedClient).map(sale => (
                                      <div key={sale.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center mb-2">
                                          <div>
                                              <p className="text-sm font-bold text-gray-900">{new Date(sale.date).toLocaleDateString()}</p>
                                              <p className="text-xs text-gray-500">Venta: {sale.id}</p>
                                              <div className="text-xs text-gray-600 mt-1">{sale.items.length} artículos.</div>
                                          </div>
                                          <div className="text-right">
                                              <span className="block font-bold text-brand-900">Bs. {sale.total}</span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}</span>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center py-4 text-gray-400">
                                      <ShoppingBag size={24} className="mx-auto mb-2 opacity-20"/>
                                      <p className="text-sm">Sin compras registradas.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              {drawerTab === 'Info' && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                      <button onClick={() => handleEdit(selectedClient)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[48px]"><Edit3 size={18}/> Editar</button>
                      <button onClick={() => handleDelete(selectedClient.id)} className="flex-1 py-3 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[48px]"><Trash2 size={18}/> Eliminar</button>
                  </div>
              )}
          </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-lg text-gray-900">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">{settings?.taxIdLabel || 'NIT'}</label><input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[44px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <div className="relative">
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 appearance-none min-h-[44px]" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}><option value="Prospect" className="bg-white text-gray-900">Prospecto</option><option value="Client" className="bg-white text-gray-900">Cliente</option></select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={16}/>
                  </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label><textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 h-24 resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Información adicional..." /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors bg-white min-h-[48px]">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20 min-h-[48px]">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
