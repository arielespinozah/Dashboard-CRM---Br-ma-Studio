import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Quote, Sale, AppSettings } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Download, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Shared Helper Functions (Duplicated to ensure standalone functionality) ---
const formatCurrency = (amount: number, settings: AppSettings) => {
    const safeAmount = Number(amount) || 0;
    const val = safeAmount.toLocaleString(undefined, { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals });
    return settings.currencyPosition === 'before' ? `${settings.currencySymbol} ${val}` : `${val} ${settings.currencySymbol}`;
};

const convertNumberToWordsEs = (amount: number, currencyName: string) => {
    // Simplified for viewer, full implementation can be imported if extracted to utils
    return `${(Number(amount) || 0).toFixed(2)} ${currencyName.toUpperCase()}`; 
};

export const DocumentViewer = () => {
    const { type, id } = useParams<{ type: 'quote' | 'sale'; id: string }>();
    const [data, setData] = useState<Quote | Sale | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
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
                    // Fallback defaults
                    currentSettings = {
                        companyName: 'Bráma Studio',
                        address: '', website: '', phone: '', primaryColor: '#162836',
                        pdfHeaderColor: '#162836', pdfSenderInfo: '', pdfFooterText: '',
                        paymentInfo: '', termsAndConditions: '', currencySymbol: 'Bs',
                        currencyName: 'Bolivianos', currencyPosition: 'before', decimals: 2,
                        taxRate: 13, taxName: 'IVA', signatureName: '', signatureTitle: ''
                    };
                }
                setSettings(currentSettings);

                // 2. Load Document
                const collectionName = type === 'quote' ? 'quotes' : 'sales_history';
                const docRef = await getDoc(doc(db, 'crm_data', collectionName));
                
                if (docRef.exists()) {
                    const list = docRef.data().list as (Quote | Sale)[];
                    const found = list.find(item => item.id === id);
                    
                    if (found) {
                        setData(found);
                    } else {
                        // Fallback to local storage for local-only entries
                        const localKey = type === 'quote' ? 'crm_quotes' : 'crm_sales_history';
                        const localData = localStorage.getItem(localKey);
                        if (localData) {
                            const parsed = JSON.parse(localData);
                            const localFound = parsed.find((item: any) => item.id === id);
                            if (localFound) setData(localFound);
                            else setError('Documento no encontrado.');
                        } else {
                            setError('Documento no encontrado.');
                        }
                    }
                } else {
                     setError('Base de datos no disponible.');
                }
            } catch (err) {
                console.error(err);
                setError('Error al cargar el documento.');
            } finally {
                setLoading(false);
            }
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
        } catch (e) {
            alert('Error al generar PDF. Por favor intente de nuevo.');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-900"></div></div>;
    
    if (error || !data || !settings) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle size={32}/></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Documento no disponible</h2>
            <p className="text-gray-500">{error || 'El enlace podría estar roto o el documento fue eliminado.'}</p>
        </div>
    );

    // Determines if it is a Quote or Sale for strict typing
    const isQuote = (item: Quote | Sale): item is Quote => 'validUntil' in item;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{settings.companyName}</h1>
                    <p className="text-sm text-gray-500">Documento Digital • {data.id}</p>
                </div>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-800 transition-all active:scale-95">
                    <Download size={20}/> Descargar PDF
                </button>
            </div>

            <div className="bg-white shadow-2xl rounded-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 relative font-sans shadow-none" style={{padding:0}}>
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
                                {isQuote(data) && data.clientEmail && <div className="text-gray-500 text-xs mt-1">{data.clientEmail}</div>}
                            </div>
                            <div className="w-[45%] text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">De:</p>
                                <div className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                    {settings.pdfSenderInfo || `${settings.companyName}\n${settings.address}`}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-10">
                            <div className="bg-gray-50 flex px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 rounded-md mb-2">
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
                                
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2 text-[11px] uppercase tracking-wide">Términos y Condiciones</h4>
                                    <div className="text-[10px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                                        {isQuote(data) ? (data.termsAndConditions || settings.termsAndConditions) : settings.termsAndConditions}
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

                    <div className="absolute bottom-0 left-0 w-full">
                        <div className="bg-gray-100 text-center py-3 border-t border-gray-200">
                            <p className="text-[10px] text-gray-500 tracking-wider font-medium uppercase">{settings.pdfFooterText || `${settings.website} • ${settings.address}`}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};