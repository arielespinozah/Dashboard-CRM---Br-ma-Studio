
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Search, Calendar, User, Trash2, CheckCircle2, X, DollarSign, Minus, Save, LayoutGrid, List, Package, Tag, Filter, ChevronDown, CreditCard, MoreVertical, Share2, Printer, Eye, Copy, Edit3, Download, Check, AlertTriangle, Mail, Phone, MapPin, Briefcase, ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Sale, QuoteItem, InventoryItem, User as UserType, AppSettings, AuditLog, Client } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ConfirmationModal } from '../components/ConfirmationModal';

// --- HELPER: CLEAN DESCRIPTION ---
const cleanDescription = (desc: string) => {
    return desc.replace(/\s*\((?:Precio|Mayorista|Unitario).*?\)/gi, '').trim();
};

// --- HELPER: NUMBER TO WORDS ---
const Unidades = (num: number) => {
    switch (num) {
        case 1: return "UN"; case 2: return "DOS"; case 3: return "TRES"; case 4: return "CUATRO"; case 5: return "CINCO"; case 6: return "SEIS"; case 7: return "SIETE"; case 8: return "OCHO"; case 9: return "NUEVE"; default: return "";
    }
};
const Decenas = (num: number) => {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
        case 1: switch (unidad) { case 0: return "DIEZ"; case 1: return "ONCE"; case 2: return "DOCE"; case 3: return "TRECE"; case 4: return "CATORCE"; case 5: return "QUINCE"; default: return "DIECI" + Unidades(unidad); }
        case 2: switch (unidad) { case 0: return "VEINTE"; default: return "VEINTI" + Unidades(unidad); }
        case 3: return DecenasY("TREINTA", unidad);
        case 4: return DecenasY("CUARENTA", unidad);
        case 5: return DecenasY("CINCUENTA", unidad);
        case 6: return DecenasY("SESENTA", unidad);
        case 7: return DecenasY("SETENTA", unidad);
        case 8: return DecenasY("OCHENTA", unidad);
        case 9: return DecenasY("NOVENTA", unidad);
        case 0: return Unidades(unidad);
        default: return "";
    }
};
const DecenasY = (strSin: string, numUnidades: number) => { if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades); return strSin; };
const Centenas = (num: number) => {
    const centenas = Math.floor(num / 100);
    const decenas = num - (centenas * 100);
    switch (centenas) {
        case 1: if (decenas > 0) return "CIENTO " + Decenas(decenas); return "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decenas);
        case 3: return "TRESCIENTOS " + Decenas(decenas);
        case 4: return "CUATROCIENTOS " + Decenas(decenas);
        case 5: return "QUINIENTOS " + Decenas(decenas);
        case 6: return "SEISCIENTOS " + Decenas(decenas);
        case 7: return "SETECIENTOS " + Decenas(decenas);
        case 8: return "OCHOCIENTOS " + Decenas(decenas);
        case 9: return "NOVECIENTOS " + Decenas(decenas);
        default: return Decenas(decenas);
    }
};
const Seccion = (num: number, divisor: number, strSingular: string, strPlural: string) => {
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    let letras = "";
    if (cientos > 0) { if (cientos > 1) letras = Centenas(cientos) + " " + strPlural; else letras = strSingular; }
    if (resto > 0) letras += "";
    return letras;
};
const Miles = (num: number) => {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
    const strCentenas = Centenas(resto);
    if (strMiles === "") return strCentenas;
    return strMiles + " " + strCentenas;
};
const Millones = (num: number) => {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMillones = Seccion(num, divisor, "UN MILLON", "MILLONES");
    const strMiles = Miles(resto);
    if (strMillones === "") return strMiles;
    return strMillones + " " + strMiles;
};
const convertNumberToWordsEs = (amount: number, currencyName: string) => {
    const entero = Math.floor(amount);
    const centavos = Math.round((amount - entero) * 100);
    const letras = entero === 0 ? "CERO" : Millones(entero);
    const centavosStr = centavos.toString().padStart(2, '0');
    return `${letras} ${centavosStr}/100 ${currencyName.toUpperCase()}`;
};

// --- HELPER: AUDIT LOG ---
const logAuditAction = (action: 'Delete' | 'Update' | 'Create', description: string, user: UserType, metadata?: string) => {
    const log: AuditLog = {
        id: Date.now().toString(),
        action,
        module: 'Sales',
        description,
        user: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        metadata: metadata || null
    };
    const savedLogs = localStorage.getItem('crm_audit_logs');
    const logs = savedLogs ? JSON.parse(savedLogs) : [];
    const updatedLogs = [log, ...logs];
    localStorage.setItem('crm_audit_logs', JSON.stringify(updatedLogs));
    setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs }).catch(e => console.error(e));
};

// --- HELPER: CURRENCY FORMAT ---
const formatCurrency = (amount: number, currencySymbol: string = 'Bs') => {
    return `${currencySymbol} ${Number(amount).toFixed(2)}`;
};

// --- COMPONENT: TOGGLE SWITCH (MATCHING QUOTATIONS STYLE) ---
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <div onClick={() => onChange(!checked)} className="flex items-center justify-start cursor-pointer group select-none py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors gap-3">
        <span className={`text-sm font-medium transition-colors ${checked ? 'text-brand-900' : 'text-gray-600'}`}>{label}</span>
        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ease-in-out relative ${checked ? 'bg-brand-900' : 'bg-gray-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </div>
);

