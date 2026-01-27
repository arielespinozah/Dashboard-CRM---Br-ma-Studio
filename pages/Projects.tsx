import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, X, Edit3, CheckCircle2, Circle, Clock, Share2, ExternalLink, User, Settings2, GripVertical } from 'lucide-react';
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
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

  // --- Handlers (AddStage, RemoveStage, etc.) ---
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

  const toggleStage = (projectId: string, stageId: string) => {
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
      // Update activeProject state immediately to reflect changes in UI/Modal
      if (updatedProject && activeProject?.id === projectId) {
          setActiveProject(updatedProject);
      }
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

  const ClientViewModal = () => {
      if (!activeProject) return null;
      const progress = calculateProgress(activeProject.stages);
      
      return (
          <div className="fixed inset-0 z-[100] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col md:flex-row h-[650px]">
                  <div className="w-full md:w-1/3 bg-gray-50 p-8 border-r border-gray-200 flex flex-col">
                      <div className="mb-8">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Vista del Cliente</h3>
                          <h2 className="text-2xl font-bold text-brand-900 leading-tight mb-2">{activeProject.title}</h2>
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium bg-white p-2 rounded-lg border border-gray-200">
                              <User size={16} className="text-brand-500"/> {activeProject.client}
                          </div>
                      </div>
                      
                      <div className="mb-auto space-y-4">
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Entrega Estimada</p>
                              <div className="flex items-center gap-2 text-brand-900 font-bold text-lg">
                                  <Calendar size={20} className="text-brand-500" />
                                  {new Date(activeProject.dueDate).toLocaleDateString()}
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-gray-200">
                          <p className="text-[10px] text-gray-500 font-bold text-center mb-2 uppercase">Link de seguimiento</p>
                          <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 gap-2 shadow-inner">
                              <input readOnly value={`brama.studio/p/${activeProject.clientViewToken}`} className="text-xs flex-1 bg-transparent outline-none text-gray-700 font-mono" />
                              <button className="text-brand-900 hover:text-brand-700 p-1 hover:bg-gray-100 rounded"><Share2 size={14}/></button>
                          </div>
                      </div>
                  </div>

                  <div className="w-full md:w-2/3 p-8 overflow-y-auto bg-white">
                      <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                          <div>
                              <h2 className="text-xl font-bold text-gray-900">Progreso del Proyecto</h2>
                              <p className="text-sm text-gray-500">Actualizado en tiempo real</p>
                          </div>
                          <span className="text-4xl font-black text-brand-900 tracking-tighter">{progress}%</span>
                      </div>
                      
                      <div className="space-y-0 relative pl-2">
                          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-200"></div>
                          {activeProject.stages.map((stage, idx) => (
                              <div key={idx} className="relative z-10 flex gap-5 pb-8 last:pb-0 group">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md flex-shrink-0 transition-all duration-500 ${stage.status === 'Completed' ? 'bg-green-500 text-white scale-110' : stage.status === 'In Progress' ? 'bg-brand-900 text-white scale-110 ring-4 ring-brand-100' : 'bg-gray-100 text-gray-300'}`}>
                                      {stage.status === 'Completed' ? <CheckCircle2 size={20}/> : stage.status === 'In Progress' ? <Clock size={20} className="animate-pulse"/> : <Circle size={16}/>}
                                  </div>
                                  <div className="pt-1 flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                          <h4 className={`font-bold text-base ${stage.status === 'Pending' ? 'text-gray-400' : 'text-gray-900'}`}>{stage.name}</h4>
                                          {stage.status === 'In Progress' && <span className="text-[10px] bg-brand-100 text-brand-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-brand-200">En Curso</span>}
                                          {stage.status === 'Completed' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-200">Listo</span>}
                                      </div>
                                      <p className="text-sm text-gray-500">
                                          {stage.status === 'Completed' ? 'Esta etapa ha sido finalizada y aprobada.' : stage.status === 'In Progress' ? 'Estamos trabajando activamente en esta fase.' : 'Programada para iniciar próximamente.'}
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur transition-all"><X size={20}/></button>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
        {/* Header and Grid - Same as before */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proyectos</h1>
                <p className="text-sm text-gray-500">Gestión de entregas y flujo de trabajo</p>
            </div>
            <button onClick={openNewProject} className="flex items-center gap-2 bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 transition-all shadow-lg active:scale-95">
                <Plus size={18} /> Nuevo Proyecto
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
            {projects.map(project => {
                const progress = calculateProgress(project.stages);
                return (
                    <div key={project.id} onClick={() => setActiveProject(project)} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden ring-1 ring-gray-100 hover:ring-brand-500/30">
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${project.priority === Priority.HIGH ? 'bg-red-500' : project.priority === Priority.MEDIUM ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                        <div className="flex justify-between items-start mb-3 mt-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{project.category}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg p-0.5 border border-gray-100">
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
            {projects.length === 0 && <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50"><p className="text-gray-500 font-medium">No hay proyectos activos.</p><button onClick={openNewProject} className="mt-4 text-brand-900 font-bold hover:underline">Crear el primero</button></div>}
        </div>

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
                <div className="p-5 border-b border-gray-200 bg-white">
                    <button onClick={() => setIsShareModalOpen(true)} className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold text-sm hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 border border-brand-900"><ExternalLink size={18}/> Ver Vista de Cliente</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><CheckCircle2 size={18} className="text-brand-600"/> Etapas del Proyecto</h3>
                    <div className="space-y-4 relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                        {activeProject.stages.map((stage) => (
                            <div key={stage.id} onClick={() => toggleStage(activeProject.id, stage.id)} className={`relative pl-10 cursor-pointer group transition-all select-none`}>
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors z-10 ${stage.status === 'Completed' ? 'bg-green-500 text-white' : stage.status === 'In Progress' ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {stage.status === 'Completed' && <CheckCircle2 size={14}/>}
                                    {stage.status === 'In Progress' && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                                </div>
                                <div className={`p-4 rounded-xl border transition-all bg-white ${stage.status === 'Completed' ? 'border-green-200 bg-green-50/50' : stage.status === 'In Progress' ? 'border-brand-500 shadow-md ring-1 ring-brand-100' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold text-sm ${stage.status === 'Completed' ? 'text-green-800 line-through' : 'text-gray-900'}`}>{stage.name}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${stage.status === 'Completed' ? 'bg-white text-green-700 border-green-200' : stage.status === 'In Progress' ? 'bg-brand-50 text-brand-900 border-brand-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{stage.status === 'Completed' ? 'Listo' : stage.status === 'In Progress' ? 'Actual' : 'Pendiente'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl sticky top-0 z-10">
                        <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 bg-white p-1 rounded-full border border-gray-200"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

        {isShareModalOpen && <ClientViewModal />}
    </div>
  );
};