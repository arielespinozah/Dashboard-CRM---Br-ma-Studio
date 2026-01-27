import React, { useState, useEffect } from 'react';
import { Search, Send, MoreVertical, Phone, Video, Paperclip, CheckCheck, Plus } from 'lucide-react';
import { MessageThread, ChatMessage } from '../types';

const initialThreads: MessageThread[] = [
    { id: '1', clientName: 'Juan Perez', lastMessage: 'Hola, ¿recibiste mi pago?', timestamp: '10:30 AM', unread: 2, platform: 'WhatsApp', avatar: 'https://ui-avatars.com/api/?name=Juan+Perez&background=random' },
    { id: '2', clientName: 'Maria Rodriguez', lastMessage: 'Gracias por la cotización.', timestamp: 'Ayer', unread: 0, platform: 'Email', avatar: 'https://ui-avatars.com/api/?name=Maria+R&background=random' },
];

const initialMessages: Record<string, ChatMessage[]> = {
    '1': [
        { id: 'm1', text: 'Hola buen día, quisiera consultar sobre el servicio de diseño.', sender: 'client', timestamp: '10:00 AM' },
        { id: 'm2', text: 'Hola Juan, claro que sí. Cuéntame qué necesitas.', sender: 'me', timestamp: '10:05 AM' },
        { id: 'm3', text: 'Necesito un logo para mi restaurante.', sender: 'client', timestamp: '10:10 AM' },
        { id: 'm5', text: 'Hola, ¿recibiste mi pago?', sender: 'client', timestamp: '10:30 AM' },
    ],
    '2': [
        { id: 'm4', text: 'Gracias por la cotización.', sender: 'client', timestamp: 'Ayer' },
    ]
};

export const Communications = () => {
    const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
    const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(initialMessages);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreads[0].id);
    const [newMessage, setNewMessage] = useState('');
    const [newChatName, setNewChatName] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);

    // Save/Load from LocalStorage
    useEffect(() => {
        const savedThreads = localStorage.getItem('crm_threads');
        const savedMsgs = localStorage.getItem('crm_messages');
        if (savedThreads) setThreads(JSON.parse(savedThreads));
        if (savedMsgs) setMessagesMap(JSON.parse(savedMsgs));
    }, []);

    const saveToStorage = (newThreads: MessageThread[], newMsgs: Record<string, ChatMessage[]>) => {
        localStorage.setItem('crm_threads', JSON.stringify(newThreads));
        localStorage.setItem('crm_messages', JSON.stringify(newMsgs));
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newMessage.trim() || !selectedThreadId) return;
        
        const msg: ChatMessage = {
            id: Math.random().toString(),
            text: newMessage,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        const updatedMsgs = {
            ...messagesMap,
            [selectedThreadId]: [...(messagesMap[selectedThreadId] || []), msg]
        };

        const updatedThreads = threads.map(t => 
            t.id === selectedThreadId 
            ? { ...t, lastMessage: newMessage, timestamp: 'Ahora' } 
            : t
        );

        setMessagesMap(updatedMsgs);
        setThreads(updatedThreads);
        setNewMessage('');
        saveToStorage(updatedThreads, updatedMsgs);
    };

    const handleCreateChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatName.trim()) return;

        const newId = Math.random().toString(36).substr(2, 5);
        const newThread: MessageThread = {
            id: newId,
            clientName: newChatName,
            lastMessage: 'Nuevo chat iniciado',
            timestamp: 'Ahora',
            unread: 0,
            platform: 'WhatsApp'
        };

        const updatedThreads = [newThread, ...threads];
        const updatedMsgs = { ...messagesMap, [newId]: [] };
        
        setThreads(updatedThreads);
        setMessagesMap(updatedMsgs);
        setSelectedThreadId(newId);
        setIsNewChatOpen(false);
        setNewChatName('');
        saveToStorage(updatedThreads, updatedMsgs);
    };

    const selectedThread = threads.find(t => t.id === selectedThreadId);
    const currentMessages = selectedThreadId ? (messagesMap[selectedThreadId] || []) : [];

    return (
        <div className="h-[calc(100vh-140px)] flex bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Sidebar List */}
            <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar chats..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-900" />
                    </div>
                    <button onClick={() => setIsNewChatOpen(true)} className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                        <Plus size={20} />
                    </button>
                </div>
                
                {isNewChatOpen && (
                    <form onSubmit={handleCreateChat} className="p-3 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Nombre del cliente..." 
                            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none mb-2"
                            value={newChatName}
                            onChange={e => setNewChatName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsNewChatOpen(false)} className="flex-1 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded">Cancelar</button>
                            <button type="submit" className="flex-1 py-1 text-xs text-white bg-blue-600 rounded">Crear</button>
                        </div>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto">
                    {threads.map(thread => (
                        <div 
                            key={thread.id} 
                            onClick={() => setSelectedThreadId(thread.id)}
                            className={`p-4 flex gap-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors ${selectedThreadId === thread.id ? 'bg-blue-50/50' : ''}`}
                        >
                            <img src={thread.avatar || `https://ui-avatars.com/api/?name=${thread.clientName}&background=random`} className="w-12 h-12 rounded-full object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-gray-900 truncate">{thread.clientName}</h4>
                                    <span className="text-xs text-gray-500">{thread.timestamp}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-sm text-gray-600 truncate">{thread.lastMessage}</p>
                                    {thread.unread > 0 && (
                                        <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{thread.unread}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selectedThread ? (
                <div className="flex-1 flex flex-col bg-[#e5ddd5]/30"> {/* WhatsApp-ish bg color hint */}
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             <img src={selectedThread.avatar || `https://ui-avatars.com/api/?name=${selectedThread.clientName}&background=random`} className="w-10 h-10 rounded-full" alt="" />
                             <div>
                                 <h3 className="font-bold text-gray-900">{selectedThread.clientName}</h3>
                                 <p className="text-xs text-green-600 font-medium">En línea</p>
                             </div>
                        </div>
                        <div className="flex gap-4 text-gray-600">
                             <Phone size={20} className="cursor-pointer hover:text-brand-600" />
                             <Video size={20} className="cursor-pointer hover:text-brand-600" />
                             <MoreVertical size={20} className="cursor-pointer hover:text-brand-600" />
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-pattern">
                        {currentMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm relative ${msg.sender === 'me' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                    <div className={`text-[10px] mt-1 flex justify-end items-center gap-1 ${msg.sender === 'me' ? 'text-gray-400' : 'text-gray-400'}`}>
                                        {msg.timestamp}
                                        {msg.sender === 'me' && <CheckCheck size={14} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <form onSubmit={handleSend} className="flex gap-2 items-center">
                            <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                <Paperclip size={20} />
                            </button>
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..." 
                                className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all outline-none text-gray-900" 
                            />
                            <button type="submit" className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-md shadow-gray-200">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <p className="text-gray-500">Selecciona una conversación para comenzar</p>
                </div>
            )}
        </div>
    );
};