const getCategoryColor = (category: string) => {
    const colors = [
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-orange-100 text-orange-800 border-orange-200',
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    let hash = 0;
    const cat = category || 'General';
    for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export const Sales = () => {
    const navigate = useNavigate();
    
    // --- Data States ---
    const [sales, setSales] = useState<Sale[]>([]);
    const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    // --- UI States ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'none' | 'preview' | 'share' | 'detail'>('none');
    
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Catalog Filtering
    const [productSearch, setProductSearch] = useState(''); 
    const [catalogCategory, setCatalogCategory] = useState<string>('All');
    const [catalogType, setCatalogType] = useState<'All' | 'Product' | 'Service'>('All');
    
    // Client Filtering
    const [clientSearch, setClientSearch] = useState('');
    const [clientSearchMode, setClientSearchMode] = useState(true);
    
    // PDF States
    const [pdfPreview, setPdfPreview] = useState<Sale | null>(null);
    const [pdfActionData, setPdfActionData] = useState<{data: Sale, action: 'print'|'download'} | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    
    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        action: () => {}, 
        type: 'info' as 'info'|'danger'|'success', 
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        showCancel: true 
    });
    
    // New Client Form State
    const [newClientData, setNewClientData] = useState<Partial<Client>>({ name: '', company: '', nit: '', email: '', phone: '', address: '' });

    // --- POS Form State ---
    const [newSale, setNewSale] = useState<Partial<Sale>>({
        items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0],
        receiptInfo: '',
        customLabel: '',
        showCustomLabel: false
    });
    const [taxEnabled, setTaxEnabled] = useState(false);

    const currentCurrency = settings?.currencySymbol || 'Bs';

    // --- Initialization ---
    useEffect(() => {
        const u = localStorage.getItem('crm_active_user');
        if (u) setCurrentUser(JSON.parse(u));
        const s = localStorage.getItem('crm_settings');
        if (s) setSettings(JSON.parse(s));

        const fetchData = async () => {
            const sDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
            if (sDoc.exists()) setSales(sDoc.data().list);
            else { const local = localStorage.getItem('crm_sales_history'); if (local) setSales(JSON.parse(local)); }

            const iDoc = await getDoc(doc(db, 'crm_data', 'inventory'));
            if (iDoc.exists()) {
                setAvailableInventory(iDoc.data().list);
                localStorage.setItem('crm_inventory', JSON.stringify(iDoc.data().list));
            } else {
                const local = localStorage.getItem('crm_inventory');
                if (local) setAvailableInventory(JSON.parse(local));
            }

            const cDoc = await getDoc(doc(db, 'crm_data', 'clients'));
            if (cDoc.exists()) setClients(cDoc.data().list);
            else {
                const local = localStorage.getItem('crm_clients');
                if (local) setClients(JSON.parse(local));
            }
        };
        fetchData();
    }, []);

    // --- RENDER SALE CONTENT FOR PDF ---
    const renderSaleContent = (saleData: Sale) => {
        // Prepare Sender Info splitting for Bold/Normal
        const senderInfo = settings?.pdfSenderInfo || `${settings?.companyName}\n${settings?.address}`;
        const [senderTitle, ...senderRestParts] = senderInfo.split('\n');
        const senderRest = senderRestParts.join('\n');

        return (
            // Fixed height container for A4 output to prevent overflow issues
            <div className="w-[210mm] bg-white text-slate-800 relative font-sans leading-normal shadow-none flex flex-col min-h-[296mm] overflow-hidden" style={{padding:0}}>
                <div className="p-10 flex justify-between items-center" style={{ backgroundColor: settings?.pdfHeaderColor || settings?.primaryColor || '#162836' }}>
                    <div className="flex items-center">
                        {settings?.logoUrl ? (
                            <img src={settings.logoUrl} style={{ maxHeight: '80px', width: 'auto' }} alt="Logo" />
                        ) : (
                            <h1 className="text-4xl font-bold text-white tracking-widest uppercase">{settings?.companyName}</h1>
                        )}
                    </div>
                    <div className="text-right text-white">
                        <h2 className="text-5xl font-bold tracking-tight mb-6 opacity-90 leading-none">RECIBO</h2>
                        <div className="text-xs font-bold opacity-80 space-y-0.5 uppercase tracking-wide flex flex-col items-end">
                            <div className="flex justify-end gap-6 border-b border-white/20 pb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{saleData.id.replace('VENT-', '')}</span></div>
                            {/* Updated Date Format: Date and Time without seconds */}
                            <div className="flex justify-end gap-6 border-b border-white/20 pb-1 w-full"><span className="opacity-70 text-right w-24">EMISIÓN</span> 
                                <span className="w-32 whitespace-nowrap">
                                    {new Date(saleData.date).toLocaleString('es-BO', { 
                                        year: 'numeric', 
                                        month: 'numeric', 
                                        day: 'numeric', 
                                        hour: 'numeric', 
                                        minute: '2-digit', 
                                        hour12: true 
                                    }).replace(/\./g, '') /* Remove dots from p.m. if present */}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-12 pt-12 pb-24 flex-1 flex flex-col">
                    <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                        <div className="w-[45%]">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Recibí de:</p>
                            <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{saleData.clientName}</h3>
                            <div className="text-gray-600 text-xs mt-1 space-y-1">
                                {(() => {
                                    const c = clients.find(cl => cl.name === saleData.clientName);
                                    return (
                                        <>
                                            {c?.company && <div>{c.company}</div>}
                                            {c?.nit && <div>{settings?.taxIdLabel || 'NIT'}: {c.nit}</div>}
                                            {c?.phone && <div>{c.phone}</div>}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="w-[45%] text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Emitido Por</p>
                            <div className="text-gray-600 text-xs leading-relaxed">
                                <div className="font-bold text-gray-900 mb-0.5">{senderTitle}</div>
                                <div className="whitespace-pre-wrap font-medium">{senderRest}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <div 
                            className="flex px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white rounded-md mb-2"
                            style={{ backgroundColor: settings?.pdfHeaderColor || settings?.primaryColor || '#162836' }}
                        >
                            <div className="flex-1">Descripción</div>
                            <div className="w-20 text-center">Cant.</div>
                            <div className="w-28 text-right">P. Unit</div>
                            <div className="w-28 text-right">Total</div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {saleData.items.map((item, idx) => (
                                <div key={idx} className="flex px-4 py-3 text-sm items-center">
                                    <div className="flex-1 font-medium text-gray-800 leading-snug">{cleanDescription(item.description)}</div>
                                    <div className="w-20 text-center text-gray-500">{item.quantity}</div>
                                    <div className="w-28 text-right text-gray-500">{formatCurrency(item.unitPrice, currentCurrency)}</div>
                                    <div className="w-28 text-right font-bold text-gray-900">{formatCurrency(item.total, currentCurrency)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 mt-2"></div>
                    </div>

                    {/* Summary Block */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-stretch gap-8">
                            <div className="w-[55%] flex flex-col gap-4">
                                {/* Amount in Words Card - Adjusted height */}
                                <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 h-fit">
                                    <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1">Son:</h4>
                                    <div className="text-sm font-bold text-gray-700 italic">
                                        {convertNumberToWordsEs(saleData.total, settings?.currencyName || 'Bolivianos')}
                                    </div>
                                    {/* Removed redundant settings.salesNote from here */}
                                </div>
                                
                                {/* Receipt Info / Disclaimer - OUTSIDE CARD */}
                                {(saleData.receiptInfo || settings?.receiptInfo) && (
                                    <div className="mt-2">
                                        <h4 className="font-bold text-gray-900 mb-1 text-[11px] uppercase tracking-wide">Información</h4>
                                        <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                                            {saleData.receiptInfo || settings?.receiptInfo}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-[40%] flex flex-col justify-between">
                                <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                                    <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(saleData.subtotal, currentCurrency)}</span></div>
                                    {saleData.discount && saleData.discount > 0 ? (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>Descuento ({saleData.discount}%)</span><span className="text-red-500">-{formatCurrency(saleData.subtotal * (saleData.discount/100), currentCurrency)}</span></div>) : null}
                                    {saleData.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings?.taxName || 'Impuesto'} ({settings?.taxRate || 13}%)</span><span>{formatCurrency(saleData.tax, currentCurrency)}</span></div>)}
                                    <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(saleData.total, currentCurrency)}</span></div>
                                    
                                    {/* Advance & Balance Logic for PDF */}
                                    {saleData.amountPaid > 0 && saleData.balance > 0 && (
                                        <>
                                            <div className="flex justify-between text-sm text-gray-600 font-medium border-t border-gray-200 pt-2 mt-2">
                                                <span>A Cuenta</span>
                                                <span className="text-brand-900">{formatCurrency(saleData.amountPaid, currentCurrency)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-red-600 font-bold">
                                                <span>Saldo Pendiente</span>
                                                <span>{formatCurrency(saleData.balance, currentCurrency)}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Right Aligned Container with Centered Badge Text - FIXED */}
                                    {saleData.showCustomLabel && saleData.customLabel && (
                                        <div className="flex justify-end mt-2">
                                            <div className="flex items-center justify-center text-xs font-bold text-red-600 uppercase tracking-widest px-3 py-1.5 border border-red-200 bg-red-50 rounded min-w-[100px] text-center">
                                                {saleData.customLabel}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center mt-auto w-full flex flex-col items-center">
                                    {settings?.signatureUrl && (<img src={settings.signatureUrl} className="h-20 mb-[-15px] object-contain relative z-10" alt="Firma" />)}
                                    <div className="relative pt-2 px-8 border-t border-gray-400 min-w-[200px]">
                                        <p className="text-sm font-bold text-gray-900">{settings?.signatureName}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{settings?.signatureTitle}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Fixed Height & Centered - Lowered & Adjusted for Padding */}
                <div className="absolute bottom-[-40px] left-0 w-full h-[22mm] flex items-center justify-center" style={{ backgroundColor: settings?.pdfHeaderColor || settings?.primaryColor || '#162836' }}>
                    <p className="text-[10px] text-white tracking-wider font-medium uppercase text-center pb-10">
                        {settings?.pdfFooterText || `${settings?.website} • ${settings?.address}`}
                    </p>
                </div>
            </div>
        );
    };

    // --- PDF GENERATION ---
    useEffect(() => {
        if (pdfActionData && printRef.current) {
            setTimeout(() => {
                html2canvas(printRef.current!, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pdfWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;

                    while (heightLeft >= 1) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pdfHeight;
                    }
                    
                    if (pdfActionData.action === 'download') {
                        pdf.save(`Recibo_${pdfActionData.data.id}.pdf`);
                    } else {
                        pdf.autoPrint();
                        const pdfBlob = pdf.output('bloburl');
                        window.open(pdfBlob, '_blank');
                    }
                    setPdfActionData(null);
                });
            }, 500);
        }
    }, [pdfActionData]);

    const handleDirectAction = (sale: Sale, action: 'print' | 'download', e?: React.MouseEvent) => {
        e?.preventDefault(); e?.stopPropagation();
        setPdfActionData({ data: sale, action });
    };

    const syncSalesToCloud = (updatedSales: Sale[]) => {
        setSales(updatedSales);
        localStorage.setItem('crm_sales_history', JSON.stringify(updatedSales));
        setDoc(doc(db, 'crm_data', 'sales_history'), { list: updatedSales }).catch(console.error);
    };

    // --- LOGIC: Inventory Management ---
    const updateInventoryStock = (saleItems: QuoteItem[], inventoryList: InventoryItem[], reverse: boolean = false): InventoryItem[] => {
        try {
            const inventoryUpdates = JSON.parse(JSON.stringify(inventoryList));
            let inventoryChanged = false;
            
            saleItems.forEach(saleItem => {
                const desc = saleItem.description.trim().toLowerCase();
                const productIndex = inventoryUpdates.findIndex((i: InventoryItem) => {
                    const nameMatch = desc.includes(i.name.trim().toLowerCase()); 
                    const keywordMatch = i.keywords?.toLowerCase().includes(desc);
                    return nameMatch || keywordMatch;
                });
                
                if (productIndex > -1 && inventoryUpdates[productIndex].type === 'Product') {
                    const modifier = reverse ? 1 : -1;
                    inventoryUpdates[productIndex].quantity += (saleItem.quantity * modifier);
                    
                    const qty = inventoryUpdates[productIndex].quantity;
                    const min = inventoryUpdates[productIndex].minStock || 5;
                    
                    if (qty <= 0) inventoryUpdates[productIndex].status = 'Critical';
                    else if (qty <= min) inventoryUpdates[productIndex].status = 'Low Stock';
                    else inventoryUpdates[productIndex].status = 'In Stock';
                    
                    inventoryChanged = true;
                }
            });

            if (inventoryChanged) {
                setAvailableInventory(inventoryUpdates);
                localStorage.setItem('crm_inventory', JSON.stringify(inventoryUpdates));
                setDoc(doc(db, 'crm_data', 'inventory'), { list: inventoryUpdates }).catch(e => console.error("Inv update fail", e));
            }
            return inventoryUpdates;
        } catch (e) { console.warn("Stock update warning:", e); return inventoryList; }
    };

    const handleCreateClient = async () => {
        if (!newClientData.name) { alert('El nombre es obligatorio'); return; }
        
        const newClient: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name: newClientData.name,
            company: newClientData.company || '',
            nit: newClientData.nit || '',
            email: newClientData.email || '',
            phone: newClientData.phone || '',
            address: newClientData.address || '',
            type: 'Client',
            avatar: `https://ui-avatars.com/api/?name=${newClientData.name}&background=random`
        };

        const updatedClients = [newClient, ...clients];
        setClients(updatedClients);
        localStorage.setItem('crm_clients', JSON.stringify(updatedClients));
        try { await setDoc(doc(db, 'crm_data', 'clients'), { list: updatedClients }); } catch(e) {}

        handleSelectClient(newClient);
        setNewClientData({ name: '', company: '', nit: '', email: '', phone: '', address: '' });
        setClientSearchMode(true);
    };

    const confirmFinalizeSale = () => {
        if (!newSale.clientName) { alert('Seleccione un cliente.'); return; }
        if (!newSale.items || newSale.items.length === 0) { alert('Agregue productos.'); return; }

        setConfirmModal({
            isOpen: true,
            title: editingId ? 'Guardar Cambios' : 'Confirmar Venta',
            message: `¿Estás seguro de ${editingId ? 'modificar' : 'procesar'} esta venta? Se actualizará el inventario.`,
            type: 'info',
            action: handleFinalizeSale,
            showCancel: true,
            cancelText: 'Cancelar',
            confirmText: 'Confirmar'
        });
    };

    const handleFinalizeSale = () => {
        let currentInventoryState = [...availableInventory];
        // Updated ID Generation logic
        let saleId = editingId;
        if (!saleId) {
             saleId = `VENT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        }

        // Logic to capture Real Time for new sales
        let finalDate = newSale.date ? newSale.date : new Date().toISOString().split('T')[0];
        
        // If the selected date (which is usually YYYY-MM-DD from input) matches today's date,
        // or if it's just a YYYY-MM-DD string, we try to append current time to it
        if (finalDate.length === 10) {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            if (finalDate === todayStr) {
                // If selected date is today, use current ISO time to capture hours/mins
                finalDate = now.toISOString();
            } else {
                // If selected date is different, append current time to keep format consistent
                finalDate = `${finalDate}T${now.toTimeString().split(' ')[0]}`;
            }
        }

        const finalSale: Sale = {
            id: saleId,
            clientId: newSale.clientId || 'generic',
            clientName: newSale.clientName!,
            date: finalDate, 
            items: newSale.items!,
            subtotal: newSale.subtotal || 0,
            discount: newSale.discount || 0,
            tax: newSale.tax || 0,
            total: newSale.total || 0,
            amountPaid: newSale.amountPaid || 0,
            balance: (newSale.total || 0) - (newSale.amountPaid || 0),
            paymentStatus: newSale.paymentStatus as any,
            paymentMethod: newSale.paymentMethod as any,
            notes: '',
            customLabel: newSale.customLabel,
            showCustomLabel: newSale.showCustomLabel,
            receiptInfo: newSale.receiptInfo || settings?.receiptInfo
        };
        
        if (editingId) {
            const originalSale = sales.find(s => s.id === editingId);
            if (originalSale) currentInventoryState = updateInventoryStock(originalSale.items, currentInventoryState, true); 
        }
        updateInventoryStock(finalSale.items, currentInventoryState, false);

        let updatedSales = editingId ? sales.map(s => s.id === editingId ? finalSale : s) : [finalSale, ...sales];
        if (currentUser) logAuditAction(editingId ? 'Update' : 'Create', `${editingId ? 'Modificó' : 'Nueva'} venta ${finalSale.id}`, currentUser, `Total: ${finalSale.total}`);

        syncSalesToCloud(updatedSales);
        
        // 1. Update UI State immediately to show details behind the modal
        setSelectedSale(finalSale);
        setModalType('detail');
        setNewSale({ items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0] });
        setEditingId(null);
        setTaxEnabled(false);
        setIsModalOpen(false);

        // 2. Show Confirmation
        setConfirmModal({
            isOpen: true,
            title: 'Venta Exitosa',
            message: `La venta ${finalSale.id} se guardó correctamente.\n¿Desea imprimir el recibo ahora?`,
            type: 'success',
            confirmText: 'Imprimir',
            cancelText: 'Solo Ver',
            showCancel: true,
            action: () => {
                handleDirectAction(finalSale, 'print');
                setConfirmModal(prev => ({...prev, isOpen: false}));
            }
        });
    };

    useEffect(() => {
        const sub = newSale.items?.reduce((acc, i) => acc + i.total, 0) || 0;
        const discountAmount = sub * ((newSale.discount || 0) / 100);
        const taxable = sub - discountAmount;
        const taxAmount = taxEnabled ? taxable * ((settings?.taxRate || 13) / 100) : 0;
        const total = taxable + taxAmount;
        
        // Preserve amountPaid unless user specifically paid everything (which is default logic),
        // but here we check if paid amount exceeds total to cap it or just recalculate balance.
        // We do NOT overwrite amountPaid automatically unless it was previously equal to total (full payment mode).
        
        setNewSale(prev => {
            const prevTotal = prev.total || 0;
            const prevPaid = prev.amountPaid || 0;
            // If it was fully paid before, keep it fully paid. Otherwise keep the partial amount.
            const newPaid = (prevPaid >= prevTotal && prevTotal > 0 && prev.paymentStatus === 'Paid') ? total : prevPaid;
            
            return { 
                ...prev, 
                subtotal: sub, 
                tax: taxAmount, 
                total: total,
                amountPaid: newPaid,
                balance: total - newPaid
            };
        });
    }, [newSale.items, newSale.discount, taxEnabled, settings]);

    const addItemFromCatalog = (item: InventoryItem, selectedPrice?: number) => {
        const price = selectedPrice !== undefined ? selectedPrice : item.price;
        const desc = item.name;
        
        // Check existing by exact price and name match for stacking
        const existingIdx = newSale.items?.findIndex(i => i.description === desc && i.unitPrice === price);
        
        if (existingIdx !== undefined && existingIdx > -1 && newSale.items) {
            const newItems = [...newSale.items];
            newItems[existingIdx].quantity += 1;
            newItems[existingIdx].total = newItems[existingIdx].quantity * newItems[existingIdx].unitPrice;
            setNewSale(prev => ({ ...prev, items: newItems }));
        } else {
            const newItem: QuoteItem = {
                id: Math.random().toString(36).substr(2, 9),
                description: desc,
                quantity: 1,
                unitPrice: price,
                total: price
            };
            setNewSale(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        }
        setIsCatalogModalOpen(false);
    };

    const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
        setNewSale(prev => {
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
        setNewSale(prev => ({ ...prev, items: prev.items?.filter(item => item.id !== id) || [] }));
    };

    const handleEditSale = (sale: Sale) => {
        setNewSale({ 
            clientName: sale.clientName, 
            clientId: sale.clientId, 
            items: JSON.parse(JSON.stringify(sale.items)), 
            paymentMethod: sale.paymentMethod, 
            paymentStatus: sale.paymentStatus, 
            subtotal: sale.subtotal, 
            discount: sale.discount || 0, 
            tax: sale.tax, 
            total: sale.total, 
            amountPaid: sale.amountPaid, 
            date: sale.date,
            receiptInfo: sale.receiptInfo,
            customLabel: sale.customLabel,
            showCustomLabel: sale.showCustomLabel
        });
        setTaxEnabled(sale.tax > 0);
        setEditingId(sale.id);
        setIsModalOpen(true);
        setModalType('none');
    };

    const confirmDeleteSale = (sale: Sale) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Venta',
            message: `¿ADVERTENCIA: ¿Eliminar la venta ${sale.id} permanentemente? El stock será devuelto al inventario.`,
            type: 'danger',
            confirmText: 'Eliminar',
            showCancel: true,
            cancelText: 'Cancelar',
            action: () => handleDeleteSale(sale)
        });
    };

    const handleDeleteSale = (sale: Sale) => {
        updateInventoryStock(sale.items, availableInventory, true);
        const updatedSales = sales.filter(s => s.id !== sale.id);
        syncSalesToCloud(updatedSales);
        if(currentUser) logAuditAction('Delete', `Eliminó venta ${sale.id}`, currentUser);
        setModalType('none');
        setSelectedSale(null);
        
        setConfirmModal({
            isOpen: true,
            title: 'Eliminado',
            message: 'La venta se eliminó exitosamente.',
            type: 'success',
            showCancel: false,
            confirmText: 'Aceptar',
            cancelText: '',
            action: () => setConfirmModal(prev => ({...prev, isOpen: false}))
        });
    };

    const handleSelectClient = (client: Client) => {
        setNewSale(prev => ({ ...prev, clientName: client.name, clientId: client.id }));
        setClientSearch('');
        setIsClientModalOpen(false);
    };

    const handleShareWhatsApp = (sale: Sale) => {
        let baseUrl = window.location.href.split('#')[0];
        if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
        const publicLink = `${baseUrl}#/view/sale/${sale.id}`;
        const itemsSummary = sale.items.map(i => `- ${i.quantity}x ${cleanDescription(i.description)}`).join('\n');
        const currency = settings?.currencySymbol || 'Bs';
        const text = `Le envío su Recibo ${sale.id}\n\nResumen:\n${itemsSummary}\n\nTotal: ${formatCurrency(sale.total, currency)}\n\nPuede verla y descargarla aquí:\n${publicLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        setModalType('detail');
    };

    const handleCopyLink = (sale: Sale) => {
        let baseUrl = window.location.href.split('#')[0];
        if (baseUrl.startsWith('blob:')) baseUrl = baseUrl.replace('blob:', '');
        const publicLink = `${baseUrl}#/view/sale/${sale.id}`;
        navigator.clipboard.writeText(publicLink);
        alert("Enlace copiado al portapapeles.");
    };

    // Filters
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.company && c.company.toLowerCase().includes(clientSearch.toLowerCase())));
    const filteredSales = sales.filter(s => s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm));
    const filteredProducts = availableInventory.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(productSearch.toLowerCase()) || i.sku?.toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = catalogCategory === 'All' || i.category === catalogCategory;
        const matchesType = catalogType === 'All' ? true : i.type === catalogType;
        return matchesSearch && matchesCategory && matchesType;
    });
    
    const categories = ['All', ...Array.from(new Set(availableInventory.map(i => i.category || 'General')))];

    return (
        <div className="space-y-4 pb-safe-area h-full flex flex-col bg-[#f4f6f7]">
            <ConfirmationModal 
                isOpen={confirmModal.isOpen} 
                onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                showCancel={confirmModal.showCancel}
            />

            {/* Hidden PDF Container */}
            {pdfActionData && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
                    <div ref={printRef}>
                        {renderSaleContent(pdfActionData.data)}
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-gray-500 text-sm">Historial de transacciones</p>
                </div>
                <button onClick={() => { setEditingId(null); setNewSale({ items: [], amountPaid: 0, subtotal: 0, discount: 0, tax: 0, total: 0, paymentStatus: 'Paid', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0], customLabel: settings?.customReceiptLabel || 'ENTREGADO', showCustomLabel: false, receiptInfo: settings?.receiptInfo }); setTaxEnabled(false); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-900 text-white px-5 py-3 rounded-xl text-base font-bold hover:bg-brand-800 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 min-h-[48px]">
                    <Plus size={20}/> Nueva Venta
                </button>
            </div>

            {/* --- LIST VIEW --- */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-base" placeholder="Buscar por cliente o ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredSales.map(sale => (
                        <div key={sale.id} onClick={() => { setSelectedSale(sale); setModalType('detail'); }} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center group cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold shrink-0"><CheckCircle2 size={24}/></div>
                                <div>
                                    <p className="font-bold text-gray-900 text-base">{sale.clientName}</p>
                                    <p className="text-sm text-gray-500">
                                        <span className="hidden md:inline">{sale.id} • </span>
                                        {new Date(sale.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-brand-900 text-lg whitespace-nowrap">{formatCurrency(sale.total, currentCurrency)}</p>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}</span>
                            </div>
                        </div>
                    ))}
                    {filteredSales.length === 0 && <div className="text-center py-10 text-gray-400 text-base">No se encontraron ventas.</div>}
                </div>
            </div>

            {/* --- NEW SALE MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] md:rounded-2xl md:max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col shadow-2xl">
                        <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 shrink-0 pt-safe-top">
                            <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Venta' : 'Nueva Venta'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div className="overflow-y-auto p-6 md:p-8 space-y-8 flex-1">
                            {/* Top Section: Client & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                                    <div 
                                        className="flex gap-2 relative cursor-pointer"
                                        onClick={() => { setClientSearchMode(true); setIsClientModalOpen(true); }}
                                    >
                                        <input 
                                            readOnly
                                            required 
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-gray-50 text-gray-900 outline-none cursor-pointer focus:border-brand-500 min-h-[44px]" 
                                            placeholder="Seleccionar Cliente..." 
                                            value={newSale.clientName || ''} 
                                        />
                                        <button type="button" className="px-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 border border-brand-900 shadow-md flex items-center justify-center min-h-[44px] min-w-[44px] pointer-events-none"><Search size={18}/></button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                                    <div className="relative">
                                        <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-900 outline-none focus:border-brand-900 appearance-none min-h-[44px]" value={newSale.date} onChange={e => setNewSale({...newSale, date: e.target.value})} />
                                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18}/>
                                    </div>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-700 text-sm">Ítems</h4>
                                    <button type="button" onClick={() => setIsCatalogModalOpen(true)} className="text-sm bg-brand-50 text-brand-900 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 border border-brand-200 hover:bg-brand-100 min-h-[40px]"><Package size={16}/> Catálogo</button>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {newSale.items?.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <div className="col-span-5 md:col-span-6"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-gray-900 outline-none focus:border-brand-500 text-sm truncate" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                            <div className="col-span-2"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-center text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                            <div className="col-span-3 md:col-span-3"><input className="w-full bg-transparent border-b border-gray-300 px-1 py-1 text-right text-gray-900 outline-none focus:border-brand-500 text-sm" type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                            <div className="col-span-2 md:col-span-1 text-right"><button type="button" onClick={() => removeItem(item.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><Trash2 size={16}/></button></div>
                                        </div>
                                    ))}
                                    {newSale.items?.length === 0 && <div className="text-center text-gray-400 py-8 text-sm italic">Agregue productos desde el catálogo.</div>}
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full md:w-1/2 ml-auto">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                        <span className="text-sm font-medium text-gray-600">Subtotal</span>
                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(newSale.subtotal || 0, currentCurrency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-600">Descuento</span>
                                            <div className="flex items-center bg-white px-2 py-0.5 rounded border border-gray-300">
                                                <input type="number" className="w-10 text-right text-xs outline-none font-bold text-gray-900 bg-white" value={newSale.discount || ''} onChange={(e) => setNewSale({...newSale, discount: Number(e.target.value)})} placeholder="0"/>
                                                <span className="text-xs font-bold text-gray-500">%</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-red-500">- {formatCurrency((newSale.subtotal || 0) * ((newSale.discount || 0)/100), currentCurrency)}</span>
                                    </div>
                                    <div className="flex flex-col gap-2 pb-2 border-b border-gray-200/60">
                                        <ToggleSwitch checked={taxEnabled} onChange={setTaxEnabled} label={`${settings?.taxName || 'IVA'} (${settings?.taxRate || 13}%)`} />
                                        {taxEnabled && <div className="text-right text-sm font-medium text-gray-900">{formatCurrency(newSale.tax || 0, currentCurrency)}</div>}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 pb-2 border-b border-gray-200/60">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-bold text-brand-900">{formatCurrency(newSale.total || 0, currentCurrency)}</span>
                                    </div>

                                    {/* Advance / Anticipo Section */}
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                        <span className="text-sm font-bold text-gray-700">A Cuenta / Anticipo</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">{currentCurrency}</span>
                                            <input
                                                type="number"
                                                className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm font-bold text-brand-900 outline-none focus:border-brand-500"
                                                value={newSale.amountPaid || ''}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setNewSale(prev => {
                                                       const total = prev.total || 0;
                                                       return {
                                                           ...prev,
                                                           amountPaid: val,
                                                           balance: total - val,
                                                           paymentStatus: val >= total ? 'Paid' : 'Pending'
                                                       }
                                                    });
                                                }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                         <span className="text-sm font-medium text-gray-600">Resto a Pagar</span>
                                         <span className={`text-sm font-bold ${(newSale.total || 0) - (newSale.amountPaid || 0) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                                            {formatCurrency((newSale.total || 0) - (newSale.amountPaid || 0), currentCurrency)}
                                         </span>
                                    </div>
                                    
                                    {/* Complete Payment Quick Action */}
                                    {editingId && (newSale.total || 0) - (newSale.amountPaid || 0) > 0.01 && (
                                        <button
                                            type="button"
                                            onClick={() => setNewSale(prev => ({
                                                ...prev,
                                                amountPaid: prev.total,
                                                balance: 0,
                                                paymentStatus: 'Paid'
                                            }))}
                                            className="w-full mt-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors animate-in fade-in"
                                        >
                                            <CheckCircle2 size={14} /> Liquidar Saldo (Completar Pago)
                                        </button>
                                    )}
                                    
                                    {/* CUSTOM LABEL TOGGLE */}
                                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-200/60">
                                        <div className="flex justify-between items-center gap-4">
                                            <ToggleSwitch checked={!!newSale.showCustomLabel} onChange={(val) => setNewSale({...newSale, showCustomLabel: val})} label="Nota Extra" />
                                            {newSale.showCustomLabel && (
                                                <input 
                                                    value={newSale.customLabel} 
                                                    onChange={(e) => setNewSale({...newSale, customLabel: e.target.value})} 
                                                    className="w-32 px-2 py-1 text-xs font-bold text-red-600 bg-white border border-gray-300 rounded text-right uppercase focus:border-red-500 outline-none"
                                                    placeholder="ENTREGADO"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado Pago</label>
                                        <select className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white outline-none font-bold text-gray-700" value={newSale.paymentStatus} onChange={e => setNewSale({...newSale, paymentStatus: e.target.value as any})}><option value="Paid">Pagado</option><option value="Pending">Pendiente</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método</label>
                                        <select className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white outline-none font-bold text-gray-700" value={newSale.paymentMethod} onChange={e => setNewSale({...newSale, paymentMethod: e.target.value as any})}><option value="Cash">Efectivo</option><option value="QR">QR</option><option value="Card">Tarjeta</option></select>
                                    </div>
                                </div>
                                
                                {/* Info Box */}
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Información (Recibo)</label>
                                        <span className={`text-xs font-bold ${newSale.receiptInfo?.length && newSale.receiptInfo.length > 330 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {newSale.receiptInfo?.length || 0}/330
                                        </span>
                                    </div>
                                    <textarea 
                                        maxLength={330}
                                        className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-900 min-h-[100px] resize-y bg-white text-gray-700" 
                                        placeholder="Este documento no tiene validez para crédito fiscal..." 
                                        value={newSale.receiptInfo} 
                                        onChange={(e) => setNewSale({...newSale, receiptInfo: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0 pb-safe-area">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 bg-white font-medium min-h-[48px]">Cancelar</button>
                            <button 
                                onClick={confirmFinalizeSale} 
                                disabled={!newSale.clientName || !newSale.items?.length} 
                                className="flex-1 px-6 py-3 bg-brand-900 text-white rounded-xl hover:bg-brand-800 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
                            >
                                <Save size={18}/> {editingId ? 'Guardar' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CATALOG MODAL --- */}
            {isCatalogModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div className="bg-white w-full h-full md:h-[80vh] md:rounded-2xl md:max-w-5xl flex flex-col shadow-2xl animate-in zoom-in duration-200 overflow-hidden border border-gray-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 pt-safe-top">
                            <div><h3 className="font-bold text-xl text-gray-900">Catálogo</h3><p className="text-sm text-gray-500">Selecciona ítems para añadir</p></div>
                            <button onClick={() => setIsCatalogModalOpen(false)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"><X size={24}/></button>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                            {/* ADDED TABS FOR TYPE FILTERING */}
                            <div className="flex p-1 bg-gray-200/50 rounded-xl w-full md:w-auto min-w-[200px]">
                                <button onClick={() => setCatalogType('All')} className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${catalogType === 'All' ? 'bg-white shadow text-brand-900' : 'text-gray-500'}`}>Todos</button>
                                <button onClick={() => setCatalogType('Product')} className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${catalogType === 'Product' ? 'bg-white shadow text-brand-900' : 'text-gray-500'}`}>Productos</button>
                                <button onClick={() => setCatalogType('Service')} className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${catalogType === 'Service' ? 'bg-white shadow text-brand-900' : 'text-gray-500'}`}>Servicios</button>
                            </div>

                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input autoFocus type="text" placeholder="Buscar por nombre o código..." className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-900 bg-white shadow-sm" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto relative">
                                <div className="relative w-full">
                                    <select className="appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-900 text-gray-700 bg-white shadow-sm cursor-pointer w-full" value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}>
                                        {categories.map(cat => <option key={cat} value={cat} className="text-gray-900">{cat === 'All' ? 'Todas las Categorías' : cat}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white p-0 pb-20 md:pb-0">
                            <div className="divide-y divide-gray-100">
                                {filteredProducts.map(item => (
                                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getCategoryColor(item.category)}`}>{item.category}</span>
                                                    {item.sku && <span className="text-xs text-gray-400 font-mono">{item.sku}</span>}
                                                </div>
                                                <h4 className="text-base font-bold text-gray-900 leading-tight mb-1">{item.name}</h4>
                                                {item.type === 'Product' && <span className={`text-[10px] font-bold ${item.quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>Stock: {item.quantity}</span>}
                                            </div>
                                            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0 mt-4 md:mt-0">
                                                <button onClick={() => addItemFromCatalog(item)} className="flex flex-col items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-lg text-gray-900 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-500 uppercase">Unitario</span><span className="text-sm font-bold">{formatCurrency(item.price, currentCurrency)}</span></button>
                                                {item.priceDozen && item.priceDozen > 0 && <button onClick={() => addItemFromCatalog(item, item.priceDozen)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista A</span><span className="text-sm font-bold text-blue-700">{formatCurrency(item.priceDozen, currentCurrency)}</span></button>}
                                                {item.priceBox && item.priceBox > 0 && <button onClick={() => addItemFromCatalog(item, item.priceBox)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista B</span><span className="text-sm font-bold text-orange-700">{formatCurrency(item.priceBox, currentCurrency)}</span></button>}
                                                {item.priceWholesale && item.priceWholesale > 0 && <button onClick={() => addItemFromCatalog(item, item.priceWholesale)} className="flex flex-col items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg text-gray-700 transition-all min-w-[100px] min-h-[44px]"><span className="text-[10px] font-bold text-gray-400 uppercase">Mayorista C</span><span className="text-sm font-bold text-purple-700">{formatCurrency(item.priceWholesale, currentCurrency)}</span></button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredProducts.length === 0 && <div className="p-12 text-center text-gray-400"><p>No se encontraron resultados.</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CLIENT MODAL (Unified) --- */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm md:p-4 overflow-hidden">
                    <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-2xl shadow-xl flex flex-col animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 pt-safe-top shrink-0">
                            <h3 className="font-bold text-lg text-gray-900">{clientSearchMode ? 'Buscar Cliente' : 'Nuevo Cliente'}</h3>
                            <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full"><X size={24} /></button>
                        </div>
                        
                        {clientSearchMode ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex gap-2 shrink-0">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                        <input autoFocus type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 text-gray-900 bg-white" onChange={(e) => setClientSearch(e.target.value)} />
                                    </div>
                                    <button onClick={() => setClientSearchMode(false)} className="px-4 bg-brand-900 text-white rounded-xl text-sm font-bold hover:bg-brand-800 flex items-center gap-1 min-h-[48px] shadow-md"><Plus size={16}/> Nuevo</button>
                                </div>
                                <div className="p-2 flex-1 overflow-y-auto">
                                    {filteredClients.map(c => (
                                        <div key={c.id} onClick={() => handleSelectClient(c)} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between group transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.company || 'Particular'}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-900"/>
                                        </div>
                                    ))}
                                    {filteredClients.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No se encontraron clientes.</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Nombre Completo *</label><input autoFocus required type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} placeholder="Ej. Juan Pérez"/></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Empresa</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.company} onChange={e => setNewClientData({...newClientData, company: e.target.value})} placeholder="Opcional"/></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">NIT / CI</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.nit} onChange={e => setNewClientData({...newClientData, nit: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Teléfono</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} /></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Email</label><input type="email" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Dirección</label><input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none bg-white text-gray-900 min-h-[48px] text-base" value={newClientData.address} onChange={e => setNewClientData({...newClientData, address: e.target.value})} /></div>
                                </div>
                                <div className="p-4 border-t border-gray-200 bg-white pb-safe-area flex gap-3 shrink-0">
                                    <button onClick={() => setClientSearchMode(true)} className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors bg-white min-h-[48px]">Volver</button>
                                    <button onClick={handleCreateClient} className="flex-1 px-6 py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20 min-h-[48px]">Crear Cliente</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- DETAIL MODAL --- */}
            {modalType === 'detail' && selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full h-full md:h-auto md:w-full md:max-w-lg md:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-none md:max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center pt-safe-top">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    {selectedSale.id}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase border ${selectedSale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{selectedSale.paymentStatus === 'Paid' ? 'Pagado' : 'Pendiente'}</span>
                                </h3>
                                <p className="text-sm text-gray-500">{new Date(selectedSale.date).toLocaleDateString()} • {selectedSale.clientName}</p>
                            </div>
                            <button onClick={() => setModalType('none')} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={24}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-white">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Detalle de Compra</h4>
                            <div className="space-y-3 mb-6">
                                {selectedSale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-brand-900 bg-white border border-gray-200 px-2 py-1 rounded text-xs shadow-sm">{item.quantity}x</span>
                                            <span className="text-gray-800 font-medium">{item.description}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{formatCurrency(item.total, currentCurrency)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-xl">
                                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(selectedSale.subtotal, currentCurrency)}</span></div>
                                {(selectedSale.discount || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-red-500">
                                        <span>Descuento</span>
                                        <span>-{formatCurrency(selectedSale.subtotal * ((selectedSale.discount || 0)/100), currentCurrency)}</span>
                                    </div>
                                )}
                                {selectedSale.tax > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Impuesto</span><span>{formatCurrency(selectedSale.tax, currentCurrency)}</span></div>}
                                <div className="flex justify-between text-2xl font-black text-brand-900 pt-2 border-t border-gray-200 mt-2"><span>Total</span><span>{formatCurrency(selectedSale.total, currentCurrency)}</span></div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-gray-200 grid grid-cols-2 gap-3 pb-safe-area shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => { setPdfPreview(selectedSale); setModalType('preview'); }} className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm min-h-[48px]"><Eye size={18}/> Ver PDF</button>
                            <button onClick={() => setModalType('share')} className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 border border-green-100 font-bold rounded-xl hover:bg-green-100 transition-colors shadow-sm min-h-[48px]"><Share2 size={18}/> Compartir</button>
                            <button onClick={() => handleEditSale(selectedSale)} className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm min-h-[48px]"><Edit3 size={18}/> Editar</button>
                            <button onClick={() => confirmDeleteSale(selectedSale)} className="flex items-center justify-center gap-2 py-3 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm min-h-[48px]"><Trash2 size={18}/> Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL --- */}
            {modalType === 'preview' && pdfPreview && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full h-full md:h-[90vh] md:rounded-2xl md:max-w-4xl flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 pt-safe-top">
                            <h3 className="font-bold text-lg text-gray-900">Vista Previa</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleDirectAction(pdfPreview, 'print')} className="px-4 py-2 bg-white border border-brand-900 text-brand-900 rounded-lg text-sm font-bold hover:bg-brand-50 flex items-center gap-2 min-h-[44px]"><Printer size={16}/> Imprimir</button>
                                <button onClick={() => handleDirectAction(pdfPreview, 'download')} className="px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 flex items-center gap-2 min-h-[44px]"><Download size={16}/> Descargar</button>
                                <button onClick={() => setModalType('none')} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={20}/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center items-start">
                            <div className="shadow-2xl origin-top transform scale-[0.45] sm:scale-75 md:scale-90 lg:scale-100 mt-4">
                                {renderSaleContent(pdfPreview)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SHARE MODAL --- */}
            {modalType === 'share' && selectedSale && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                        <button onClick={() => setModalType('detail')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={20}/> Compartir Recibo</h3>
                        <div className="space-y-3">
                            <button onClick={() => handleShareWhatsApp(selectedSale)} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md min-h-[48px]">Enviar por WhatsApp</button>
                            <button onClick={() => handleCopyLink(selectedSale)} className="w-full py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors min-h-[48px]"><Copy size={18}/> Copiar Enlace</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
