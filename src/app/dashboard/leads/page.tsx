'use client'

import { useState, useEffect } from 'react'
import { Plus, Phone, User, GripVertical, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

// Status do Kanban - alinhado com banco de dados
const KANBAN_COLUMNS = [
    { id: 'novo', label: 'Novo', color: 'bg-gray-500' },
    { id: 'em_atendimento', label: 'Em Atendimento', color: 'bg-blue-500' },
    { id: 'negociando', label: 'Negociando', color: 'bg-yellow-500' },
    { id: 'aprovado', label: 'Aprovado', color: 'bg-purple-500' },
    { id: 'fechado', label: 'Fechado', color: 'bg-green-500' },
    { id: 'perdido', label: 'Perdido', color: 'bg-red-500' },
]

// Componente Card do Lead
function LeadCard({ lead }: { lead: Lead }) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-grab border-l-4 border-l-primary">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                        {lead.name || 'Sem nome'}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                        <Phone size={12} />
                        <span>{lead.phone}</span>
                    </div>
                </div>
                <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
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

            {/* Última interação */}
            {lead.last_interaction && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Clock size={10} />
                    <span>
                        {new Date(lead.last_interaction).toLocaleDateString('pt-BR')}
                    </span>
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
        name: '',
        phone: '',
        last_margin: '',
    })

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            name: formData.name || null,
            phone: formData.phone,
            last_margin: parseFloat(formData.last_margin) || null,
            status: 'novo',
            is_active: true,
            needs_followup: false,
            followup_count: 0,
        })
        setFormData({ name: '', phone: '', last_margin: '' })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold text-primary mb-4">Novo Lead</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Margem (R$)</label>
                        <input
                            type="number"
                            value={formData.last_margin}
                            onChange={(e) => setFormData({ ...formData, last_margin: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            step="0.01"
                        />
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
        const { data, error } = await supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single()

        if (!error && data) {
            setLeads([data, ...leads])
        }
    }

    // Agrupar leads por status
    const getLeadsByStatus = (status: string) => {
        return leads.filter((lead) => (lead.status || 'novo') === status)
    }

    // Calcular total de margem por coluna
    const getTotalMargin = (status: string) => {
        return getLeadsByStatus(status)
            .reduce((sum, lead) => sum + (lead.last_margin || 0), 0)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestão de Leads</h1>
                    <p className="text-sm text-gray-500">
                        {leads.length} leads | R$ {leads.reduce((sum, l) => sum + (l.last_margin || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em margem
                    </p>
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
                        <div className={`${column.color} text-white px-4 py-2 rounded-t-lg`}>
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{column.label}</span>
                                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                    {getLeadsByStatus(column.id).length}
                                </span>
                            </div>
                            <div className="text-xs text-white/70 mt-1">
                                R$ {getTotalMargin(column.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
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
