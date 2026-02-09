'use client'

import { useState, useEffect } from 'react'
import { Plus, DollarSign, User, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Tipos
interface Lead {
    id: string
    title: string
    client_name: string
    value: number
    status: string
    priority: string
}

// Status do Kanban
const KANBAN_COLUMNS = [
    { id: 'prospeccao', label: 'Prospecção', color: 'bg-gray-500' },
    { id: 'analise', label: 'Em Análise', color: 'bg-blue-500' },
    { id: 'aprovado', label: 'Aprovado', color: 'bg-yellow-500' },
    { id: 'assinado', label: 'Assinado', color: 'bg-purple-500' },
    { id: 'pago', label: 'Pago', color: 'bg-green-500' },
]

// Componente Card do Lead
function LeadCard({ lead }: { lead: Lead }) {
    const priorityColors = {
        baixa: 'border-l-gray-400',
        media: 'border-l-yellow-400',
        alta: 'border-l-red-500',
    }

    return (
        <div
            className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${priorityColors[lead.priority as keyof typeof priorityColors] || 'border-l-gray-400'} hover:shadow-md transition-shadow cursor-grab`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{lead.title}</h4>
                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                        <User size={12} />
                        <span>{lead.client_name}</span>
                    </div>
                </div>
                <GripVertical size={16} className="text-gray-400" />
            </div>
            {lead.value > 0 && (
                <div className="flex items-center gap-1 mt-3 text-green-600 font-semibold text-sm">
                    <DollarSign size={14} />
                    <span>{lead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            )}
        </div>
    )
}

// Modal de Novo Lead
function NewLeadModal({
    isOpen,
    onClose,
    onSave
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (lead: Partial<Lead>) => void
}) {
    const [formData, setFormData] = useState({
        title: '',
        client_name: '',
        value: '',
        priority: 'media',
    })

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            ...formData,
            value: parseFloat(formData.value) || 0,
            status: 'prospeccao',
        })
        setFormData({ title: '', client_name: '', value: '', priority: 'media' })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold text-primary mb-4">Novo Lead</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                        <input
                            type="text"
                            value={formData.client_name}
                            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                        </select>
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

// Página Principal do Kanban
export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    // Carregar leads do Supabase
    useEffect(() => {
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
        loadLeads()
    }, [])

    // Salvar novo lead
    const handleSaveLead = async (leadData: Partial<Lead>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('leads')
            .insert([{ ...leadData, user_id: user?.id }])
            .select()
            .single()

        if (!error && data) {
            setLeads([data, ...leads])
        }
    }

    // Agrupar leads por status
    const getLeadsByStatus = (status: string) => {
        return leads.filter((lead) => lead.status === status)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestão de Leads</h1>
                    <p className="text-sm text-gray-500">Arraste os cards para atualizar o status</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                >
                    <Plus size={20} />
                    Novo Lead
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map((column) => (
                    <div key={column.id} className="flex-shrink-0 w-72">
                        {/* Column Header */}
                        <div className={`${column.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                            <span className="font-medium">{column.label}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                {getLeadsByStatus(column.id).length}
                            </span>
                        </div>

                        {/* Column Content */}
                        <div className="bg-gray-100 rounded-b-lg p-3 min-h-[400px] space-y-3">
                            {loading ? (
                                <div className="text-center text-gray-400 py-8">Carregando...</div>
                            ) : getLeadsByStatus(column.id).length === 0 ? (
                                <div className="text-center text-gray-400 text-sm py-8">
                                    Nenhum lead
                                </div>
                            ) : (
                                getLeadsByStatus(column.id).map((lead) => (
                                    <LeadCard key={lead.id} lead={lead} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <NewLeadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveLead}
            />
        </div>
    )
}
