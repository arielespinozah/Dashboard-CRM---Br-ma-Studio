import React, { useState } from 'react';
import { Search, Mail, MessageSquare, Plus, Settings as SettingsIcon, AlertCircle, RefreshCw } from 'lucide-react';

export const Communications = () => {
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');
    const [waConnected, setWaConnected] = useState(false); // Should be checked against Settings in real app
    const [emailConnected, setEmailConnected] = useState(false);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('whatsapp')} 
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'whatsapp' ? 'border-[#25D366] text-[#25D366] bg-green-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare size={18} /> WhatsApp Business
                </button>
                <button 
                    onClick={() => setActiveTab('email')} 
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'email' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Mail size={18} /> Correo Corporativo
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gray-50 relative">
                
                {/* WHATSAPP VIEW */}
                {activeTab === 'whatsapp' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        {!waConnected ? (
                            <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#25D366]">
                                    <MessageSquare size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Conectar WhatsApp Business</h2>
                                <p className="text-sm text-gray-500 mb-6">Vincula tu cuenta de Meta Developers para enviar y recibir mensajes directamente desde el CRM.</p>
                                <button className="w-full py-2.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200">
                                    Configurar API Token
                                </button>
                                <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                    <SettingsIcon size={12}/> Ir a Ajustes Integraciones
                                </p>
                            </div>
                        ) : (
                            // Placeholder for when connected (requires backend)
                            <div className="flex items-center gap-2 text-gray-500">
                                <RefreshCw className="animate-spin" size={20}/> Cargando chats...
                            </div>
                        )}
                    </div>
                )}

                {/* EMAIL VIEW */}
                {activeTab === 'email' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        {!emailConnected ? (
                            <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                    <Mail size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Bandeja de Entrada Unificada</h2>
                                <p className="text-sm text-gray-500 mb-6">Centraliza tus correos corporativos (SMTP/IMAP), Gmail o Outlook en un solo lugar.</p>
                                <div className="space-y-3">
                                    <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" alt=""/> Conectar Gmail
                                    </button>
                                    <button className="w-full py-2.5 bg-brand-900 text-white font-bold rounded-xl hover:bg-brand-800 transition-colors shadow-lg">
                                        Configurar SMTP Manual
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 text-gray-500">
                                <RefreshCw className="animate-spin" size={20}/> Sincronizando bandeja...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};