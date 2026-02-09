'use client'

import { useState, useEffect } from 'react'
import { Plus, Phone, User, GripVertical, AlertCircle, Clock, Edit, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Tipos baseados na tabela existente
interface Lead {
    id: string
    phone: string
    name: string | null
    last_margin: number | null
    status: string | null
    last_summary: string | null
    is_active: boolean | null
    last_interaction: string | null
    created_at: string | null
    needs_followup: boolean | null
    objecao_tipo: string | null
    followup_count: number | null
}

const KANBAN_COLUMNS = [
    { id: 'novo', label: 'Novo', color: 'bg-gray-500' },
    { id: 'em_atendimento', label: 'Em Atendimento', color: 'bg-blue-500' },
    { id: 'negociando', label: 'Negociando', color: 'bg-yellow-500' },
    { id: 'aprovado', label: 'Aprovado', color: 'bg-purple-500' },
    { id: 'fechado', label: 'Fechado', color: 'bg-green-500' },
    { id: 'perdido', label: 'Perdido', color: 'bg-red-500' },
]

// Componente Sortable Card
function SortableLeadCard({
    lead,
    onEdit,
    onDelete
}: {
    lead: Lead
    onEdit: (lead: Lead) => void
    onDelete: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow group border-l-4 border-l-primary"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0" {...attributes} {...listeners}>
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                        {lead.name || 'Sem nome'}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                        <Phone size={12} />
                        <span>{lead.phone}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(lead)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Deseja excluir este lead?')) {
                                onDelete(lead.id)
                            }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div {...attributes} {...listeners} className="cursor-grab p-1">
                        <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
                    </div>
                </div>
            </div>

            {/* Margem */}
            {lead.last_margin && lead.last_margin > 0 && (
                <div className="mt-2 text-sm font-semibold text-green-600">
                    R$ {lead.last_margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            )}

            {/* Indicadores */}
            <div className="flex items-center gap-2 mt-3">
                {lead.needs_followup && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        <AlertCircle size={10} />
                        Follow-up
                    </span>
                )}
                {lead.objecao_tipo && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded truncate max-w-[100px]">
                        {lead.objecao_tipo}
                    </span>
                )}
            </div>
        </div>
    )
}

