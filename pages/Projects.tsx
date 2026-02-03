import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Trash2, X, Edit3, CheckCircle2, Circle, Clock, Share2, ExternalLink, User, GripVertical, LayoutGrid, List as ListIcon, MoreHorizontal, ArrowRight, AlertCircle, Copy, Check, Lock, PieChart, PauseCircle, PlayCircle } from 'lucide-react';
import { Project, Status, Priority, ProjectStage, Client, User as UserType, CalendarEvent, AuditLog } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';

const defaultStagesTemplate: ProjectStage[] = [
    { id: 'st1', name: 'Briefing & Requerimientos', status: 'Pending' },
    { id: 'st2', name: 'Propuestas de Diseño', status: 'Pending' },
    { id: 'st3', name: 'Revisiones & Cambios', status: 'Pending' },
    { id: 'st4', name: 'Aprobación Final', status: 'Pending' },
    { id: 'st5', name: 'Entrega de Archivos', status: 'Pending' },
];

// Local Audit Log Helper
const logAuditAction = async (action: 'Delete' | 'Update' | 'Create', description: string, user: UserType, metadata?: string) => {
    const log: AuditLog = {
        id: Date.now().toString(),
        action,
        module: 'Projects',
        description,
        user: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        metadata
    };
    
    // Save locally
    const savedLogs = localStorage.getItem('crm_audit_logs');
    const logs = savedLogs ? JSON.parse(savedLogs) : [];
    const updatedLogs = [log, ...logs];
    localStorage.setItem('crm_audit_logs', JSON.stringify(updatedLogs));

    // Save cloud
    try {
        await setDoc(doc(db, 'crm_data', 'audit_logs'), { list: updatedLogs });
    } catch(e) {
        console.error("Audit sync error", e);
    }
};

