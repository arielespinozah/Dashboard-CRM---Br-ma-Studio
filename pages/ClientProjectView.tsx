import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Project, AppSettings } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock, Circle, AlertTriangle, User } from 'lucide-react';

export const ClientProjectView = () => {
    const { token } = useParams<{ token: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            // 1. Try to get settings for branding
            const localSettings = localStorage.getItem('crm_settings');
            if (localSettings) setSettings(JSON.parse(localSettings));
            else {
                try {
                    const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
                    if (sDoc.exists()) setSettings(sDoc.data() as AppSettings);
                } catch(e) {}
            }

            // 2. Find Project by Token
            // Since we don't have a direct index by token in this simple setup, we fetch list and filter.
            // In a production app with millions of records, you'd query by field.
            let foundProject: Project | undefined;
            
            try {
                const pDoc = await getDoc(doc(db, 'crm_data', 'projects'));
                if (pDoc.exists()) {
                    const list = pDoc.data().list as Project[];
                    foundProject = list.find(p => p.clientViewToken === token);
                }
            } catch(e) {
                console.error("Cloud fetch failed", e);
            }

            // Fallback to local if not found (for demo/local mode compatibility)
            if (!foundProject) {
                const local = localStorage.getItem('crm_projects');
                if (local) {
                    const list = JSON.parse(local) as Project[];
                    foundProject = list.find(p => p.clientViewToken === token);
                }
            }

            setProject(foundProject || null);
            setLoading(false);
        };

        fetchProject();
    }, [token]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-brand-900 border-t-transparent rounded-full animate-spin"></div></div>;

    if (!project) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <AlertTriangle size={48} className="text-gray-300 mb-4"/>
            <h2 className="text-xl font-bold text-gray-900">Proyecto no encontrado</h2>
            <p className="text-gray-500 text-sm mt-2">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
    );

    const completed = project.stages.filter(s => s.status === 'Completed').length;
    const progress = Math.round((completed / project.stages.length) * 100);
    const companyName = settings?.companyName || 'Bráma Studio';

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-brand-900 tracking-tight">{companyName}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Portal de Cliente</p>
                    </div>
                    <div className="bg-brand-50 text-brand-900 px-3 py-1 rounded-full text-xs font-bold border border-brand-100">
                        {project.id}
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
                {/* Hero Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-brand-900 p-8 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-2">{project.title}</h2>
                                <p className="opacity-80 flex items-center gap-2"><User size={16}/> {project.client}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Entrega Estimada</p>
                                <div className="text-lg font-bold flex items-center justify-center gap-2">
                                    <Calendar size={18}/> {new Date(project.dueDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Progreso General</h3>
                                <p className="text-sm text-gray-500">Actualizado en tiempo real</p>
                            </div>
                            <span className="text-4xl font-black text-brand-900 tracking-tighter">{progress}%</span>
                        </div>
                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-brand-900 transition-all duration-1000 ease-out rounded-full relative overflow-hidden" style={{ width: `${progress}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">Etapas del Proyecto</h3>
                    <div className="relative pl-4 md:pl-8 space-y-8">
                        <div className="absolute left-[23px] md:left-[39px] top-4 bottom-4 w-0.5 bg-gray-100"></div>
                        {project.stages.map((stage, idx) => (
                            <div key={idx} className="relative z-10 flex gap-4 md:gap-6 group">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-md flex-shrink-0 transition-all ${stage.status === 'Completed' ? 'bg-green-500 text-white' : stage.status === 'In Progress' ? 'bg-brand-900 text-white' : 'bg-gray-100 text-gray-300'}`}>
                                    {stage.status === 'Completed' ? <CheckCircle2 size={24}/> : stage.status === 'In Progress' ? <Clock size={24} className="animate-pulse"/> : <Circle size={20}/>}
                                </div>
                                <div className={`flex-1 p-5 rounded-2xl border transition-all ${stage.status === 'Completed' ? 'bg-green-50/30 border-green-100' : stage.status === 'In Progress' ? 'bg-white border-brand-200 shadow-lg ring-1 ring-brand-100' : 'bg-white border-gray-100'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className={`font-bold text-base md:text-lg ${stage.status === 'Pending' ? 'text-gray-400' : 'text-gray-900'}`}>{stage.name}</h4>
                                        {stage.status === 'In Progress' && <span className="text-[10px] bg-brand-900 text-white px-2 py-1 rounded-full font-bold uppercase tracking-wide">En Curso</span>}
                                        {stage.status === 'Completed' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase tracking-wide">Listo</span>}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {stage.status === 'Completed' ? 'Fase completada y aprobada.' : stage.status === 'In Progress' ? 'El equipo está trabajando activamente en esta fase.' : 'Programada para iniciar próximamente.'}
                                    </p>
                                    {stage.date && <p className="text-xs text-green-600 mt-2 font-medium">Finalizado el: {stage.date}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="text-center text-gray-400 text-sm py-8">
                    <p>&copy; {new Date().getFullYear()} {companyName}. Todos los derechos reservados.</p>
                </footer>
            </main>
        </div>
    );
};