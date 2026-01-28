import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Briefcase, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Project, CalendarEvent } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    
    // New Event State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [eventType, setEventType] = useState<'Meeting' | 'Reminder' | 'Other'>('Meeting');

    useEffect(() => {
        const fetchEvents = async () => {
            let allEvents: CalendarEvent[] = [];

            // 1. Fetch Projects for Deadlines
            try {
                const projDoc = await getDoc(doc(db, 'crm_data', 'projects'));
                if (projDoc.exists()) {
                    const projects = projDoc.data().list as Project[];
                    const projectEvents = projects.map(p => ({
                        id: `proj-${p.id}`,
                        title: `Entrega: ${p.title}`,
                        date: p.dueDate.split('T')[0],
                        type: 'Project' as const,
                        description: `Cliente: ${p.client}`,
                        time: '12:00'
                    }));
                    allEvents = [...allEvents, ...projectEvents];
                }
            } catch (e) {}

            // 2. Fetch Manual Events
            try {
                const calDoc = await getDoc(doc(db, 'crm_data', 'calendar'));
                if (calDoc.exists()) {
                    const customEvents = calDoc.data().list as CalendarEvent[];
                    allEvents = [...allEvents, ...customEvents];
                }
            } catch (e) {}

            setEvents(allEvents);
        };
        fetchEvents();
    }, []);

    const saveCustomEvent = async () => {
        if (!selectedDate || !newEventTitle) return;
        
        const newEvent: CalendarEvent = {
            id: Math.random().toString(36).substr(2, 9),
            title: newEventTitle,
            date: selectedDate.toISOString().split('T')[0],
            time: newEventTime,
            type: eventType,
            description: ''
        };

        const customEvents = events.filter(e => e.type !== 'Project');
        const updatedCustomEvents = [...customEvents, newEvent];
        
        try {
            await setDoc(doc(db, 'crm_data', 'calendar'), { list: updatedCustomEvents });
            setEvents(prev => [...prev, newEvent]);
            setIsEventModalOpen(false);
            setNewEventTitle('');
            setNewEventTime('');
        } catch (e) {
            alert('Error al guardar evento');
        }
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
        setIsEventModalOpen(true);
    };

    const getUpcomingEvents = () => {
        const now = new Date();
        now.setHours(0,0,0,0);
        return events
            .filter(e => new Date(e.date) >= now)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            days.push(
                <div key={day} onClick={() => handleDayClick(day)} className={`h-32 border-r border-b border-gray-100 p-2 relative hover:bg-gray-50 transition-colors cursor-pointer group ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-900 text-white' : 'text-gray-700'}`}>{day}</span>
                        <button className="opacity-0 group-hover:opacity-100 text-brand-900 hover:bg-brand-50 p-1 rounded transition-all"><Plus size={14}/></button>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className={`text-[10px] px-1.5 py-1 rounded border truncate font-medium flex items-center gap-1.5 ${ev.type === 'Project' ? 'bg-purple-50 text-purple-800 border-purple-100' : ev.type === 'Meeting' ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-orange-50 text-orange-800 border-orange-100'}`}>
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
                                className="bg-transparent font-bold text-sm text-gray-900 outline-none cursor-pointer hover:text-black focus:ring-0 focus:outline-none"
                            >
                                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <input 
                                type="number" 
                                value={currentDate.getFullYear()} 
                                onChange={handleYearChange}
                                className="w-14 bg-transparent font-bold text-sm text-gray-900 outline-none text-center hover:text-black focus:ring-0"
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
                            const date = new Date(ev.date);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                                <div key={idx} className="relative pl-4 border-l-2 border-gray-100">
                                    <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${ev.type === 'Project' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                                        {diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `En ${diffDays} días`} • {date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric'})}
                                    </p>
                                    <h4 className="font-bold text-gray-900 text-sm">{ev.title}</h4>
                                    {ev.time && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={12}/> {ev.time}</p>}
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

            {/* Event Modal */}
            {isEventModalOpen && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Nuevo Evento</h3>
                                <p className="text-xs text-gray-500">{selectedDate.toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setIsEventModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                <input autoFocus className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" placeholder="Reunión con cliente..." value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                                    <input type="time" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                    <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-900 bg-white text-gray-900" value={eventType} onChange={e => setEventType(e.target.value as any)}>
                                        <option value="Meeting">Reunión</option>
                                        <option value="Reminder">Recordatorio</option>
                                        <option value="Other">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={saveCustomEvent} className="w-full bg-brand-900 text-white py-3 rounded-xl font-bold hover:bg-brand-800 shadow-lg">Guardar en Agenda</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};