export const Projects = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
      const u = localStorage.getItem('crm_active_user');
      return u ? JSON.parse(u) : null;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('crm_projects');
      return saved ? JSON.parse(saved) : [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
      const saved = localStorage.getItem('crm_clients');
      return saved ? JSON.parse(saved) : [];
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {}, type: 'info' as 'info'|'danger'|'success' });

  const [formData, setFormData] = useState<Partial<Project>>({
    title: '', client: '', priority: Priority.MEDIUM, status: Status.PLANNED, budget: 0, category: 'Design', dueDate: new Date().toISOString().split('T')[0], stages: []
  });

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Sales' || currentUser?.permissions?.includes('view_projects');

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      return {
          total: projects.length,
          completed: projects.filter(p => p.status === Status.COMPLETED).length,
          inProgress: projects.filter(p => p.status === Status.IN_PROGRESS).length,
          planned: projects.filter(p => p.status === Status.PLANNED).length,
          onHold: projects.filter(p => p.status === Status.ON_HOLD).length
      };
  }, [projects]);

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
                  const cloudProjects = (pDoc.data() as any).list;
                  setProjects(cloudProjects);
                  localStorage.setItem('crm_projects', JSON.stringify(cloudProjects));
              }

              const cDoc = await getDoc(doc(db, 'crm_data', 'clients'));
              if (cDoc.exists()) {
                  const cloudClients = (cDoc.data() as any).list;
                  setClients(cloudClients);
                  localStorage.setItem('crm_clients', JSON.stringify(cloudClients));
              }

              // Load Calendar to check dependencies
              const calDoc = await getDoc(doc(db, 'crm_data', 'calendar'));
              if (calDoc.exists()) {
                  setCalendarEvents((calDoc.data() as any).list || []);
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

  const confirmDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const projToDelete = projects.find(p => p.id === id);
      
      // 1. Integrity Check: Calendar Events
      const linkedEvents = calendarEvents.filter(ev => ev.linkedProjectId === id);
      if (linkedEvents.length > 0) {
          setConfirmModal({
              isOpen: true,
              title: 'No se puede eliminar',
              message: `Este proyecto tiene ${linkedEvents.length} eventos agendados en el Calendario. Elimine primero los eventos asociados.`,
              action: () => {},
              type: 'info'
          });
          return;
      }

      setConfirmModal({
          isOpen: true,
          title: 'Eliminar Proyecto',
          message: '¿Estás seguro de eliminar este proyecto permanentemente? Esta acción no se puede deshacer.',
          type: 'danger',
          action: () => {
              const filtered = projects.filter(p => p.id !== id);
              saveProjects(filtered);
              if (activeProject?.id === id) setActiveProject(null);
              if(currentUser && projToDelete) logAuditAction('Delete', `Eliminó proyecto: ${projToDelete.title}`, currentUser);
          }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) { alert("Por favor selecciona un cliente."); return; }

    if (editingId) {
        saveProjects(projects.map(p => p.id === editingId ? { ...p, ...formData } as Project : p));
        if(currentUser) logAuditAction('Update', `Editó proyecto: ${formData.title}`, currentUser);
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
        if(currentUser) logAuditAction('Create', `Creó proyecto: ${project.title}`, currentUser);
    }
    setIsModalOpen(false);
  };

  const toggleStageStatus = (projectId: string, stageId: string) => {
      let updatedProject: Project | null = null;
      const updatedProjects = projects.map(p => {
          if (p.id === projectId) {
              const newStages = p.stages.map(s => {
                  if (s.id === stageId) {
                      const nextStatus: ProjectStage['status'] = s.status === 'Pending' ? 'In Progress' : s.status === 'In Progress' ? 'Completed' : 'Pending';
                      return { ...s, status: nextStatus, date: nextStatus === 'Completed' ? new Date().toLocaleDateString() : undefined };
                  }
                  return s;
              });
              
              // Smart Status Logic
              const totalStages = newStages.length;
              const completedStages = newStages.filter(s => s.status === 'Completed').length;
              const inProgressStages = newStages.filter(s => s.status === 'In Progress').length;

              let newProjectStatus = Status.PLANNED;
              
              if (completedStages === totalStages && totalStages > 0) {
                  newProjectStatus = Status.COMPLETED;
              } else if (completedStages > 0 || inProgressStages > 0) {
                  newProjectStatus = Status.IN_PROGRESS;
              }

              updatedProject = { 
                  ...p, 
                  stages: newStages, 
                  status: newProjectStatus 
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

  const isOverdue = (project: Project) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(project.dueDate);
      // Only overdue if strictly BEFORE today and NOT completed
      return due < today && project.status !== Status.COMPLETED;
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-safe-area">
        <ConfirmationModal 
            isOpen={confirmModal.isOpen} 
            onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
            onConfirm={confirmModal.action}
            title={confirmModal.title}
            message={confirmModal.message}
            type={confirmModal.type}
            confirmText={confirmModal.type === 'danger' ? 'Eliminar' : 'Confirmar'}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proyectos</h1>
                <p className="text-sm text-gray-500">Gestión de entregas y flujo de trabajo</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="hidden md:flex bg-gray-100 p-1 rounded-xl mr-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}><LayoutGrid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-900'}`}><ListIcon size={18}/></button>
                </div>
                {canEdit && (
                    <button onClick={openNewProject} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-800 transition-all shadow-lg active:scale-95 min-h-[44px]">
                        <Plus size={18} /> Nuevo
                    </button>
                )}
            </div>
        </div>

        {/* --- PROJECT STATS CARDS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">En Curso</p>
                    <p className="text-2xl font-black text-brand-900">{stats.inProgress}</p>
                </div>
                <div className="p-2 bg-brand-50 text-brand-900 rounded-lg"><PlayCircle size={24}/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendientes</p>
                    <p className="text-2xl font-black text-gray-600">{stats.planned}</p>
                </div>
                <div className="p-2 bg-gray-100 text-gray-500 rounded-lg"><PauseCircle size={24}/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Finalizados</p>
                    <p className="text-2xl font-black text-green-600">{stats.completed}</p>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={24}/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pausados</p>
                    <p className="text-2xl font-black text-orange-500">{stats.onHold}</p>
                </div>
                <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><AlertCircle size={24}/></div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
                    <p className="text-gray-500 font-medium mb-4">No hay proyectos activos.</p>
                    {canEdit && <button onClick={openNewProject} className="text-brand-900 font-bold hover:underline">Crear el primero</button>}
                </div>
            ) : (
                <>
                    {/* CARD VIEW (Forced on Mobile, Optional on Desktop) */}
                    <div className={`${viewMode === 'list' ? 'hidden md:hidden' : 'block'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20`}>
                        {projects.map(project => {
                            const progress = calculateProgress(project.stages);
                            const overdue = isOverdue(project);
                            return (
                                <div key={project.id} onClick={() => setActiveProject(project)} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden ring-1 hover:ring-brand-500/30 ${overdue ? 'border-red-200 ring-red-100' : 'border-gray-200 ring-gray-100'}`}>
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${project.priority === Priority.HIGH ? 'bg-red-500' : project.priority === Priority.MEDIUM ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                                    <div className="flex justify-between items-start mb-3 mt-2">
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{project.category}</span>
                                            {overdue && <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse"><AlertCircle size={10}/> ATRASADO</span>}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <button onClick={(e) => handleEdit(project, e)} className="p-3 md:p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-md transition-colors"><Edit3 size={18}/></button>
                                                <button onClick={(e) => confirmDelete(project.id, e)} className="p-3 md:p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1 leading-snug line-clamp-2">{project.title}</h3>
                                    <p className="text-sm text-gray-500 mb-6 line-clamp-1 flex items-center gap-1"><User size={14}/> {project.client}</p>
                                    <div className="mt-auto bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <div className="flex justify-between text-xs mb-2 font-bold text-gray-700"><span>Progreso</span><span>{progress}%</span></div>
                                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                                            <div className={`h-full transition-all duration-700 ease-out rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-brand-900'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                                            <div className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}><Calendar size={14} />{new Date(project.dueDate).toLocaleDateString()}</div>
                                            {project.budget > 0 && <span className="text-gray-900 font-bold">Bs. {project.budget}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* LIST VIEW (Desktop Only) */}
                    <div className={`${viewMode === 'list' ? 'block' : 'hidden'} hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden`}>
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
                                        const overdue = isOverdue(project);
                                        return (
                                            <tr key={project.id} onClick={() => setActiveProject(project)} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                        {project.title}
                                                        {overdue && <AlertCircle size={14} className="text-red-500"/>}
                                                    </p>
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
                                                <td className={`px-6 py-4 text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>{new Date(project.dueDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                        {canEdit ? (
                                                            <>
                                                                <button onClick={(e) => handleEdit(project, e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                                                                <button onClick={(e) => confirmDelete(project.id, e)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                            </>
                                                        ) : <span className="text-gray-300 p-2"><Lock size={16}/></span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Mobile fallback for list view (forces grid if someone managed to switch state) */}
                    <div className={`${viewMode === 'list' ? 'block md:hidden' : 'hidden'} grid grid-cols-1 gap-6 pb-20`}>
                         {/* Re-render cards for mobile users who somehow got into list view */}
                         {projects.map(project => {
                            const progress = calculateProgress(project.stages);
                            const overdue = isOverdue(project);
                            return (
                                <div key={project.id} onClick={() => setActiveProject(project)} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all cursor-pointer flex flex-col h-full relative overflow-hidden ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${project.priority === Priority.HIGH ? 'bg-red-500' : project.priority === Priority.MEDIUM ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                                    <div className="flex justify-between items-start mb-3 mt-2">
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{project.category}</span>
                                            {overdue && <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse"><AlertCircle size={10}/></span>}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <button onClick={(e) => handleEdit(project, e)} className="p-3 bg-gray-50 text-gray-500 rounded-lg"><Edit3 size={18}/></button>
                                                <button onClick={(e) => confirmDelete(project.id, e)} className="p-3 bg-red-50 text-red-500 rounded-lg"><Trash2 size={18}/></button>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{project.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><User size={14}/> {project.client}</p>
                                    <div className="mt-auto bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <div className="flex justify-between text-xs mb-2 font-bold text-gray-700"><span>Progreso</span><span>{progress}%</span></div>
                                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-brand-900'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>

        {/* Project Details Drawer - Full Screen on Mobile */}
        {activeProject && (
            <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-[500px] bg-white shadow-2xl z-[200] flex flex-col animate-in slide-in-from-right duration-300 md:border-l border-gray-200">
                <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50 pt-safe-top">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${getPriorityColor(activeProject.priority)}`}>{activeProject.priority}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-white text-gray-700 border border-gray-300">{activeProject.category}</span>
                            {isOverdue(activeProject) && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-md font-bold uppercase animate-pulse">Vencido</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{activeProject.title}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 font-medium"><User size={14}/> {activeProject.client}</div>
                    </div>
                    <button onClick={() => setActiveProject(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-5 border-b border-gray-200 bg-white space-y-4">
                    {/* Public Link Share */}
                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2"><ExternalLink size={16}/> Enlace Público</h4>
                            <span className="text-[10px] text-brand-700 bg-white px-2 py-0.5 rounded-full border border-brand-100">Solo Lectura</span>
                        </div>
                        <div className="flex gap-2">
                            <input readOnly value={`${window.location.href.split('#')[0]}#/p/${activeProject.clientViewToken}`} className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 text-gray-600 outline-none select-all min-h-[44px]" />
                            <button onClick={() => handleCopyLink(activeProject.clientViewToken!)} className="bg-brand-900 text-white px-3 rounded-lg hover:bg-brand-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                                {linkCopied ? <Check size={16}/> : <Copy size={16}/>}
                            </button>
                        </div>
                    </div>

                    {/* Date Control */}
                    {canEdit && (
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
                                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900 outline-none focus:border-brand-900 min-h-[44px]"
                                value={activeProject.dueDate}
                                onChange={(e) => handleUpdateDate(activeProject.id, e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider"><CheckCircle2 size={18} className="text-brand-600"/> Control de Etapas</h3>
                    <div className="space-y-4 relative pb-20">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                        {activeProject.stages.map((stage) => (
                            <div key={stage.id} onClick={() => canEdit && toggleStageStatus(activeProject.id, stage.id)} className={`relative pl-10 ${canEdit ? 'cursor-pointer group' : 'cursor-default'} transition-all select-none min-h-[60px] flex flex-col justify-center`}>
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors z-10 ${stage.status === 'Completed' ? 'bg-green-500 text-white' : stage.status === 'In Progress' ? 'bg-brand-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
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

        {/* Modal Form - Full Screen Mobile */}
        {isModalOpen && canEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-4 overflow-hidden">
                <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-2xl shadow-2xl md:my-8 animate-in fade-in zoom-in duration-200 flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 md:rounded-t-2xl sticky top-0 z-10 pt-safe-top shrink-0">
                        <h3 className="font-bold text-xl text-gray-900">{editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 bg-white p-2 rounded-full border border-gray-200"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Form Inputs */}
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Título del Proyecto</label><input required type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none transition-all text-base md:text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej. Branding Corporativo"/></div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Cliente</label>
                            <div className="relative">
                                <select required className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none appearance-none text-base md:text-sm" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})}>
                                    <option value="" disabled>Seleccionar Cliente...</option>
                                    {clients.map(client => (<option key={client.id} value={client.name}>{client.name} - {client.company}</option>))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronDown size={16} /></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Prioridad</label>
                                <div className="relative">
                                    <select className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none appearance-none text-base md:text-sm" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500"><ChevronDown size={14} /></div>
                                </div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Presupuesto (Bs.)</label><input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none text-base md:text-sm" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Fecha de Entrega</label><input type="date" required className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 outline-none focus:border-brand-900 text-base md:text-sm" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /></div>
                        
                        {/* Stage Editor */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase">Personalizar Etapas</label>
                                <button type="button" onClick={handleAddStage} className="text-xs bg-brand-50 text-brand-900 px-3 py-2 rounded-lg font-bold border border-brand-200 hover:bg-brand-100 flex items-center gap-1 min-h-[40px]"><Plus size={14}/> Agregar Etapa</button>
                            </div>
                            <div className="space-y-3 pb-20">
                                {formData.stages?.map((stage, idx) => (
                                    <div key={stage.id || idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <GripVertical size={20} className="text-gray-400 cursor-move"/>
                                        <input type="text" value={stage.name} onChange={(e) => handleStageNameChange(stage.id, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base md:text-sm text-gray-900 bg-white focus:border-brand-900 outline-none min-h-[44px]"/>
                                        <button type="button" onClick={() => handleRemoveStage(stage.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                    {/* Fixed Footer */}
                    <div className="p-4 border-t border-gray-200 bg-white shrink-0 pb-safe-area">
                        <button onClick={handleSubmit} className="w-full py-4 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 transition-all shadow-lg hover:shadow-xl text-lg">{editingId ? 'Guardar Cambios' : 'Crear Proyecto'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// Helper components for missing icons
const ChevronDown = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);