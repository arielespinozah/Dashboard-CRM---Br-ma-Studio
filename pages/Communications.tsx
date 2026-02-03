
import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Send, Paperclip, Phone, User, FileText, ShoppingBag, DollarSign, ChevronRight, Check, X, ArrowLeft, Settings as SettingsIcon, Briefcase, Zap, RefreshCw, Link as LinkIcon, Plus, Trash2, Edit3, Smartphone, ExternalLink, Globe, Lock, AlertCircle } from 'lucide-react';
import { Client, Quote, Sale, InventoryItem, ChatMessage, WhatsAppConfig, ChatTemplate } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Communications = () => {
    // Data States
    const [clients, setClients] = useState<Client[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    // Config States
    const [waConfig, setWaConfig] = useState<WhatsAppConfig>({ phoneId: '', accessToken: '' });
    const [templates, setTemplates] = useState<ChatTemplate[]>([]);
    
    // UI States
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [messageText, setMessageText] = useState('');
    const [showActionPanel, setShowActionPanel] = useState<'none' | 'quotes' | 'sales' | 'products' | 'services' | 'templates'>('none');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    
    // Template Editing
    const [editingTemplate, setEditingTemplate] = useState<ChatTemplate>({ id: '', name: '', content: '' });

    // Chat States
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Mobile Navigation
    const [showMobileList, setShowMobileList] = useState(true);

    // Load Data
    useEffect(() => {
        const loadAll = async () => {
            // Clients
            try {
                const cDoc = await getDoc(doc(db, 'crm_data', 'clients'));
                if (cDoc.exists()) setClients(cDoc.data().list);
                else {
                    const local = localStorage.getItem('crm_clients');
                    if(local) setClients(JSON.parse(local));
                }
            } catch(e) {}

            // Quotes & Sales for attachments
            try {
                const qDoc = await getDoc(doc(db, 'crm_data', 'quotes'));
                if (qDoc.exists()) setQuotes(qDoc.data().list);
                
                const sDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
                if (sDoc.exists()) setSales(sDoc.data().list);

                const iDoc = await getDoc(doc(db, 'crm_data', 'inventory'));
                if (iDoc.exists()) setInventory(iDoc.data().list);
            } catch(e) {}

            // Config & Templates
            const config = localStorage.getItem('crm_wa_config');
            if (config) setWaConfig(JSON.parse(config));

            const savedTemplates = localStorage.getItem('crm_chat_templates');
            if (savedTemplates) {
                setTemplates(JSON.parse(savedTemplates));
            } else {
                // Default templates
                const defaults = [
                    { id: 't1', name: 'Bienvenida', content: 'Hola {nombre}, gracias por contactar a Bráma Studio. ¿En qué podemos ayudarte hoy?' },
                    { id: 't2', name: 'Pedido Listo', content: 'Estimado {nombre}, su pedido está listo para recoger. Nuestros horarios son de 9:00 a 18:00.' },
                    { id: 't3', name: 'Pago Pendiente', content: 'Hola {nombre}, le recordamos amablemente que tiene un saldo pendiente. Agradecemos su pago.' }
                ];
                setTemplates(defaults);
                localStorage.setItem('crm_chat_templates', JSON.stringify(defaults));
            }
        };
        loadAll();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if(chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [currentMessages, selectedClient, showActionPanel]);

    const handleClientSelect = async (client: Client) => {
        setSelectedClient(client);
        setShowMobileList(false); 
        setShowActionPanel('none');
        setIsLoadingChat(true);
        setCurrentMessages([]);

        try {
            const chatId = `chat_${client.id}`;
            const chatDoc = await getDoc(doc(db, 'crm_data', chatId));
            if (chatDoc.exists()) {
                setCurrentMessages(chatDoc.data().history);
            } else {
                const local = localStorage.getItem(chatId);
                if (local) setCurrentMessages(JSON.parse(local));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingChat(false);
        }
    };

    const saveMessageLocally = async (text: string, via: 'api' | 'link') => {
        if (!selectedClient) return;
        const newMsg: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: 'me',
            timestamp: new Date().toISOString(),
            via
        };
        
        const updated = [...currentMessages, newMsg];
        setCurrentMessages(updated);
        
        const chatId = `chat_${selectedClient.id}`;
        localStorage.setItem(chatId, JSON.stringify(updated));
        setDoc(doc(db, 'crm_data', chatId), { history: updated, clientName: selectedClient.name }).catch(()=>{});
    };

    // --- SENDING LOGIC ---
    const handleSendMessage = async () => {
        if (!selectedClient || !messageText.trim()) return;
        
        setIsSending(true);
        
        // Check if API is configured and client has phone
        const hasApi = waConfig.phoneId && waConfig.accessToken;
        const hasPhone = selectedClient.phone && selectedClient.phone.length > 5;

        if (hasApi && hasPhone) {
            try {
                // Send via Meta API
                const cleanPhone = selectedClient.phone.replace(/\D/g, '');
                // Basic text message payload
                const payload = {
                    messaging_product: "whatsapp",
                    to: cleanPhone,
                    type: "text",
                    text: { body: messageText }
                };

                const response = await fetch(`https://graph.facebook.com/v17.0/${waConfig.phoneId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${waConfig.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    saveMessageLocally(messageText, 'api');
                    setMessageText('');
                } else {
                    const err = await response.json();
                    console.error("Meta API Error:", err);
                    alert("Error API: " + (err.error?.message || "Falló el envío."));
                }

            } catch (e) {
                alert("Error de conexión con Meta API");
            }
        } else {
            // Fallback: Click-to-Chat
            saveMessageLocally(messageText, 'link');
            const cleanPhone = selectedClient.phone.replace(/\D/g, '');
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            setMessageText('');
        }
        
        setIsSending(false);
    };

    // --- TEMPLATE LOGIC ---
    const handleSaveTemplate = () => {
        if (!editingTemplate.name || !editingTemplate.content) return;
        let newTemplates = [...templates];
        if (editingTemplate.id) {
            newTemplates = newTemplates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
        } else {
            newTemplates.push({ ...editingTemplate, id: Date.now().toString() });
        }
        setTemplates(newTemplates);
        localStorage.setItem('crm_chat_templates', JSON.stringify(newTemplates));
        setEditingTemplate({ id: '', name: '', content: '' });
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplate = (id: string) => {
        const filtered = templates.filter(t => t.id !== id);
        setTemplates(filtered);
        localStorage.setItem('crm_chat_templates', JSON.stringify(filtered));
    };

    const applyTemplate = (content: string) => {
        let final = content;
        if (selectedClient) {
            final = final.replace('{nombre}', selectedClient.name.split(' ')[0]);
            final = final.replace('{empresa}', selectedClient.company || 'su empresa');
        }
        setMessageText(final);
        setShowActionPanel('none');
    };

    // --- ATTACHMENT LOGIC ---
    const attachLink = (type: string, id: string, extra: string) => {
        let baseUrl = window.location.href.split('#')[0];
        // Clean blob prefix if present
        if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        
        const link = `${baseUrl}#/view/${type}/${id}`;
        
        let msg = '';
        if (type === 'quote') msg = `Adjunto cotización *${id}*.\nVer aquí: ${link}`;
        else if (type === 'sale') msg = `Adjunto su recibo *${id}*.\nDescargar: ${link}`;
        else msg = `${extra}\nPrecio: ${id}`; // Product override

        setMessageText(msg);
        setShowActionPanel('none');
    };

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter attachments by client
    const clientQuotes = quotes.filter(q => q.clientName === selectedClient?.name || !selectedClient);
    const clientSales = sales.filter(s => s.clientName === selectedClient?.name || !selectedClient);

    return (
        <div className="h-[calc(100dvh-100px)] md:h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex relative pb-safe-area">
            
            {/* CONFIG MODAL - Full Screen Mobile */}
            {isConfigOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl md:max-w-md shadow-2xl animate-in zoom-in duration-200 flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 md:rounded-t-2xl sticky top-0 z-10 pt-safe-top shrink-0">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Smartphone size={20}/> Configuración WhatsApp</h3>
                            <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Modo Híbrido:</strong> Si configuras la API, los mensajes se enviarán directamente. Si no, el sistema abrirá la app de WhatsApp (Web/Escritorio) automáticamente.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Phone Number ID</label>
                                    <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white font-mono text-sm outline-none focus:border-brand-900 transition-all min-h-[48px]" value={waConfig.phoneId} onChange={e => setWaConfig({...waConfig, phoneId: e.target.value})} placeholder="Ej. 10593..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Meta Access Token</label>
                                    <input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white font-mono text-sm outline-none focus:border-brand-900 transition-all min-h-[48px]" value={waConfig.accessToken} onChange={e => setWaConfig({...waConfig, accessToken: e.target.value})} placeholder="Token permanente..." />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white shrink-0 pb-safe-area">
                            <button onClick={() => { localStorage.setItem('crm_wa_config', JSON.stringify(waConfig)); setIsConfigOpen(false); }} className="w-full bg-brand-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-brand-800 active:scale-95 transition-transform min-h-[52px]">Guardar Configuración</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPLATE MANAGER MODAL - Full Screen Mobile */}
            {isTemplateModalOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl md:max-w-lg shadow-2xl animate-in zoom-in duration-200 flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 md:rounded-t-2xl sticky top-0 z-10 pt-safe-top shrink-0">
                            <h3 className="font-bold text-gray-900 text-lg">Gestión de Plantillas</h3>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="space-y-3">
                                {templates.map(t => (
                                    <div key={t.id} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 group relative bg-white shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-sm text-brand-900">{t.name}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingTemplate(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"><Edit3 size={16}/></button>
                                                <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">{t.content}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mt-4">
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">{editingTemplate.id ? 'Editar' : 'Nueva'} Plantilla</h4>
                                <input className="w-full mb-3 px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[48px] outline-none focus:border-brand-900" placeholder="Nombre (Ej. Bienvenida)" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} />
                                <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm h-32 resize-none outline-none focus:border-brand-900" placeholder="Mensaje... Usa {nombre} para personalizar." value={editingTemplate.content} onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})} />
                                <div className="flex gap-3 mt-3">
                                    {editingTemplate.id && <button onClick={() => setEditingTemplate({id:'', name:'', content:''})} className="flex-1 py-3 text-sm text-gray-600 font-bold bg-white border border-gray-200 rounded-xl min-h-[48px]">Cancelar</button>}
                                    <button onClick={handleSaveTemplate} className="flex-1 bg-brand-900 text-white py-3 rounded-xl text-sm font-bold min-h-[48px]">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <div className={`absolute inset-0 z-20 bg-white md:relative md:w-80 border-r border-gray-200 flex flex-col ${!showMobileList ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center pt-safe-top">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                        <MessageSquare className="text-green-600" size={24}/> Chats
                    </h2>
                    <button onClick={() => setIsConfigOpen(true)} title="Configuración" className={`p-2.5 rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${waConfig.accessToken ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}><SettingsIcon size={20}/></button>
                </div>
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none min-h-[48px]"
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
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4 min-h-[80px] active:bg-gray-100 ${selectedClient?.id === client.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 flex-shrink-0 relative text-lg">
                                {client.name.charAt(0)}
                                {client.type === 'Client' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-gray-900 truncate text-base">{client.name}</h4>
                                </div>
                                <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                                    {client.company || 'Particular'}
                                </p>
                            </div>
                            {selectedClient?.id === client.id && <ChevronRight size={20} className="text-green-500"/>}
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT AREA */}
            <div className={`flex-1 flex flex-col bg-[#e5ddd5] w-full relative ${showMobileList ? 'hidden md:flex' : 'flex'}`}>
                {selectedClient ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center sticky top-0 z-10 shadow-sm h-[64px] pt-safe-top">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setShowMobileList(true); setSelectedClient(null); }} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"><ArrowLeft size={24}/></button>
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">
                                    {selectedClient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm leading-tight max-w-[150px] truncate">{selectedClient.name}</h3>
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                        {selectedClient.phone || 'Sin número'} 
                                        {waConfig.accessToken && selectedClient.phone && <span className="text-green-600 font-bold bg-green-50 px-1 rounded ml-1">API Ready</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {selectedClient.phone && <button onClick={() => window.open(`tel:${selectedClient.phone}`, '_self')} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"><Phone size={22}/></button>}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto relative bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-50" ref={chatContainerRef}>
                            {currentMessages.length === 0 && (
                                <div className="flex justify-center mt-10">
                                    <div className="bg-[#fffae6] p-4 rounded-xl shadow-sm max-w-xs text-center border border-[#fff0b3]">
                                        <p className="text-sm text-yellow-800 font-medium">
                                            {waConfig.accessToken ? "API Conectada. Los mensajes se enviarán directamente." : "Modo Click-to-Chat. Se abrirá WhatsApp Web al enviar."}
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {currentMessages.map((msg) => (
                                <div key={msg.id} className={`flex mb-3 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 px-4 rounded-2xl shadow-sm text-base relative ${msg.sender === 'me' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        <div className="flex items-center justify-end gap-1 mt-1.5">
                                            <span className="text-[10px] text-gray-500 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            {msg.sender === 'me' && (
                                                msg.via === 'api' ? 
                                                <div title="Enviado por API"><Globe size={12} className="text-blue-500"/></div> : 
                                                <div title="Enlace externo"><ExternalLink size={12} className="text-gray-400"/></div>
                                            )}
                                            {msg.sender === 'me' && <Check size={14} className={msg.via === 'api' ? "text-blue-500" : "text-gray-400"}/>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Panel Popover (Bottom Sheet on Mobile) */}
                        {showActionPanel !== 'none' && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] border-t border-gray-200 z-30 flex flex-col animate-in slide-in-from-bottom-full duration-300 max-h-[60%]">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl sticky top-0 z-10">
                                    <h4 className="font-bold text-base text-gray-800 capitalize">
                                        {showActionPanel === 'templates' ? 'Plantillas' : `Seleccionar ${showActionPanel}`}
                                    </h4>
                                    <button onClick={() => setShowActionPanel('none')} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} className="text-gray-500"/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1 pb-safe-area">
                                    {showActionPanel === 'templates' && (
                                        <>
                                            <button onClick={() => { setIsTemplateModalOpen(true); setShowActionPanel('none'); }} className="w-full text-center py-3 text-sm font-bold text-brand-900 hover:bg-brand-50 rounded-xl border-2 border-dashed border-brand-200 mb-3 min-h-[48px]">+ Nueva Plantilla</button>
                                            {templates.map(t => (
                                                <button key={t.id} onClick={() => applyTemplate(t.content)} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl border border-gray-100 active:scale-[0.99] transition-transform">
                                                    <span className="font-bold text-sm text-gray-900 block mb-1">{t.name}</span>
                                                    <span className="text-xs text-gray-500 line-clamp-2">{t.content}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {showActionPanel === 'quotes' && clientQuotes.map(q => (
                                        <button key={q.id} onClick={() => attachLink('quote', q.id, '')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center active:scale-[0.99] transition-transform">
                                            <div>
                                                <span className="font-bold text-sm text-gray-900 block">Cotización {q.id}</span>
                                                <span className="text-xs text-gray-500">{new Date(q.date).toLocaleDateString()} • Total: {q.total}</span>
                                            </div>
                                            <LinkIcon size={16} className="text-gray-400"/>
                                        </button>
                                    ))}
                                    {showActionPanel === 'sales' && clientSales.map(s => (
                                        <button key={s.id} onClick={() => attachLink('sale', s.id, '')} className="w-full text-left p-3 hover:bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center active:scale-[0.99] transition-transform">
                                            <div>
                                                <span className="font-bold text-sm text-gray-900 block">Venta {s.id}</span>
                                                <span className="text-xs text-gray-5