// Modal de Novo/Edição de Lead
function LeadModal({
    isOpen,
    onClose,
    onSave,
    lead = null
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (lead: Partial<Lead>) => void
    lead?: Lead | null
}) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        last_margin: '',
        objecao_tipo: '',
        needs_followup: false,
        status: 'novo'
    })

    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name || '',
                phone: lead.phone || '',
                last_margin: lead.last_margin?.toString() || '',
                objecao_tipo: lead.objecao_tipo || '',
                needs_followup: lead.needs_followup || false,
                status: lead.status || 'novo'
            })
        } else {
            setFormData({
                name: '',
                phone: '',
                last_margin: '',
                objecao_tipo: '',
                needs_followup: false,
                status: 'novo'
            })
        }
    }, [lead, isOpen])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            ...lead,
            name: formData.name || null,
            phone: formData.phone,
            last_margin: parseFloat(formData.last_margin) || null,
            objecao_tipo: formData.objecao_tipo || null,
            needs_followup: formData.needs_followup,
            status: formData.status
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary">
                        {lead ? 'Editar Lead' : 'Novo Lead'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Margem (R$)</label>
                            <input
                                type="number"
                                value={formData.last_margin}
                                onChange={(e) => setFormData({ ...formData, last_margin: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                {KANBAN_COLUMNS.map(col => (
                                    <option key={col.id} value={col.id}>{col.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Objeção</label>
                        <input
                            type="text"
                            value={formData.objecao_tipo}
                            onChange={(e) => setFormData({ ...formData, objecao_tipo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="needs_followup"
                            checked={formData.needs_followup}
                            onChange={(e) => setFormData({ ...formData, needs_followup: e.target.checked })}
                            className="rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor="needs_followup" className="text-sm text-gray-700">Necessita Follow-up</label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        loadLeads()
    }, [])

    async function loadLeads() {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setLeads(data)
        }
        setLoading(false)
    }

    const handleSaveLead = async (leadData: Partial<Lead>) => {
        if (leadData.id) {
            // Update
            const { data, error } = await supabase
                .from('leads')
                .update(leadData)
                .eq('id', leadData.id)
                .select()
                .single()

            if (!error && data) {
                setLeads(leads.map(l => l.id === data.id ? data : l))
            }
        } else {
            // Create
            const { data, error } = await supabase
                .from('leads')
                .insert([leadData])
                .select()
                .single()

            if (!error && data) {
                setLeads([data, ...leads])
            }
        }
    }

    const handleDeleteLead = async (id: string) => {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id)

        if (!error) {
            setLeads(leads.filter(l => l.id !== id))
        }
    }

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id)
    }

    const handleDragOver = (event: any) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const activeLead = leads.find(l => l.id === activeId)
        const overLead = leads.find(l => l.id === overId)

        // Se arrastei sobre uma coluna (container)
        const isOverAColumn = KANBAN_COLUMNS.find(col => col.id === overId)

        if (isOverAColumn) {
            if (activeLead && activeLead.status !== overId) {
                setLeads(prev => prev.map(l => l.id === activeId ? { ...l, status: overId } : l))
            }
            return
        }

        // Se arrastei sobre outro card de outra coluna
        if (activeLead && overLead && activeLead.status !== overLead.status) {
            setLeads(prev => prev.map(l => l.id === activeId ? { ...l, status: overLead.status } : l))
        }
    }

    const handleDragEnd = async (event: any) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeLead = leads.find(l => l.id === active.id)
        if (!activeLead) return

        const overId = over.id
        let newStatus = activeLead.status

        if (KANBAN_COLUMNS.find(col => col.id === overId)) {
            newStatus = overId as string
        } else {
            const overLead = leads.find(l => l.id === overId)
            if (overLead) newStatus = overLead.status
        }

        // Persistir no Supabase
        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', active.id)

        if (error) {
            // Reverter se der erro
            loadLeads()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestão de Leads</h1>
                    <p className="text-sm text-gray-500">
                        {leads.length} leads | R$ {leads.reduce((sum, l) => sum + (l.last_margin || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em margem
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingLead(null)
                        setIsModalOpen(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                >
                    <Plus size={20} />
                    Novo Lead
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {KANBAN_COLUMNS.map((column) => (
                        <div key={column.id} className="flex-shrink-0 w-80">
                            <div className={`${column.color} text-white px-4 py-2 rounded-t-lg`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{column.label}</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                        {leads.filter(l => (l.status || 'novo') === column.id).length}
                                    </span>
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                    R$ {leads.filter(l => (l.status || 'novo') === column.id)
                                        .reduce((sum, l) => sum + (l.last_margin || 0), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="bg-gray-100 rounded-b-lg p-3 min-h-[500px] flex flex-col gap-3">
                                <SortableContext
                                    id={column.id}
                                    items={leads.filter(l => (l.status || 'novo') === column.id).map(l => l.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex-1 space-y-3" id={column.id}>
                                        {loading ? (
                                            <div className="text-center text-gray-400 py-8">Carregando...</div>
                                        ) : (
                                            leads
                                                .filter(l => (l.status || 'novo') === column.id)
                                                .map((lead) => (
                                                    <SortableLeadCard
                                                        key={lead.id}
                                                        lead={lead}
                                                        onEdit={(l) => {
                                                            setEditingLead(l)
                                                            setIsModalOpen(true)
                                                        }}
                                                        onDelete={handleDeleteLead}
                                                    />
                                                ))
                                        )}
                                    </div>
                                </SortableContext>
                            </div>
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white rounded-lg shadow-xl p-4 border-l-4 border-l-primary scale-105 rotate-2 opacity-90">
                            <h4 className="font-medium text-gray-900 text-sm">
                                {leads.find(l => l.id === activeId)?.name || 'Carregando...'}
                            </h4>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <LeadModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingLead(null)
                }}
                onSave={handleSaveLead}
                lead={editingLead}
            />
        </div>
    )
}
