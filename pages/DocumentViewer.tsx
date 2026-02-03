
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quote, Sale, AppSettings, Client } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Download, AlertTriangle, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Shared Helper Functions ---
const formatCurrency = (amount: number, settings: AppSettings) => {
    const safeAmount = Number(amount) || 0;
    const val = safeAmount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const Unidades = (num: number) => {
    switch (num) {
        case 1: return "UN";
        case 2: return "DOS";
        case 3: return "TRES";
        case 4: return "CUATRO";
        case 5: return "CINCO";
        case 6: return "SEIS";
        case 7: return "SIETE";
        case 8: return "OCHO";
        case 9: return "NUEVE";
        default: return "";
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
        default: return Unidades(unidad);
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

export const DocumentViewer = () => {
    const { type, id } = useParams<{ type: 'quote' | 'sale'; id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<Quote | Sale | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [clientData, setClientData] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Load Settings
                const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
                let currentSettings: AppSettings;
                if (sDoc.exists()) {
                    currentSettings = sDoc.data() as AppSettings;
                } else {
                    currentSettings = {
                        companyName: 'Bráma Studio', address: '', website: '', phone: '', primaryColor: '#162836',
                        pdfHeaderColor: '#162836', pdfSenderInfo: '', pdfFooterText: '', paymentInfo: '', termsAndConditions: '', currencySymbol: 'Bs',
                        currencyName: 'Bolivianos', currencyPosition: 'before', decimals: 2, taxRate: 13, taxName: 'IVA', signatureName: '', signatureTitle: ''
                    };
                }
                setSettings(currentSettings);

                // Update Page Meta Tags based on Settings
                if (currentSettings) {
                    const title = currentSettings.socialShareTitle || `Documento Digital | ${currentSettings.companyName}`;
                    document.title = title;
                    
                    // Update meta tags dynamically
                    const updateMeta = (name: string, content: string) => {
                        let element = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
                        if (!element) {
                            element = document.createElement('meta');
                            element.setAttribute('property', name);
                            document.head.appendChild(element);
                        }
                        element.setAttribute('content', content);
                    };

                    updateMeta('og:title', title);
                    updateMeta('og:description', currentSettings.socialShareDescription || 'Visualiza y descarga tu documento de manera segura.');
                    updateMeta('og:site_name', currentSettings.companyName);
                    if (currentSettings.socialPreviewUrl) {
                        updateMeta('og:image', currentSettings.socialPreviewUrl);
                    }
                }

                // 2. Load Document
                const collectionName = type === 'quote' ? 'quotes' : 'sales_history';
                const docRef = await getDoc(doc(db, 'crm_data', collectionName));
                
                let foundDoc: Quote | Sale | undefined;

                if (docRef.exists()) {
                    const list = docRef.data().list as (Quote | Sale)[];
                    foundDoc = list.find(item => item.id === id);
                }
                
                if (!foundDoc) {
                    // Fallback local
                    const localKey = type === 'quote' ? 'crm_quotes' : 'crm_sales_history';
                    const localData = localStorage.getItem(localKey);
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        foundDoc = parsed.find((item: any) => item.id === id);
                    }
                }

                if (foundDoc) {
                    setData(foundDoc);
                    
                    // 3. Load Client Data for Details
                    try {
                        const clientsDoc = await getDoc(doc(db, 'crm_data', 'clients'));
                        if (clientsDoc.exists()) {
                            const clientsList = clientsDoc.data().list as Client[];
                            // Try to match by ID first, then Name
                            const docClientId = 'clientId' in foundDoc ? (foundDoc as Sale).clientId : undefined;
                            const matchedClient = clientsList.find(c => c.id === docClientId || c.name === foundDoc?.clientName);
                            if (matchedClient) setClientData(matchedClient);
                        }
                    } catch (e) { console.log("Could not fetch extra client details"); }

                } else {
                    setError('Documento no encontrado.');
                }

            } catch (err) { setError('Error al cargar el documento.'); } finally { setLoading(false); }
        };
        fetchData();
    }, [type, id]);

    const handleDownload = async () => {
        if (!printRef.current || !data) return;
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${type === 'quote' ? 'Cotizacion' : 'Recibo'}_${data.id}.pdf`);
        } catch (e) { alert('Error al generar PDF. Por favor intente de nuevo.'); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-900"></div></div>;
    if (error || !data || !settings) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle size={32}/></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Documento no disponible</h2>
            <p className="text-gray-500">{error || 'El enlace podría estar roto o el documento fue eliminado.'}</p>
            <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-brand-900 text-white rounded-xl font-bold">Volver al Inicio</button>
        </div>
    );

    const isQuote = (item: Quote | Sale): item is Quote => 'validUntil' in item;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4 md:py-8 px-0 md:px-4">
            {/* Header / Download Bar - Sticky on Mobile */}
            <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-4 px-4 sticky top-0 z-50 bg-gray-100/90 backdrop-blur-sm py-2 transition-all shadow-sm rounded-xl border border-gray-200/50">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-start">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2.5 bg-white rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm border border-gray-200 transition-all active:scale-95 flex-shrink-0"
                        title="Volver"
                    >
                        <ArrowLeft size={20}/>
                    </button>
                    <div className="text-left overflow-hidden">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-none truncate">{settings.companyName}</h1>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">Documento • {data.id}</p>
                    </div>
                </div>
                <button onClick={handleDownload} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-800 transition-all active:scale-95">
                    <Download size={20}/> <span className="hidden sm:inline">Descargar PDF</span><span className="sm:hidden">Descargar</span>
                </button>
            </div>

            {/* Responsive Container Wrapper */}
            <div className="w-full overflow-x-hidden flex justify-center bg-transparent relative">
                {/* Scale wrapper for mobile fit - Optimized to be full width on small screens without extra margins */}
                <div className="origin-top transform-gpu shadow-2xl rounded-sm overflow-hidden animate-in fade-in zoom-in duration-300 bg-white" style={{ 
                    // Calculate scale to fit width: 794px is approx A4 width at 96dpi
                    // On mobile, we want it to fit 100vw comfortably
                    transform: `scale(var(--scale-factor, 1))`,
                    '--scale-factor': 'min(1, calc(100vw / 794))'
                } as React.CSSProperties}>
                    {/* Fixed Width Container - This ensures the PDF structure stays intact */}
                    <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans shadow-none flex-shrink-0" style={{padding:0}}>
                        {/* Header */}
                        <div className="p-10 flex justify-between items-center" style={{ backgroundColor: settings.pdfHeaderColor || settings.primaryColor }}>
                            <div className="flex items-center">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} style={{ maxHeight: '80px', width: 'auto' }} alt="Logo" />
                                ) : (
                                    <h1 className="text-4xl font-bold text-white tracking-widest uppercase">{settings.companyName}</h1>
                                )}
                            </div>
                            <div className="text-right text-white">
                                <h2 className="text-5xl font-bold tracking-tight mb-2 opacity-90 leading-none">{type === 'quote' ? 'COTIZACIÓN' : 'RECIBO'}</h2>
                                <div className="text-xs font-bold opacity-80 space-y-1 uppercase tracking-wide flex flex-col items-end">
                                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">NRO</span> <span className="font-mono text-sm w-32">{data.id.replace(type === 'quote' ? 'COT-' : 'VTA-', '')}</span></div>
                                    <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-24">EMISIÓN</span> <span className="w-32 whitespace-nowrap">{new Date(data.date).toLocaleDateString()}</span></div>
                                    {isQuote(data) && (
                                        <div className="flex justify-end gap-6 border-b border-white/20 pb-1 mb-1 w-full"><span className="opacity-70 text-right w-32">VÁLIDO HASTA</span> <span className="w-32">{new Date(data.validUntil).toLocaleDateString()}</span></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="px-12 pt-12">
                            <div className="flex justify-between mb-8 text-sm border-b border-gray-100 pb-8">
                                <div className="w-[45%]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">{type === 'quote' ? 'Cotizado a:' : 'Recibí de:'}</p>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{data.clientName}</h3>
                                    <div className="text-gray-600 text-xs mt-1 space-y-1">
                                        {clientData?.company && <div>{clientData.company}</div>}
                                        {clientData?.nit && <div>{settings.taxIdLabel || 'NIT'}: {clientData.nit}</div>}
                                        {'clientEmail' in data && data.clientEmail && <div>{data.clientEmail}</div>}
                                        {clientData?.phone && <div>{clientData.phone}</div>}
                                    </div>
                                </div>
                                <div className="w-[45%] text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Casa Matriz</p>
                                    <div className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                        {settings.pdfSenderInfo || `${settings.companyName}\n${settings.address}`}
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-10">
                                <div 
                                    className="flex px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white rounded-md mb-2"
                                    style={{ backgroundColor: settings.pdfHeaderColor || settings.primaryColor }}
                                >
                                    <div className="flex-1">Descripción</div>
                                    <div className="w-20 text-center">Cant.</div>
                                    <div className="w-28 text-right">P. Unit</div>
                                    <div className="w-28 text-right">Total</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="flex px-4 py-3 text-sm items-center">
                                            <div className="flex-1 font-medium text-gray-800 leading-snug">{item.description}</div>
                                            <div className="w-20 text-center text-gray-500">{item.quantity}</div>
                                            <div className="w-28 text-right text-gray-500">{formatCurrency(item.unitPrice, settings)}</div>
                                            <div className="w-28 text-right font-bold text-gray-900">{formatCurrency(item.total, settings)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 mt-2"></div>
                            </div>

                            {/* Footer Section */}
                            <div className="flex justify-between items-start">
                                <div className="w-[55%] pr-8">
                                    {/* Only Show Payment & Terms for QUOTES */}
                                    {isQuote(data) && (
                                        <>
                                            <div className="mb-6">
                                                <h4 className="font-bold text-gray-900 mb-3 text-[11px] uppercase tracking-wide">Métodos de Pago</h4>
                                                <div className="flex gap-5 items-start">
                                                    {settings.qrCodeUrl && (
                                                        <div className="flex-shrink-0">
                                                            <img src={settings.qrCodeUrl} className="h-24 w-24 object-contain mix-blend-multiply" alt="QR" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                                        {settings.paymentInfo || 'Sin información bancaria configurada.'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6">
                                                <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">Términos y Condiciones</h4>
                                                <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                                                    {data.termsAndConditions || settings.termsAndConditions}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    <div className="mt-6">
                                        <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">Son:</h4>
                                        <div className="text-sm font-bold text-gray-700 italic border-l-4 border-gray-300 pl-3 py-1">
                                            {convertNumberToWordsEs(data.total, settings.currencyName)}
                                        </div>
                                    </div>
                                </div>

                                <div className="w-[40%] flex flex-col items-end">
                                    <div className="w-full bg-gray-50 p-5 rounded-lg space-y-2 border border-gray-100 mb-8">
                                        <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Subtotal</span><span>{formatCurrency(data.subtotal, settings)}</span></div>
                                        {data.discount && data.discount > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>Descuento ({data.discount}%)</span><span className="text-red-500">-{formatCurrency(data.subtotal * (data.discount/100), settings)}</span></div>)}
                                        {data.tax > 0 && (<div className="flex justify-between text-sm text-gray-600 font-medium"><span>{settings.taxName} ({settings.taxRate}%)</span><span>{formatCurrency(data.tax, settings)}</span></div>)}
                                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1"><span>TOTAL</span><span>{formatCurrency(data.total, settings)}</span></div>
                                    </div>

                                    <div className="text-center mt-4 w-full flex flex-col items-center">
                                        {settings.signatureUrl && (<img src={settings.signatureUrl} className="h-20 mb-[-15px] object-contain relative z-10" alt="Firma" />)}
                                        <div className="relative pt-2 px-8 border-t border-gray-400 min-w-[200px]">
                                            <p className="text-sm font-bold text-gray-900">{settings.signatureName}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{settings.signatureTitle}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Dynamic Color */}
                        <div className="absolute bottom-0 left-0 w-full">
                            <div 
                                className="text-center py-3 border-t border-white/20"
                                style={{ backgroundColor: settings.pdfHeaderColor || settings.primaryColor }}
                            >
                                <p className="text-[10px] text-white tracking-wider font-medium uppercase">{settings.pdfFooterText || `${settings.website} • ${settings.address}`}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
