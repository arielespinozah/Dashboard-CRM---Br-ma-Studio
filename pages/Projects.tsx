import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, X, Edit3, CheckCircle2, Circle, Clock, Share2, ExternalLink, User, GripVertical, LayoutGrid, List as ListIcon, MoreHorizontal, ArrowRight, AlertCircle, Copy, Check } from 'lucide-react';
import { Project, Status, Priority, ProjectStage, Client } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const defaultStagesTemplate: ProjectStage[] = [
    { id: 'st1', name: 'Briefing & Requerimientos', status: 'Pending' },
    { id: 'st2', name: 'Propuestas de Diseño', status: 'Pending' },
    { id: 'st3', name: 'Revisiones & Cambios', status: 'Pending' },
    { id: 'st4', name: 'Aprobación Final', status: 'Pending' },
    { id: 'st5', name: 'Entrega de Archivos', status: 'Pending' },
];

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('crm_projects');
      return saved ? JSON.parse(saved) : [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
      const saved = localStorage.getItem('crm_clients');
      return saved ? JSON.parse(saved) : [];
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Project>>({
    title: '', client: '', priority: Priority.MEDIUM, status: Status.PLANNED, budget: 0, category: 'Design', dueDate: new Date().toISOString().split('T')[0], stages: []
  });

  const saveProjects = async (newProjects: Project[]) => {
      setProjects(newProjects);
      localStorage.setItem('crm_projects', JSON.stringify(newProjects));
      try {
          await setDoc(doc(db, 'crm_data', 'projects'), { list: newProjects });
      } catch(e) {
          console.error("Error saving projects", e);
      }
  };

  useEffect(() => {
      const fetchFromCloud = async () => {
          try {
              const pDoc = await getDoc(doc(db, 'crm_data', 'projects'));
              if (pDoc.exists()) {
                  const cloudProjects = pDoc.data().list;
                  setProjects(cloudProjects);
                  localStorage.setItem('crm_projects', JSON.stringify(cloudProjects));
              }

              const cDoc = await getDoc(doc(db, 'crm_data', 'clients'));
              if (cDoc.exists()) {
                  const cloudClients = cDoc.data().list;
                  setClients(cloudClients);
                  localStorage.setItem('crm_clients', JSON.stringify(cloudClients));
              }
          } catch (e) {}
      };
      fetchFromCloud();
  }, []);

  // --- Handlers ---
  const handleAddStage = () => {
      const newStage: ProjectStage = { id: Math.random().toString(36).substr(2, 5), name: 'Nueva Etapa', status: 'Pending' };
      setFormData(prev => ({ ...prev, stages: [...(prev.stages || []), newStage] }));
  };

  const handleRemoveStage = (stageId: string) => {
      setFormData(prev => ({ ...prev, stages: prev.stages?.filter(s => s.id !== stageId) }));
  };

  const handleStageNameChange = (stageId: string, newName: string) => {
      setFormData(prev => ({ ...prev, stages: prev.stages?.map(s => s.id === stageId ? { ...s, name: newName } : s) }));
  };

  const openNewProject = () => {
      setEditingId(null);
      setFormData({ title: '', client: '', priority: Priority.MEDIUM, status: Status.PLANNED, budget: 0, category: 'Design', dueDate: new Date().toISOString().split('T')[0], stages: JSON.parse(JSON.stringify(defaultStagesTemplate)) });
      setIsModalOpen(true);
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData(JSON.parse(JSON.stringify(project)));
      setEditingId(project.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este proyecto permanentemente?')) {
          const filtered = projects.filter(p => p.id !== id);
          saveProjects(filtered);
          if (activeProject?.id === id) setActiveProject(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) { alert("Por favor selecciona un cliente."); return; }

    if (editingId) {
        saveProjects(projects.map(p => p.id === editingId ? { ...p, ...formData } as Project : p));
    } else {
        const project: Project = {
            id: Math.random().toString(36).substr(2, 9),
            title: formData.title || 'Nuevo Proyecto',
            client: formData.client || 'Cliente',
            status: formData.status || Status.PLANNED,
            priority: formData.priority || Priority.MEDIUM,
            dueDate: formData.dueDate || new Date().toISOString(),
            budget: Number(formData.budget),
            category: formData.category as any,
            stages: formData.stages || defaultStagesTemplate,
            clientViewToken: Math.random().toString(36).substr(2, 12)
        };
        saveProjects([...projects, project]);
    }
    setIsModalOpen(false);
  };

  const toggleStageStatus = (projectId: string, stageId: string) => {
      let updatedProject: Project | null = null;
      const updatedProjects = projects.map(p => {
          if (p.id === projectId) {
              const newStages = p.stages.map(s => {
                  if (s.id === stageId) {
                      const nextStatus = s.status === 'Pending' ? 'In Progress' : s.status === 'In Progress' ? 'Completed' : 'Pending';
                      return { ...s, status: nextStatus, date: nextStatus === 'Completed' ? new Date().toLocaleDateString() : null };
                  }
                  return s;
              });
              const allDone = newStages.every(s => s.status === 'Completed');
              const anyProgress = newStages.some(s => s.status === 'In Progress' || s.status === 'Completed');
              updatedProject = { 
                  ...p, 
                  stages: newStages, 
                  status: allDone ? Status.COMPLETED : anyProgress ? Status.IN_PROGRESS : Status.PLANNED 
              };
              return updatedProject;
          }
          return p;
      });
      saveProjects(updatedProjects);
      if (updatedProject && activeProject?.id === projectId) {
          setActiveProject(updatedProject);
      }
  };

  const handleUpdateDate = (projectId: string, newDate: string) => {
      const updatedProjects = projects.map(p => p.id === projectId ? { ...p, dueDate: newDate } : p);
      saveProjects(updatedProjects);
      if (activeProject?.id === projectId) {
          setActiveProject({ ...activeProject, dueDate: newDate });
      }
  };

  // --- SHARE LINK LOGIC ---
  const handleCopyLink = (token: string) => {
      // Robust link generation handling potential path issues in different environments
      let baseUrl = window.location.href.split('#')[0];
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const link = `${baseUrl}/#/p/${token}`;
      
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  const calculateProgress = (stages: ProjectStage[]) => {
      if (!stages || stages.length === 0) return 0;
      const completed = stages.filter(s => s.status === 'Completed').length;
      return Math.round((completed / stages.length) * 100);
  };

  const getPriorityColor = (p: Priority) => {
      switch(p) {
          case Priority.HIGH: return 'bg-red-100 text-red-800 border-red-200';
          case Priority.MEDIUM: return 'bg-orange-100 text-orange-800 border-orange-200';
          case Priority.LOW: return 'bg-blue-100 text-blue-800 border-blue-200';
          default: return 'bg-gray-100';
      }
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-safe-area">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proyectos</h1>
                <p className="text-sm text-gray-500">Gestión de entregas y flujo de trabajo</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 p-1 rounded-xl mr-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}><LayoutGrid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}><ListIcon size={18}/></button>
                </div>
                <button onClick={openNewProject} className="flex items-center gap-2 bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 transition-all shadow-lg active:scale-95">
                    <Plus size={18} /> Nuevo
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
                    <p className="text-gray-500 font-medium mb-4">No hay proyectos activos.</p>
                    <button onClick={openNewProject} className="text-brand-900 font-bold hover:underline">Crear el primero</button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {projects.map(project => {
                        const progress = calculateProgress(project.stages);
                        return (
                            <div key={project.id} onClick={() => setActiveProject(project)} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden ring-1 ring-gray-100 hover:ring-brand-500/30">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${project.priority === Priority.HIGH ? 'bg-red-500' : project.priority === Priority.MEDIUM ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                                <div className="flex justify-between items-start mb-3 mt-2">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{project.category}</span>
                                    <div className="flex gap-1">
                                        <button onClick={(e) => handleEdit(project, e)} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-md transition-colors"><Edit3 size={14}/></button>
                                        <button onClick={(e) => handleDelete(project.id, e)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1 leading-snug line-clamp-2">{project.title}</h3>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-1 flex items-center gap-1"><User size={14}/> {project.client}</p>
                                <div className="mt-auto bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div className="flex justify-between text-xs mb-2 font-bold text-gray-700"><span>Progreso</span><span>{progress}%</span></div>
                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                                        <div className={`h-full transition-all duration-700 ease-out rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-brand-900'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                                        <div className={`flex items-center gap-1.5 font-medium ${new Date(project.dueDate) < new Date() && project.status !== Status.COMPLETED ? 'text-red-600' : 'text-gray-600'}`}><Calendar size={14} />{new Date(project.dueDate).toLocaleDateString()}</div>
                                        {project.budget > 0 && <span className="text-gray-900 font-bold">Bs. {project.budget}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Proyecto</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Prioridad</th>
                                    <th className="px-6 py-4 w-1/4">Progreso</th>
                                    <th className="px-6 py-4">Entrega</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projects.map(project => {
                                    const progress = calculateProgress(project.stages);
                                    return (
                                        <tr key={project.id} onClick={() => setActiveProject(project)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 text-sm">{project.title}</p>
                                                <span className="text-[10px] text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{project.category}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{project.client}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${getPriorityColor(project.priority)}`}>{project.priority}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-brand-900'}`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(project.dueDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={(e) => handleEdit(project, e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                                                    <button onClick={(e) => handleDelete(project.id, e)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* Project Details Drawer */}
        {activeProject && (
            <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200">
                <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${getPriorityColor(activeProject.priority)}`}>{activeProject.priority}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-white text-gray-700 border border-gray-300">{activeProject.category}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{activeProject.title}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 font-medium"><User size={14}/> {activeProject.client}</div>
                    </div>
                    <button onClick={() => setActiveProject(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-5 border-b border-gray-200 bg-white space-y-4">
                    {/* Public Link Share */}
                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2"><ExternalLink size={16}/> Enlace Público para Cliente</h4>
                            <span className="text-[10px] text-brand-700 bg-white px-2 py-0.5 rounded-full border border-brand-100">Solo Lectura</span>
                        </div>
                        <div className="flex gap-2">
                            <input readOnly value={`${window.location.href.split('#')[0]}#/p/${activeProject.clientViewToken}`} className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 text-gray-600 outline-none select-all" />
                            <button onClick={() => handleCopyLink(activeProject.clientViewToken!)} className="bg-brand-900 text-white px-3 rounded-lg hover:bg-brand-800 transition-colors">
                                {linkCopied ? <Check size={16}/> : <Copy size={16}/>}
                            </button>
                        </div>
                        <p className="text-[10px] text-brand-600/70 mt-2 leading-tight">
                            Comparte este enlace con tu cliente. Podrá ver el progreso en tiempo real sin acceder al sistema.
                        </p>
                    </div>

                    {/* Date Control */}
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-gray-500"/>
                            <div>
                                <p className="text-xs font-bold text-gray-900 uppercase">Fecha de Entrega</p>
                                <p className="text-[10px] text-gray-500">Modificar si es necesario</p>
                            </div>
                        </div>
                        <input 
                            type="date" 
                            className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900 outline-none focus:border-brand-900"
                            value={activeProject.dueDate}
                            onChange={(e) => handleUpdateDate(activeProject.id, e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider"><CheckCircle2 size={18} className="text-brand-600"/> Control de Etapas</h3>
                    <div className="space-y-4 relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                        {activeProject.stages.map((stage) => (
                            <div key={stage.id} onClick={() => toggleStageStatus(activeProject.id, stage.id)} className={`relative pl-10 cursor-pointer group transition-all select-none`}>
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors z-10 ${stage.status === 'Completed' ? 'bg-green-500 text-white' : stage.status === 'In Progress' ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {stage.status === 'Completed' && <CheckCircle2 size={14}/>}
                                    {stage.status === 'In Progress' && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                                </div>
                                <div className={`p-4 rounded-xl border transition-all bg-white flex justify-between items-center group-hover:shadow-md ${stage.status === 'Completed' ? 'border-green-200 bg-green-50/50' : stage.status === 'In Progress' ? 'border-brand-500 ring-1 ring-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                                    <div>
                                        <span className={`font-bold text-sm block ${stage.status === 'Completed' ? 'text-green-800 line-through' : 'text-gray-900'}`}>{stage.name}</span>
                                        <span className="text-[10px] text-gray-500">{stage.status === 'Completed' ? 'Finalizado' : stage.status === 'In Progress' ? 'Trabajando...' : 'Haga clic para iniciar'}</span>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 ${stage.status === 'Completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Modal Form (New/Edit) - Kept mostly same but ensures clean logic */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl sticky top-0 z-10">
                        <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 bg-white p-1 rounded-full border border-gray-200"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Form Inputs (Same as before) */}
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Título del Proyecto</label><input required type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej. Branding Corporativo"/></div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Cliente</label>
                            <select required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none appearance-none" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})}>
                                <option value="" disabled>Seleccionar Cliente...</option>
                                {clients.map(client => (<option key={client.id} value={client.name}>{client.name} - {client.company}</option>))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Prioridad</label><select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select></div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Presupuesto (Bs.)</label><input type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Fecha de Entrega</label><input type="date" required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none focus:border-brand-900" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /></div>
                        
                        {/* Stage Editor */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase">Personalizar Etapas</label>
                                <button type="button" onClick={handleAddStage} className="text-xs bg-brand-50 text-brand-900 px-2 py-1 rounded-md font-bold border border-brand-200 hover:bg-brand-100 flex items-center gap-1"><Plus size={12}/> Agregar Etapa</button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {formData.stages?.map((stage, idx) => (
                                    <div key={stage.id || idx} className="flex gap-2 items-center">
                                        <GripVertical size={16} className="text-gray-400 cursor-move"/>
                                        <input type="text" value={stage.name} onChange={(e) => handleStageNameChange(stage.id, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:border-brand-900 outline-none"/>
                                        <button type="button" onClick={() => handleRemoveStage(stage.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100 mt-4">
                            <button type="submit" className="w-full py-3.5 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 transition-all shadow-lg hover:shadow-xl">{editingId ? 'Guardar Cambios' : 'Crear Proyecto'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};