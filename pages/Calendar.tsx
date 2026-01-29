import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Briefcase, CheckCircle2, X, AlertCircle, User, Flag, Trash2, Edit3 } from 'lucide-react';
import { Project, CalendarEvent, Client } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    
    // Modal States
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    
    // Auxiliary Data for Robustness
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    // New Event State
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
        title: '',
        time: '',
        type: 'Meeting',
        description: '',
        priority: 'Medium',
        linkedClientId: '',
        linkedProjectId: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            let allEvents: CalendarEvent[] = [];

            // 1. Fetch Projects (Read Only Events)
            try {
                const projDoc = await getDoc(doc(db, 'crm_data', 'projects'));
                if (projDoc.exists()) {
                    const projList = projDoc.data().list as Project[];
                    setProjects(projList);
                    const projectEvents = projList.map(p => ({
                        id: `proj-${p.id}`,
                        title: `Entrega: ${p.title}`,
                        date: p.dueDate.split('T')[0], // ISO date string part
                        type: 'Project' as const,
                        description: `Cliente: ${p.client}`,
                        time: '12:00',
                        priority: 'High' as const,
                        linkedProjectId: p.id
                    }));
                    allEvents = [...allEvents, ...projectEvents];
                }
            } catch (e) {}

            // 2. Fetch Clients
            try {
                const clientDoc = await getDoc(doc(db, 'crm_data', 'clients'));
                if (clientDoc.exists()) {
                    setClients(clientDoc.data().list);
                }
            } catch (e) {}

            // 3. Fetch Manual Events
            try {
                const calDoc = await getDoc(doc(db, 'crm_data', 'calendar'));
                if (calDoc.exists()) {
                    const customEvents = calDoc.data().list as CalendarEvent[];
                    allEvents = [...allEvents, ...customEvents];
                }
            } catch (e) {}

            setEvents(allEvents);
        };
        fetchData();
    }, []);

    const saveCustomEvent = async () => {
        if (!selectedDate || !newEvent.title) return;
        
        // Helper to format date strictly as YYYY-MM-DD local time
        const dateStr = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

        const finalEvent: CalendarEvent = {
            id: editingEventId || Math.random().toString(36).substr(2, 9),
            title: newEvent.title!,
            date: dateStr,
            time: newEvent.time,
            type: newEvent.type as any,
            description: newEvent.description,
            priority: newEvent.priority as any,
            linkedClientId: newEvent.linkedClientId,
            linkedProjectId: newEvent.linkedProjectId,
            linkedClientName: clients.find(c => c.id === newEvent.linkedClientId)?.name,
            linkedProjectTitle: projects.find(p => p.id === newEvent.linkedProjectId)?.title
        };

        // Filter out existing manually created events to prevent duplicates (if editing)
        // Also ensure we don't accidentally delete project events (they are separate)
        let customEvents = events.filter(e => e.type !== 'Project');
        
        if (modalMode === 'edit') {
            customEvents = customEvents.map(e => e.id === editingEventId ? finalEvent : e);
        } else {
            customEvents = [...customEvents, finalEvent];
        }
        
        try {
            await setDoc(doc(db, 'crm_data', 'calendar'), { list: customEvents });
            
            // Re-merge with Project events for local state
            const projectEvents = events.filter(e => e.type === 'Project');
            setEvents([...projectEvents, ...customEvents]);
            
            closeModal();
        } catch (e) {
            alert('Error al guardar evento');
        }
    };

    const handleDeleteEvent = async () => {
        if (!editingEventId) return;
        if (!confirm('¿Eliminar este evento?')) return;

        const customEvents = events.filter(e => e.type !== 'Project' && e.id !== editingEventId);
        
        try {
            await setDoc(doc(db, 'crm_data', 'calendar'), { list: customEvents });
            const projectEvents = events.filter(e => e.type === 'Project');
            setEvents([...projectEvents, ...customEvents]);
            closeModal();
        } catch (e) {
            alert('Error al eliminar evento');
        }
    };

    const closeModal = () => {
        setIsEventModalOpen(false);
        setEditingEventId(null);
        setNewEvent({ title: '', time: '', type: 'Meeting', description: '', priority: 'Medium', linkedClientId: '', linkedProjectId: '' });
    };

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start
    };

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleJumpToToday = () => setCurrentDate(new Date());

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const year = parseInt(e.target.value);
        if (year > 1900 && year < 2100) {
            setCurrentDate(new Date(year, currentDate.getMonth(), 1));
        }
    };

    const handleDayClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(date);
        setModalMode('create');
        setEditingEventId(null);
        setNewEvent({ title: '', time: '', type: 'Meeting', description: '', priority: 'Medium', linkedClientId: '', linkedProjectId: '' });
        setIsEventModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering day click
        
        if (event.type === 'Project') {
            // Project events are read-only in this view
            alert(`Evento de Proyecto: ${event.title}\nPara editar, ve a la sección de Proyectos.`);
            return;
        }

        // Parse date string correctly
        const [year, month, day] = event.date.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
        
        setNewEvent(event);
        setEditingEventId(event.id);
        setModalMode('edit');
        setIsEventModalOpen(true);
    };

    const getUpcomingEvents = () => {
        const nowStr = new Date().toLocaleDateString('en-CA');
        return events
            .filter(e => e.date >= nowStr)
            .sort((a,b) => a.date.localeCompare(b.date))
            .slice(0, 10);
    };

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/30 border-r border-b border-gray-100"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            // Force strict local date string generation
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
            
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

            days.push(
                <div key={day} onClick={() => handleDayClick(day)} className={`h-32 border-r border-b border-gray-100 p-2 relative hover:bg-gray-50 transition-colors cursor-pointer group ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-900 text-white' : 'text-gray-700'}`}>{day}</span>
                        <button className="opacity-0 group-hover:opacity-100 text-brand-900 hover:bg-brand-50 p-1 rounded transition-all"><Plus size={14}/></button>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                        {dayEvents.map(ev => (
                            <div 
                                key={ev.id} 
                                onClick={(e) => handleEventClick(ev, e)}
                                className={`text-[10px] px-1.5 py-1 rounded border truncate font-medium flex items-center gap-1.5 cursor-pointer hover:opacity-80 shadow-sm ${ev.type === 'Project' ? 'bg-purple-50 text-purple-800 border-purple-100' : ev.priority === 'High' ? 'bg-red-50 text-red-800 border-red-100' : ev.priority === 'Low' ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-800 border-blue-100'}`}
                            >
                                {ev.type === 'Project' ? <Briefcase size={10}/> : <Clock size={10}/>}
                                <span className="truncate">{ev.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Main Calendar Grid */}
            <div className="flex-1 flex flex-col space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
                        <p className="text-sm text-gray-500">Planificación mensual</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={20}/></button>
                        
                        <div className="flex items-center gap-1 border-x border-gray-100 px-2 mx-1">
                            <select 
                                value={currentDate.getMonth()} 
                                onChange={handleMonthChange}
                                className="bg-white font-bold text-sm text-gray-900 outline-none cursor-pointer hover:text-black focus:ring-0 focus:outline-none"
                            >
                                {months.map((m, i) => <option key={i} value={i} className="bg-white text-gray-900">{m}</option>)}
                            </select>
                            <input 
                                type="number" 
                                value={currentDate.getFullYear()} 
                                onChange={handleYearChange}
                                className="w-14 bg-white font-bold text-sm text-gray-900 outline-none text-center hover:text-black focus:ring-0"
                            />
                        </div>

                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={20}/></button>
                        <button onClick={handleJumpToToday} className="ml-2 text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">Hoy</button>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                            <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                        {renderCalendarGrid()}
                    </div>
                </div>
            </div>

            {/* Side Agenda */}
            <div className="w-full md:w-80 flex flex-col h-full space-y-6">
                <div className="h-[76px] flex items-center">
                    <h2 className="text-xl font-bold text-gray-900">Agenda Próxima</h2>
                </div>
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {getUpcomingEvents().length > 0 ? getUpcomingEvents().map((ev, idx) => {
                            // Date logic fix for display
                            const [y, m, d] = ev.date.split('-').map(Number);
                            const date = new Date(y, m-1, d);
                            
                            const todayStr = new Date().toLocaleDateString('en-CA');
                            const diffTime = new Date(ev.date).getTime() - new Date(todayStr).getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            return (
                                <div key={idx} onClick={(e) => handleEventClick(ev, e)} className="relative pl-4 border-l-2 border-gray-100 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors group">
                                    <div className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ${ev.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                                            {diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `En ${diffDays} días`} • {date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric'})}
                                        </p>
                                        {ev.type !== 'Project' && <Edit3 size={12} className="text-gray-300 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"/>}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">{ev.title}</h4>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {ev.time && <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {ev.time}</p>}
                                        {ev.linkedClientName && <p className="text-xs text-blue-600 flex items-center gap-1"><User size={12}/> {ev.linkedClientName}</p>}
                                    </div>
                                    {ev.description && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded border border-gray-100">{ev.description}</p>}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-10 text-gray-400">
                                <AlertCircle size={32} className="mx-auto mb-2 opacity-30"/>
                                <p className="text-sm">No hay eventos próximos.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Modal - Robust */}
            {isEventModalOpen && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{modalMode === 'create' ? 'Nuevo Evento' : 'Editar Evento'}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarIcon size={12}/> {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <button onClick={closeModal}><X size={20} className="text-gray-400"/></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título del Evento</label>
                                <input autoFocus className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" placeholder="Reunión, Entrega, Llamada..." value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                                <input type="time" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                                    <option value="Meeting" className="bg-white text-gray-900">Reunión</option>
                                    <option value="Reminder" className="bg-white text-gray-900">Recordatorio</option>
                                    <option value="Project" className="bg-white text-gray-900">Hito de Proyecto</option>
                                    <option value="Other" className="bg-white text-gray-900">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridad</label>
                                <div className="flex gap-2">
                                    {['Low', 'Medium', 'High'].map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => setNewEvent({...newEvent, priority: p as any})}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${newEvent.priority === p ? (p==='High'?'bg-red-50 text-red-600 border-red-200':p==='Medium'?'bg-orange-50 text-orange-600 border-orange-200':'bg-blue-50 text-blue-600 border-blue-200') : 'bg-white text-gray-500 border-gray-200'}`}
                                        >
                                            {p === 'Low' ? 'Baja' : p === 'Medium' ? 'Media' : 'Alta'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular Cliente</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={newEvent.linkedClientId} onChange={e => setNewEvent({...newEvent, linkedClientId: e.target.value})}>
                                    <option value="" className="bg-white text-gray-900">(Ninguno)</option>
                                    {clients.map(c => <option key={c.id} value={c.id} className="bg-white text-gray-900">{c.name}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular Proyecto</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={newEvent.linkedProjectId} onChange={e => setNewEvent({...newEvent, linkedProjectId: e.target.value})}>
                                    <option value="" className="bg-white text-gray-900">(Ninguno)</option>
                                    {projects.map(p => <option key={p.id} value={p.id} className="bg-white text-gray-900">{p.title}</option>)}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Notas</label>
                                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900 h-20 resize-none" placeholder="Detalles adicionales..." value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {modalMode === 'edit' && (
                                <button onClick={handleDeleteEvent} className="px-4 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center">
                                    <Trash2 size={18}/>
                                </button>
                            )}
                            <button onClick={saveCustomEvent} className="flex-1 bg-brand-900 text-white py-3 rounded-xl font-bold hover:bg-brand-800 shadow-lg">
                                {modalMode === 'edit' ? 'Guardar Cambios' : 'Agendar Evento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};