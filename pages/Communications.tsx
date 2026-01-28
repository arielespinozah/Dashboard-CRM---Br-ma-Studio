import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Send, Paperclip, MoreVertical, Phone, User, FileText, ShoppingBag, DollarSign, ChevronRight, Check, X, ArrowLeft, Settings as SettingsIcon, Briefcase } from 'lucide-react';
import { Client, Quote, Sale, InventoryItem } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Communications = () => {
    // Connection State
    const [isConnected, setIsConnected] = useState<boolean>(() => {
        const saved = localStorage.getItem('crm_wa_connected');
        return saved === 'true';
    });

    // Data States
    const [clients, setClients] = useState<Client[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    // UI States
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [messageText, setMessageText] = useState('');
    const [showActionPanel, setShowActionPanel] = useState<'none' | 'quotes' | 'sales' | 'products' | 'services'>('none');
    
    // Mobile Navigation
    const [showMobileList, setShowMobileList] = useState(true);

    // Config Input States
    const [waPhoneId, setWaPhoneId] = useState('');
    const [waToken, setWaToken] = useState('');

    // Load all necessary CRM data
    useEffect(() => {
        const loadData = async () => {
            const loadLocalOrCloud = async (key: string, collection: string, setter: Function) => {
                const local = localStorage.getItem(key);
                if (local) setter(JSON.parse(local));
                try {
                    const snap = await getDoc(doc(db, 'crm_data', collection));
                    if (snap.exists()) setter(snap.data().list);
                } catch(e) {}
            };

            await loadLocalOrCloud('crm_clients', 'clients', setClients);
            await loadLocalOrCloud('crm_quotes', 'quotes', setQuotes);
            await loadLocalOrCloud('crm_sales_history', 'sales_history', setSales);
            await loadLocalOrCloud('crm_inventory', 'inventory', setInventory);
        };
        loadData();
    }, []);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate saving credentials
        if(waPhoneId && waToken) {
            setIsConnected(true);
            localStorage.setItem('crm_wa_connected', 'true');
        }
    };

    const handleDisconnect = () => {
        if(confirm('¿Desconectar la integración de WhatsApp?')) {
            setIsConnected(false);
            localStorage.removeItem('crm_wa_connected');
            setSelectedClient(null);
        }
    };

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setShowMobileList(false); // Mobile UX
    };

    const handleBackToList = () => {
        setShowMobileList(true);
    };

    const handleSendMessage = () => {
        if (!selectedClient || !messageText.trim()) return;
        const phone = selectedClient.phone.replace(/\D/g, ''); // Clean phone number
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
        window.open(url, '_blank');
        setMessageText(''); // Clear after send intent
    };

    const attachQuote = (quote: Quote) => {
        const link = `https://brama.studio/q/${quote.id.toLowerCase()}`;
        const msg = `Hola ${selectedClient?.name}, le adjunto la cotización solicitada *${quote.id}* por un total de *Bs. ${quote.total}*.\n\nPuede revisarla aquí: ${link}`;
        setMessageText(msg);
        setShowActionPanel('none');
    };

    const attachSale = (sale: Sale) => {
        const msg = `Estimado/a ${selectedClient?.name}, gracias por su compra. Adjunto el recibo *${sale.id}*.\n\nTotal: Bs. ${sale.total}\nFecha: ${new Date(sale.date).toLocaleDateString()}`;
        setMessageText(msg);
        setShowActionPanel('none');
    };

    const attachItem = (item: InventoryItem) => {
        const typeLabel = item.type === 'Service' ? 'Servicio' : 'Producto';
        const msg = `✨ *${item.name}* (${typeLabel})\n\n${item.description}\n\nPrecio: Bs. ${item.price}\n¿Le gustaría agendar o reservar esto?`;
        setMessageText(msg);
        setShowActionPanel('none');
    };

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter content for action panel based on selected client (optional smart filtering)
    const clientQuotes = quotes.filter(q => q.clientName === selectedClient?.name || !selectedClient);
    const clientSales = sales.filter(s => s.clientName === selectedClient?.name || !selectedClient);
    const products = inventory.filter(i => i.type === 'Product');
    const services = inventory.filter(i => i.type === 'Service');

    // --- RENDER DISCONNECTED STATE ---
    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare size={40} className="text-[#25D366]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Business API</h2>
                    <p className="text-gray-500 mb-8 text-sm">Conecta tu cuenta de Meta for Developers para habilitar el CRM de mensajería y automatización.</p>
                    
                    <form onSubmit={handleConnect} className="space-y-4 text-left">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number ID</label>
                            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900" placeholder="Ej. 102938..." value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Access Token</label>
                            <input required type="password" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900" placeholder="EAAG..." value={waToken} onChange={e => setWaToken(e.target.value)} />
                        </div>
                        <button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-xl shadow-lg transition-colors mt-2">
                            Conectar y Continuar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER CONNECTED CRM ---
    return (
        <div className="h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex relative">
            {/* LEFT SIDEBAR: Contact List (Hidden on mobile if chat selected) */}
            <div className={`absolute inset-0 z-20 bg-white md:relative md:w-80 border-r border-gray-200 flex flex-col md:flex ${!showMobileList && 'hidden md:flex'}`}>
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="text-green-600" size={20}/> Chats
                    </h2>
                    <button onClick={handleDisconnect} title="Configuración" className="text-gray-400 hover:text-gray-600"><SettingsIcon size={18}/></button>
                </div>
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredClients.map(client => (
                        <div 
                            key={client.id} 
                            onClick={() => handleClientSelect(client)}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedClient?.id === client.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">
                                {client.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 truncate">{client.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{client.company || 'Particular'}</p>
                            </div>
                            {selectedClient?.id === client.id && <ChevronRight size={16} className="text-green-500"/>}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN AREA: Chat Interface */}
            <div className={`flex-1 flex flex-col bg-[#efeae2] w-full ${showMobileList && 'hidden md:flex'}`}>
                {selectedClient ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-gray-100 border-b border-gray-200 p-3 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={handleBackToList} className="md:hidden p-1 text-gray-600"><ArrowLeft size={20}/></button>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-brand-900 border border-gray-200">
                                    {selectedClient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm md:text-base">{selectedClient.name}</h3>
                                    <p className="text-xs text-green-600 flex items-center gap-1 font-medium"><Phone size={10}/> {selectedClient.phone || 'Sin número'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><Search size={20}/></button>
                                <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><MoreVertical size={20}/></button>
                            </div>
                        </div>

                        {/* Chat Area (Empty for now as per user request to remove simulation text) */}
                        <div className="flex-1 p-6 overflow-y-auto relative bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90">
                            
                            {/* Action Panels Overlay */}
                            {showActionPanel !== 'none' && (
                                <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-10 max-h-[300px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h4 className="font-bold text-sm text-gray-700">
                                            Seleccionar {showActionPanel === 'quotes' ? 'Cotización' : showActionPanel === 'sales' ? 'Recibo' : showActionPanel === 'services' ? 'Servicio' : 'Producto'}
                                        </h4>
                                        <button onClick={() => setShowActionPanel('none')}><X size={18} className="text-gray-400"/></button>
                                    </div>
                                    <div className="overflow-y-auto p-2 space-y-1">
                                        {showActionPanel === 'quotes' && clientQuotes.map(q => (
                                            <button key={q.id} onClick={() => attachQuote(q)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 flex justify-between items-center group">
                                                <div><p className="font-bold text-sm text-brand-900">{q.id}</p><p className="text-xs text-gray-500">{new Date(q.date).toLocaleDateString()}</p></div>
                                                <span className="font-bold text-sm text-gray-900 group-hover:text-green-600">Bs. {q.total}</span>
                                            </button>
                                        ))}
                                        {showActionPanel === 'sales' && clientSales.map(s => (
                                            <button key={s.id} onClick={() => attachSale(s)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 flex justify-between items-center group">
                                                <div><p className="font-bold text-sm text-brand-900">{s.id}</p><p className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</p></div>
                                                <span className="font-bold text-sm text-gray-900 group-hover:text-green-600">Bs. {s.total}</span>
                                            </button>
                                        ))}
                                        {showActionPanel === 'products' && products.map(i => (
                                            <button key={i.id} onClick={() => attachItem(i)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 flex justify-between items-center group">
                                                <div><p className="font-bold text-sm text-brand-900">{i.name}</p><p className="text-xs text-gray-500">{i.category}</p></div>
                                                <span className="font-bold text-sm text-gray-900 group-hover:text-green-600">Bs. {i.price}</span>
                                            </button>
                                        ))}
                                        {showActionPanel === 'services' && services.map(i => (
                                            <button key={i.id} onClick={() => attachItem(i)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 flex justify-between items-center group">
                                                <div><p className="font-bold text-sm text-brand-900">{i.name}</p><p className="text-xs text-gray-500">{i.category}</p></div>
                                                <span className="font-bold text-sm text-gray-900 group-hover:text-green-600">Bs. {i.price}</span>
                                            </button>
                                        ))}
                                        
                                        {( (showActionPanel === 'quotes' && clientQuotes.length === 0) || (showActionPanel === 'sales' && clientSales.length === 0) ) && (
                                            <p className="text-center text-gray-400 py-4 text-sm">No hay registros disponibles.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-gray-100 p-3 flex flex-col gap-2">
                            {/* Quick Actions Toolbar */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => setShowActionPanel('quotes')} className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors shadow-sm whitespace-nowrap">
                                    <FileText size={14}/> Cotización
                                </button>
                                <button onClick={() => setShowActionPanel('sales')} className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-sm whitespace-nowrap">
                                    <DollarSign size={14}/> Recibo
                                </button>
                                <button onClick={() => setShowActionPanel('products')} className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-gray-600 border border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors shadow-sm whitespace-nowrap">
                                    <ShoppingBag size={14}/> Producto
                                </button>
                                <button onClick={() => setShowActionPanel('services')} className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-gray-600 border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors shadow-sm whitespace-nowrap">
                                    <Briefcase size={14}/> Servicio
                                </button>
                            </div>

                            <div className="flex items-end gap-2 bg-white p-2 rounded-xl border border-gray-300">
                                <button className="p-2 text-gray-400 hover:text-gray-600"><Paperclip size={20}/></button>
                                <textarea 
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    placeholder="Escribe un mensaje..." 
                                    className="flex-1 max-h-32 min-h-[40px] bg-transparent outline-none text-sm resize-none py-2 text-gray-900"
                                    rows={1}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    className={`p-2 rounded-full transition-all ${messageText.trim() ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400'}`}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white md:bg-[#efeae2]">
                        <div className="w-32 h-32 bg-gray-100 md:bg-white rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={48} className="text-gray-400 opacity-50"/>
                        </div>
                        <h2 className="text-xl font-bold text-gray-600 mb-2">WhatsApp Business CRM</h2>
                        <p className="max-w-md text-sm">Selecciona un cliente de la lista para comenzar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};