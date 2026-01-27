import React, { useState } from 'react';
import { Plus, MoreHorizontal, Calendar, Trash2, X, Edit3, Save } from 'lucide-react';
import { Project, Status, Priority } from '../types';

// Initial Data
const initialProjects: Project[] = [
  {
    id: '1',
    title: 'Branding Restaurante Solar',
    description: 'Diseño de logo y papelería corporativa',
    client: 'Solar Gastronomía',
    status: Status.IN_PROGRESS,
    priority: Priority.HIGH,
    dueDate: '2023-11-15',
    budget: 1200,
    category: 'Design'
  },
  {
    id: '2',
    title: 'Mantenimiento Equipos Oficina',
    client: 'Estudio Jurídico A&B',
    status: Status.PLANNED,
    priority: Priority.MEDIUM,
    dueDate: '2023-11-20',
    budget: 450,
    category: 'Repair'
  },
  {
    id: '3',
    title: 'Sellos Automáticos x50',
    client: 'Banco Nacional',
    status: Status.COMPLETED,
    priority: Priority.LOW,
    dueDate: '2023-10-30',
    budget: 2500,
    category: 'Sublimation'
  }
];

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.HIGH]: 'bg-red-50 text-red-700 border border-red-100',
    [Priority.MEDIUM]: 'bg-orange-50 text-orange-700 border border-orange-100',
    [Priority.LOW]: 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${colors[priority]}`}>
      {priority}
    </span>
  );
};

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    title: '',
    client: '',
    priority: Priority.MEDIUM,
    status: Status.PLANNED,
    budget: 0,
    category: 'Design',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(project);
    setEditingId(project.id);
    setIsModalOpen(true);
  };

  const handleMoveStatus = (id: string, newStatus: Status) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const openNewProject = () => {
      setEditingId(null);
      setFormData({
        title: '',
        client: '',
        priority: Priority.MEDIUM,
        status: Status.PLANNED,
        budget: 0,
        category: 'Design',
        dueDate: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update existing
        setProjects(prev => prev.map(p => p.id === editingId ? { ...p, ...formData } as Project : p));
    } else {
        // Create new
        const project: Project = {
            id: Math.random().toString(36).substr(2, 9),
            title: formData.title || 'Nuevo Proyecto',
            client: formData.client || 'Cliente Sin Nombre',
            status: formData.status || Status.PLANNED,
            priority: formData.priority || Priority.MEDIUM,
            dueDate: formData.dueDate || new Date().toISOString(),
            budget: Number(formData.budget),
            category: formData.category as any
        };
        setProjects([...projects, project]);
    }
    
    setIsModalOpen(false);
  };

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
    <div 
        onClick={(e) => handleEdit(project, e)}
        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group relative cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <PriorityBadge priority={project.priority} />
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => handleEdit(project, e)}
             className="text-gray-400 hover:text-blue-500 p-1 rounded-md hover:bg-blue-50"
             title="Editar"
           >
             <Edit3 size={14} />
           </button>
           <button 
             onClick={(e) => handleDelete(project.id, e)}
             className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50"
             title="Eliminar"
           >
             <Trash2 size={14} />
           </button>
        </div>
      </div>
      
      <h4 className="font-semibold text-gray-900 mb-1 leading-snug">{project.title}</h4>
      <p className="text-xs text-gray-500 mb-3 font-medium">{project.client}</p>
      
      <div className="flex items-center gap-2 mb-4">
         <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-100 px-2 py-1 rounded-md text-gray-600">
            {project.category}
         </span>
         <span className="text-xs text-gray-500">Bs. {project.budget}</span>
      </div>
  
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center text-gray-400 text-xs gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
          <Calendar size={12} />
          {new Date(project.dueDate).toLocaleDateString('es-BO', { month: 'short', day: 'numeric' })}
        </div>
        
        {/* Simple Status Mover for Kanban feel */}
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {project.status !== Status.PLANNED && (
                <button onClick={() => handleMoveStatus(project.id, Status.PLANNED)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600" title="Mover a Por Hacer">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </button>
            )}
            {project.status !== Status.IN_PROGRESS && (
                <button onClick={() => handleMoveStatus(project.id, Status.IN_PROGRESS)} className="w-6 h-6 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600" title="Mover a En Proceso">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </button>
            )}
            {project.status !== Status.COMPLETED && (
                <button onClick={() => handleMoveStatus(project.id, Status.COMPLETED)} className="w-6 h-6 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600" title="Mover a Completado">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </button>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión visual del flujo de trabajo</p>
        </div>
        <button 
          onClick={openNewProject}
          className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 active:scale-95"
        >
          <Plus size={18} />
          Nuevo Proyecto
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          
          {/* Column: Planned */}
          <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-gray-100/50 p-4 rounded-2xl border border-gray-200/50">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-gray-400 ring-2 ring-gray-200"></div>
                   Por Hacer
                   <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                     {projects.filter(p => p.status === Status.PLANNED).length}
                   </span>
                </h3>
             </div>
             <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
                {projects.filter(p => p.status === Status.PLANNED).map(p => (
                <ProjectCard key={p.id} project={p} />
                ))}
             </div>
          </div>

          {/* Column: In Progress */}
          <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200"></div>
                   En Proceso
                   <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                     {projects.filter(p => p.status === Status.IN_PROGRESS).length}
                   </span>
                </h3>
             </div>
             <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
                {projects.filter(p => p.status === Status.IN_PROGRESS).map(p => (
                <ProjectCard key={p.id} project={p} />
                ))}
             </div>
          </div>

          {/* Column: Completed */}
          <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-green-50/30 p-4 rounded-2xl border border-green-100/50">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200"></div>
                   Completado
                   <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-bold">
                     {projects.filter(p => p.status === Status.COMPLETED).length}
                   </span>
                </h3>
             </div>
             <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
                {projects.filter(p => p.status === Status.COMPLETED).map(p => (
                <ProjectCard key={p.id} project={p} />
                ))}
             </div>
          </div>

        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-lg text-gray-900">
                  {editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white text-gray-900"
                  placeholder="Ej. Diseño Logo"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white text-gray-900"
                  placeholder="Nombre del Cliente"
                  value={formData.client}
                  onChange={e => setFormData({...formData, client: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-gray-900"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                    >
                        <option value="Design">Diseño</option>
                        <option value="Repair">Reparación</option>
                        <option value="Sublimation">Sublimación</option>
                        <option value="Development">Desarrollo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-gray-900"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value as any})}
                    >
                        <option value={Priority.LOW}>Baja</option>
                        <option value={Priority.MEDIUM}>Media</option>
                        <option value={Priority.HIGH}>Alta</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (Bs.)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-gray-900"
                      value={formData.budget}
                      onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Entrega</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-gray-900"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors bg-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-md shadow-brand-200 flex justify-center items-center gap-2"
                >
                  <Save size={18} />
                  {editingId ? 'Guardar Cambios' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};