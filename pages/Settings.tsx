import React, { useState, useEffect } from 'react';
import { Save, Building, CreditCard, Users, Trash2, Plus, Check, DollarSign, Database, Lock, User as UserIcon, Edit3, X, Shield, Printer, Link as LinkIcon, RefreshCw, Palette, AlertTriangle, HardDrive, Stethoscope, Crown, ExternalLink, Image as ImageIcon, Upload, Key, Smartphone, Eye, EyeOff, ShieldCheck, ChevronRight, ArrowLeft, Share2, Briefcase, Wallet, History } from 'lucide-react';
import { AppSettings, User } from '../types';
import { db } from '../firebase'; 
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836', 
    secondaryColor: '#00f24a',
    systemLogoUrl: '',
    socialPreviewUrl: '', 
    socialShareTitle: 'Documento Digital | Bráma Studio',
    socialShareDescription: 'Visualiza y descarga tu cotización o recibo de manera segura.',
    pdfHeaderColor: '#162836',
    pdfSenderInfo: 'Bráma Studio\nSanta Cruz',
    pdfFooterText: 'www.brama.com.bo',
    paymentInfo: '',
    termsAndConditions: '1. Validez de la oferta: 15 días calendario.\n2. Tiempo de entrega: A convenir.',
    salesNote: 'Gracias por su compra.',
    receiptInfo: 'Este documento no tiene validez como crédito fiscal.',
    customQuotationLabel: 'FACTURADO',
    customReceiptLabel: 'ENTREGADO',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA',
    taxIdLabel: 'NIT',
    signatureName: 'Ariel Espinoza',
    signatureTitle: 'CEO',
    autoCleanupEnabled: true,
    retentionClients: 6, 
    retentionSales: 12, 
    retentionProjects: 6, 
    retentionQuotes: 3, 
    retentionFinance: 12
};

export const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');

    useEffect(() => {
        const loadSettings = async () => {
            const saved = localStorage.getItem('crm_settings');
            if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            try {
                const docSnap = await getDoc(doc(db, 'crm_data', 'settings'));
                if (docSnap.exists()) {
                    const cloudSettings = docSnap.data() as AppSettings;
                    setSettings({ ...defaultSettings, ...cloudSettings });
                    localStorage.setItem('crm_settings', JSON.stringify({ ...defaultSettings, ...cloudSettings }));
                }
            } catch (e) {
                console.error("Error loading settings", e);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'crm_data', 'settings'), settings);
            localStorage.setItem('crm_settings', JSON.stringify(settings));
            // Dispatch event to update sidebar and other components instantly
            window.dispatchEvent(new Event('crm_settings_updated'));
            alert('Ajustes guardados correctamente.');
        } catch (e) {
            console.error("Error saving settings", e);
            alert('Error al guardar ajustes.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Building },
        { id: 'branding', label: 'Marca', icon: Palette },
        { id: 'docs', label: 'Documentos', icon: Printer },
        { id: 'finance', label: 'Finanzas', icon: Wallet },
        { id: 'maintenance', label: 'Mantenimiento', icon: Database },
    ];

    return (
        <div className="space-y-6 pb-safe-area">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
                    <p className="text-sm text-gray-500">Configuración global del sistema</p>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-brand-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-800 transition-all shadow-lg active:scale-95 disabled:opacity-70">
                    {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>} Guardar Cambios
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Tabs Sidebar */}
                <div className="w-full md:w-64 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
                    <div className="p-2 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-brand-50 text-brand-900' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm w-full">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Información de la Empresa</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.address} onChange={e => handleChange('address', e.target.value)} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sitio Web</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.website} onChange={e => handleChange('website', e.target.value)} /></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Identidad Visual & Social</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color Primario (Hex)</label>
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: settings.primaryColor }}></div>
                                        <input type="text" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 font-mono" value={settings.primaryColor} onChange={e => handleChange('primaryColor', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color Secundario (Hex)</label>
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: settings.secondaryColor }}></div>
                                        <input type="text" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 font-mono" value={settings.secondaryColor} onChange={e => handleChange('secondaryColor', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-700">Imágenes (URLs)</h4>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logo del Sistema (Login & Sidebar)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" placeholder="https://..." value={settings.systemLogoUrl || ''} onChange={e => handleChange('systemLogoUrl', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logo para Documentos (PDF)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" placeholder="https://..." value={settings.logoUrl || ''} onChange={e => handleChange('logoUrl', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Imagen Preview Social (OpenGraph)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" placeholder="https://..." value={settings.socialPreviewUrl || ''} onChange={e => handleChange('socialPreviewUrl', e.target.value)} /></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'docs' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Configuración de PDF</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color Cabecera (Hex)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.pdfHeaderColor} onChange={e => handleChange('pdfHeaderColor', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto Pie de Página</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.pdfFooterText} onChange={e => handleChange('pdfFooterText', e.target.value)} /></div>
                            </div>

                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Info Remitente (Cabecera)</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900 h-24 resize-none" value={settings.pdfSenderInfo} onChange={e => handleChange('pdfSenderInfo', e.target.value)} /></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Información de Pago</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900 h-24 resize-none" value={settings.paymentInfo} onChange={e => handleChange('paymentInfo', e.target.value)} /></div>
                            
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Términos y Condiciones (Default)</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900 h-24 resize-none" value={settings.termsAndConditions} onChange={e => handleChange('termsAndConditions', e.target.value)} /></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Firma</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.signatureName} onChange={e => handleChange('signatureName', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo Firma</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.signatureTitle} onChange={e => handleChange('signatureTitle', e.target.value)} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Imagen Firma</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.signatureUrl || ''} onChange={e => handleChange('signatureUrl', e.target.value)} /></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Moneda e Impuestos</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Símbolo Moneda</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.currencySymbol} onChange={e => handleChange('currencySymbol', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Moneda</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.currencyName} onChange={e => handleChange('currencyName', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Impuesto (ej. IVA)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.taxName} onChange={e => handleChange('taxName', e.target.value)} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tasa Impuesto (%)</label><input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.taxRate} onChange={e => handleChange('taxRate', Number(e.target.value))} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Etiqueta ID Fiscal (NIT/RUC)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.taxIdLabel || 'NIT'} onChange={e => handleChange('taxIdLabel', e.target.value)} /></div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Etiquetas Personalizadas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Etiqueta Recibo (ej. ENTREGADO)</label><input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-900" value={settings.customReceiptLabel || ''} onChange={e => handleChange('customReceiptLabel', e.target.value)} /></div>
                                    <div><label