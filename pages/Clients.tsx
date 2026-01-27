import React, { useState } from 'react';
import { Users, Search, Filter, Plus, Mail, Phone, MapPin, Edit3, Trash2, X, Save } from 'lucide-react';
import { Client } from '../types';

const initialClients: Client[] = [
  {
    id: '1',
    name: 'Juan Perez',
    company: 'Solar Gastronomía',
    email: 'juan@solar.com',
    phone: '77889900',
    address: 'Av. Banzer 4to Anillo',
    type: 'Client',
    notes: 'Cliente recurrente de diseño gráfico.'
  },
  {
    id: '2',
    name: 'Maria Rodriguez',
    company: 'Estudio A&B',
    email: 'maria@ab-legal.com',
    phone: '60554433',
    address: 'Calle 24 de Septiembre #50',
    type: 'Prospect'
  }
];

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    type: 'Prospect',
    notes: ''
  });

  const handleEdit = (client: Client) => {
    setFormData(client);
    setEditingId(client.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar cliente?')) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const openNewClient = () => {
    setEditingId(null);
    setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        type: 'Prospect',
        notes: ''
    });
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
            avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=random`
        };
        setClients([...clients, newClient]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-500">Gestiona tu cartera de clientes y prospectos</p>
        </div>
        <button 
          onClick={openNewClient}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar clientes..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm text-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
          <div key={client.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
            
            <div className="flex items-center gap-4 mb-4">
                <img 
                    src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}&background=random`} 
                    alt={client.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{client.name}</h3>
                  <p className="text-sm text-gray-500 font-medium">{client.company}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-50">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail size={16} className="text-gray-400" />
                {client.email || 'Sin correo'}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone size={16} className="text-gray-400" />
                {client.phone || 'Sin teléfono'}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <MapPin size={16} className="text-gray-400" />
                {client.address || 'Sin dirección'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${client.type === 'Client' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                {client.type === 'Client' ? 'Cliente' : 'Prospecto'}
              </span>
              <div className="flex gap-2">
                 <button 
                    onClick={() => handleEdit(client)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                    <Edit3 size={14} /> Editar
                 </button>
                 <button 
                    onClick={() => handleDelete(client.id)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                 >
                    <Trash2 size={14} />
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-lg text-gray-900">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                        value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                 </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900" 
                      value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none bg-white text-gray-900"
                      value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                      <option value="Prospect">Prospecto</option>
                      <option value="Client">Cliente</option>
                  </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors bg-white">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};