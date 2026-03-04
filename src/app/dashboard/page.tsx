'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Plus, Phone, User, AlertCircle,
    Edit, Trash2, X, MapPin, CreditCard, FileText, Info,
    History, Briefcase, TrendingUp, Calendar, Trash,
    Search, Filter, XCircle, CheckCircle2, Send, MessageSquare, ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Tipos expandidos conforme plano
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
    // Novos campos
    cep: string | null
    logradouro: string | null
    numero: string | null
    bairro: string | null
    complemento: string | null
    cidade: string | null
    estado: string | null
    data_nascimento: string | null
    estado_civil: string | null
    profissao: string | null
    renda_mensal: number | null
    tem_filhos: boolean | null
    qtd_filhos: number | null
    ultimo_emprestimo_data: string | null
    ultimo_emprestimo_valor: number | null
    ultimo_emprestimo_banco: string | null
    cpf: string | null
    rg: string | null
    rg_orgao: string | null
    nome_pai: string | null
    nome_mae: string | null
}

interface Contract {
    id: string
    lead_id: string
    valor_total: number
    banco_parceiro: string
    data_assinatura: string
    taxa_juros: number | null
    parcelas: number | null
    comissao_valor: number | null
    status: string
    observacoes: string | null
    created_at: string
}

interface AutoMessage {
    id: string
    title: string
    text: string
}

const DEFAULT_AUTO_MESSAGE: AutoMessage = {
    id: 'default',
    title: 'Padrão',
    text: 'Oi {nome}! 👋 Aqui é da JatCaixaAqui. Vi que você pode ter uma margem disponível excelente por aqui e não queria que você perdesse essa oportunidade. Podemos bater um papinho rápido sobre como isso pode te ajudar hoje? 🚀',
}

const KANBAN_COLUMNS = [
    { id: 'novo', label: 'Novo Lead', color: 'bg-gray-500' },
    { id: 'negociando', label: 'Negociando', color: 'bg-yellow-500' },
    { id: 'finalizado', label: 'Finalizado', color: 'bg-green-500' },
    { id: 'perdido', label: 'Perdido', color: 'bg-red-500' },
]

// Componente Sortable Card
function SortableLeadCard({
    lead,
    onEdit,
    onDelete,
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
            className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow group border-l-4 ${(lead.last_margin || 0) > 5000 ? 'border-l-amber-500' : 'border-l-primary'
                } cursor-grab active:cursor-grabbing`}
            {...attributes}
            {...listeners}
        >
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
                <div className="flex items-center gap-1 shrink-0">

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(lead);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 bg-gray-50 rounded-lg"
                        title="Editar Lead"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(lead.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 bg-gray-50 rounded-lg"
                        title="Excluir Lead"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Margem */}
            {typeof lead.last_margin === 'number' && (
                <div className={`mt-2 text-sm font-semibold flex items-center justify-between ${(lead.last_margin || 0) > 5000 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                    <span>Margem: R$ {lead.last_margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                    {(lead.last_margin || 0) > 5000 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            OURO
                        </span>
                    )}
                </div>
            )}

            {/* Indicadores */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
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
                <ContractIndicator leadId={lead.id} />
            </div>
        </div>
    )
}

// Pequeno componente para checar e mostrar se é cliente antigo
function ContractIndicator({ leadId }: { leadId: string }) {
    const [hasContracts, setHasContracts] = useState(false)

    useEffect(() => {
        async function check() {
            const { count } = await supabase
                .from('contracts')
                .select('*', { count: 'exact', head: true })
                .eq('lead_id', leadId)

            if (count && count > 0) setHasContracts(true)
        }
        check()
    }, [leadId])

    if (!hasContracts) return null

    return (
        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded flex items-center gap-1 border border-blue-200">
            <History size={10} />
            Cliente JAT
        </span>
    )
}

// Componente de Coluna Droppable
function KanbanColumn({
    column,
    leads,
    loading,
    onEdit,
    onDelete,
}: {
    column: any,
    leads: Lead[],
    loading: boolean,
    onEdit: (lead: Lead) => void,
    onDelete: (id: string) => void,
}) {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    const columnLeads = leads.filter(l => {
        let rawStatus = l.status?.trim() || 'novo';

        // Mapear status legados para os novos
        if (rawStatus === 'aprovado' || rawStatus === 'fechado') {
            rawStatus = 'finalizado';
        }

        const validStatuses = KANBAN_COLUMNS.map(c => c.id);
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'novo';
        return status === column.id;
    });

    return (
        <div className="flex flex-col w-72 md:w-80 h-full">
            <div className={`${column.color} text-white px-5 py-3 rounded-t-xl shadow-sm shrink-0`}>
                <div className="flex items-center justify-between">
                    <span className="font-bold tracking-wide uppercase text-xs">{column.label}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                        {columnLeads.length}
                    </span>
                </div>
                <div className="text-xs text-white/80 mt-1 font-medium">
                    R$ {columnLeads
                        .reduce((sum, l) => sum + (l.last_margin || 0), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            </div>

            <div
                ref={setNodeRef}
                className="bg-gray-50/80 border border-t-0 border-gray-100 rounded-b-xl p-3 flex-1 flex flex-col min-h-0"
            >
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                    <SortableContext
                        id={column.id}
                        items={columnLeads.map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3 min-h-[150px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs text-gray-400">Carregando...</span>
                                </div>
                            ) : (
                                columnLeads.map((lead) => (
                                    <SortableLeadCard
                                        key={lead.id}
                                        lead={lead}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </div>
            </div>
        </div>
    );
}

// Interface de Interações
interface CampaignLog {
    id: string
    status: string
    error_description: string | null
    message_text: string
    created_at: string
}

// Modal de Lead com Abas
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
    const [activeTab, setActiveTab] = useState('essencial')
    const [formData, setFormData] = useState<Partial<Lead>>({})
    const [contracts, setContracts] = useState<Contract[]>([])
    const [interactions, setInteractions] = useState<CampaignLog[]>([])
    const [loadingContracts, setLoadingContracts] = useState(false)
    const [loadingInteractions, setLoadingInteractions] = useState(false)
    const [showNewContractForm, setShowNewContractForm] = useState(false)
    const [phoneError, setPhoneError] = useState('')
    const [newContract, setNewContract] = useState<Partial<Contract>>({
        valor_total: 0,
        banco_parceiro: '',
        status: 'ativo',
        data_assinatura: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (lead && isOpen) {
            setFormData(lead)
            loadContracts(lead.id)
            loadInteractions(lead.id)
        } else {
            setFormData({
                status: 'novo',
                is_active: true,
                needs_followup: false,
                followup_count: 0,
                last_margin: 0,
                tem_filhos: false,
                qtd_filhos: 0
            })
        }
        setActiveTab('essencial')
    }, [lead, isOpen])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validação do telefone: apenas dígitos, 13 caracteres, começando com 55
        const phone = formData.phone || ''
        const phoneDigits = phone.replace(/\D/g, '')

        if (!phoneDigits || phoneDigits.length !== 13 || !phoneDigits.startsWith('55')) {
            setPhoneError('O telefone deve seguir o formato: 5587992052920 (código do país + DDD + número, 13 dígitos)')
            setActiveTab('essencial')
            return
        }

        setPhoneError('')
        onSave({ ...formData, phone: phoneDigits })
        onClose()
    }

    const loadContracts = async (leadId: string) => {
        setLoadingContracts(true)
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('lead_id', leadId)
            .order('data_assinatura', { ascending: false })

        if (!error && data) {
            setContracts(data)
        }
        setLoadingContracts(false)
    }

    const loadInteractions = async (leadId: string) => {
        setLoadingInteractions(true)
        const { data, error } = await supabase
            .from('campaign_logs')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setInteractions(data)
        }
        setLoadingInteractions(false)
    }

    const handleAddContract = async () => {
        if (!lead || !newContract.valor_total || !newContract.banco_parceiro) return

        const { data, error } = await supabase
            .from('contracts')
            .insert([{ ...newContract, lead_id: lead.id }])
            .select()
            .single()

        if (!error && data) {
            setContracts([data, ...contracts])
            setShowNewContractForm(false)
            setNewContract({
                valor_total: 0,
                banco_parceiro: '',
                status: 'ativo',
                data_assinatura: new Date().toISOString().split('T')[0]
            })
        }
    }

    const handleDeleteContract = async (id: string) => {
        if (!confirm('Excluir este contrato permanentemente?')) return
        const { error } = await supabase.from('contracts').delete().eq('id', id)
        if (!error) {
            setContracts(contracts.filter(c => c.id !== id))
        }
    }

    const tabs = [
        { id: 'essencial', label: 'Essencial', icon: Info },
        { id: 'pessoal', label: 'Pessoal', icon: User },
        { id: 'endereco', label: 'Endereço', icon: MapPin },
        { id: 'bancario', label: 'Bancário', icon: CreditCard },
        { id: 'historico_jat', label: 'Histórico JAT', icon: History },
        { id: 'interacoes', label: 'Interações', icon: Send },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:rounded-xl md:max-w-2xl shadow-xl md:max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 md:rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-primary">
                            {lead ? 'Editar Lead' : 'Novo Lead'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Preencha as informações do cliente para qualificação de crédito.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-gray-100 px-3 md:px-6 bg-white overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Form Body */}
                <form id="lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {activeTab === 'essencial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ex: João da Silva"
                                    suppressHydrationWarning
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => {
                                        // Aceita apenas dígitos
                                        const digits = e.target.value.replace(/\D/g, '')
                                        setFormData({ ...formData, phone: digits })
                                        if (phoneError) setPhoneError('')
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none ${phoneError ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                                        }`}
                                    required
                                    maxLength={13}
                                    placeholder="5587992052920"
                                    suppressHydrationWarning
                                />
                                {phoneError && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <span>⚠️</span> {phoneError}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status do Lead</label>
                                <select
                                    value={formData.status || 'novo'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    {KANBAN_COLUMNS.map(col => (
                                        <option key={col.id} value={col.id}>{col.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Margem Disponível (R$)</label>
                                <input
                                    type="number"
                                    value={formData.last_margin || ''}
                                    onChange={(e) => setFormData({ ...formData, last_margin: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    step="0.01"
                                    suppressHydrationWarning
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Objeção</label>
                                <input
                                    type="text"
                                    value={formData.objecao_tipo || ''}
                                    onChange={(e) => setFormData({ ...formData, objecao_tipo: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'pessoal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={formData.data_nascimento || ''}
                                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    suppressHydrationWarning
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                                <select
                                    value={formData.estado_civil || ''}
                                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="solteiro">Solteiro(a)</option>
                                    <option value="casado">Casado(a)</option>
                                    <option value="divorciado">Divorciado(a)</option>
                                    <option value="viuvo">Viúvo(a)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Convênio (Consignadora)</label>
                                <input
                                    type="text"
                                    value={formData.profissao || ''}
                                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ex: INSS, SIAPE, Governo, Forças Armadas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Renda Mensal (R$)</label>
                                <input
                                    type="number"
                                    value={formData.renda_mensal || ''}
                                    onChange={(e) => setFormData({ ...formData, renda_mensal: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    step="0.01"
                                    suppressHydrationWarning
                                />
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="tem_filhos"
                                        checked={formData.tem_filhos || false}
                                        onChange={(e) => setFormData({ ...formData, tem_filhos: e.target.checked })}
                                        className="rounded text-primary"
                                    />
                                    <label htmlFor="tem_filhos" className="text-sm text-gray-700">Tem Filhos?</label>
                                </div>
                                {formData.tem_filhos && (
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            value={formData.qtd_filhos || 0}
                                            onChange={(e) => setFormData({ ...formData, qtd_filhos: parseInt(e.target.value) || 0 })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md outline-none text-sm"
                                            placeholder="Qtd"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Documentação e Filiação</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.cpf || ''}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                                    <input
                                        type="text"
                                        value={formData.rg || ''}
                                        onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Órgão Emissor</label>
                                    <input
                                        type="text"
                                        value={formData.rg_orgao || ''}
                                        onChange={(e) => setFormData({ ...formData, rg_orgao: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Ex: SSP/GO"
                                    />
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pai</label>
                                <input
                                    type="text"
                                    value={formData.nome_pai || ''}
                                    onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Mãe</label>
                                <input
                                    type="text"
                                    value={formData.nome_mae || ''}
                                    onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'endereco' && (
                        <>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                                        <input
                                            type="text"
                                            value={formData.cep || ''}
                                            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="00000-000"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                                        <input
                                            type="text"
                                            value={formData.logradouro || ''}
                                            onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                        <input
                                            type="text"
                                            value={formData.numero || ''}
                                            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                        <input
                                            type="text"
                                            value={formData.bairro || ''}
                                            onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        value={formData.cidade || ''}
                                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50/50"
                                        placeholder="Nome da Cidade"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Estado</label>
                                    <input
                                        type="text"
                                        value={formData.estado || ''}
                                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50/50"
                                        maxLength={2}
                                        placeholder="UF"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'bancario' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data Último Empréstimo</label>
                                <input
                                    type="date"
                                    value={formData.ultimo_emprestimo_data || ''}
                                    onChange={(e) => setFormData({ ...formData, ultimo_emprestimo_data: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Empréstimo (R$)</label>
                                <input
                                    type="number"
                                    value={formData.ultimo_emprestimo_valor || ''}
                                    onChange={(e) => setFormData({ ...formData, ultimo_emprestimo_valor: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    step="0.01"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banco Origem</label>
                                <input
                                    type="text"
                                    value={formData.ultimo_emprestimo_banco || ''}
                                    onChange={(e) => setFormData({ ...formData, ultimo_emprestimo_banco: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ex: Banco do Brasil, Itaú, Bradesco"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'historico_jat' && (
                        <div className="space-y-6">
                            {!lead ? (
                                <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <History className="mx-auto text-gray-300 mb-2" size={40} />
                                    <p className="text-gray-500 text-sm">Salve o lead primeiro para adicionar contratos.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Histórico de Fechamentos</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowNewContractForm(!showNewContractForm)}
                                            className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={14} />
                                            {showNewContractForm ? 'Cancelar' : 'Novo Contrato'}
                                        </button>
                                    </div>

                                    {showNewContractForm && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor Total (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={newContract.valor_total || ''}
                                                        onChange={(e) => setNewContract({ ...newContract, valor_total: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Banco Parceiro</label>
                                                    <input
                                                        type="text"
                                                        value={newContract.banco_parceiro || ''}
                                                        onChange={(e) => setNewContract({ ...newContract, banco_parceiro: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="Ex: Safra"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data Assinatura</label>
                                                    <input
                                                        type="date"
                                                        value={newContract.data_assinatura || ''}
                                                        onChange={(e) => setNewContract({ ...newContract, data_assinatura: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddContract}
                                                        className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {loadingContracts ? (
                                            <div className="flex justify-center p-8">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : contracts.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                                Nenhum contrato fechado com este cliente ainda.
                                            </div>
                                        ) : (
                                            contracts.map((contract) => (
                                                <div key={contract.id} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                                    <div className="bg-green-100/50 p-2 rounded-lg text-green-600">
                                                        <TrendingUp size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-gray-800">
                                                                R$ {contract.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                                                                    {contract.banco_parceiro}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteContract(contract.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-medium">
                                                            <Calendar size={10} />
                                                            {new Date(contract.data_assinatura).toLocaleDateString('pt-BR')}
                                                            <span className="mx-1">•</span>
                                                            <span className="capitalize">{contract.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'interacoes' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Histórico de Mensagens</h3>

                            {loadingInteractions ? (
                                <div className="flex justify-center p-8">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : interactions.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Send className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-gray-500 text-sm italic">Nenhuma interação registrada para este lead.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {interactions.map((log) => (
                                        <div key={log.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {log.status === 'success' ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">
                                                            <CheckCircle2 size={10} /> Sucesso
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                                                            <XCircle size={10} /> Erro
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-700 italic border-l-2 border-gray-100 pl-3 mb-2 leading-relaxed">
                                                "{log.message_text}"
                                            </p>
                                            {log.error_description && (
                                                <div className="bg-red-50/50 text-[10px] text-red-700 p-2 rounded border border-red-100 mt-2 flex items-start gap-2">
                                                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                    <span><strong>Motivo da Parada:</strong> {log.error_description}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Action Buttons */}
                <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 md:rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="lead-form"
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div >
        </div >
    )
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)

    // Estados de Filtro
    const [searchQuery, setSearchQuery] = useState('')
    const [filterProfession, setFilterProfession] = useState('')
    const [filterBank, setFilterBank] = useState('')
    const [filterMinMargin, setFilterMinMargin] = useState<number | ''>('')
    const [filterFollowUp, setFilterFollowUp] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Estados do seletor de mensagem inicial
    const [autoMessages, setAutoMessages] = useState<AutoMessage[]>([DEFAULT_AUTO_MESSAGE])
    const [activeAutoMessage, setActiveAutoMessage] = useState<AutoMessage>(DEFAULT_AUTO_MESSAGE)
    const [showMessagePicker, setShowMessagePicker] = useState(false)
    const [showNewMsgForm, setShowNewMsgForm] = useState(false)
    const [newMsgTitle, setNewMsgTitle] = useState('')
    const [newMsgText, setNewMsgText] = useState('')
    const messagePickerRef = useRef<HTMLDivElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        loadLeads()

        // Carregar mensagens salvas do localStorage
        const savedMsgs = localStorage.getItem('auto_messages')
        const msgs: AutoMessage[] = savedMsgs ? JSON.parse(savedMsgs) : [DEFAULT_AUTO_MESSAGE]
        setAutoMessages(msgs)

        const activeId = localStorage.getItem('active_auto_message_id')
        const active = msgs.find(m => m.id === activeId) ?? msgs[0]
        setActiveAutoMessage(active)
    }, [])

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (messagePickerRef.current && !messagePickerRef.current.contains(e.target as Node)) {
                setShowMessagePicker(false)
                setShowNewMsgForm(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
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

    // Lógica de Filtragem
    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase().trim()
        const digitsOnly = query.replace(/\D/g, '')

        const matchesSearch = !query ||
            lead.name?.toLowerCase().includes(query) ||
            (digitsOnly && lead.phone.replace(/\D/g, '').includes(digitsOnly)) ||
            (digitsOnly && lead.cpf?.replace(/\D/g, '').includes(digitsOnly))

        const matchesProfession = !filterProfession ||
            lead.profissao?.toLowerCase() === filterProfession.toLowerCase()

        const matchesBank = !filterBank ||
            lead.ultimo_emprestimo_banco?.toLowerCase() === filterBank.toLowerCase()

        const matchesMargin = filterMinMargin === '' ||
            (lead.last_margin || 0) >= filterMinMargin

        const matchesFollowUp = !filterFollowUp || lead.needs_followup

        return matchesSearch && matchesProfession && matchesBank && matchesMargin && matchesFollowUp
    })

    // Extrair opções únicas para os selects de filtro
    const professions = Array.from(new Set(leads.map(l => l.profissao).filter(Boolean))) as string[]
    const banks = Array.from(new Set(leads.map(l => l.ultimo_emprestimo_banco).filter(Boolean))) as string[]

    // --- Funções do seletor de mensagem inicial ---
    const saveMessages = (msgs: AutoMessage[]) => {
        localStorage.setItem('auto_messages', JSON.stringify(msgs))
        setAutoMessages(msgs)
    }

    const selectMessage = (msg: AutoMessage) => {
        localStorage.setItem('active_auto_message_id', msg.id)
        setActiveAutoMessage(msg)
        setShowMessagePicker(false)
        setShowNewMsgForm(false)
    }

    const addNewMessage = () => {
        if (!newMsgTitle.trim() || !newMsgText.trim()) return
        const newMsg: AutoMessage = {
            id: Date.now().toString(),
            title: newMsgTitle.trim(),
            text: newMsgText.trim(),
        }
        const updated = [...autoMessages, newMsg]
        saveMessages(updated)
        selectMessage(newMsg)
        setNewMsgTitle('')
        setNewMsgText('')
        setShowNewMsgForm(false)
    }

    const deleteMessage = (id: string) => {
        const updated = autoMessages.filter(m => m.id !== id)
        const fallback = updated.length > 0 ? updated[0] : DEFAULT_AUTO_MESSAGE
        const finalList = updated.length > 0 ? updated : [DEFAULT_AUTO_MESSAGE]
        saveMessages(finalList)
        if (activeAutoMessage.id === id) selectMessage(fallback)
    }
    // --- Fim funções seletor ---

    // Dispara mensagem automática para o lead após salvar (fire-and-forget)
    const sendAutoMessage = (lead: Lead) => {
        const defaultMessage = activeAutoMessage.text

        fetch('/api/campaign/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numbers: [{ id: lead.id, phone: lead.phone, name: lead.name || 'Cliente' }],
                text: defaultMessage,
            }),
        })
            .then(res => res.json())
            .then(result => {
                if (result.sent > 0) {
                    console.log('✅ [WhatsApp] Mensagem enviada para', lead.name || lead.phone)
                } else {
                    const err = result.results?.[0]?.error || result.error || 'Erro desconhecido'
                    console.warn('⚠️ [WhatsApp] Falha no envio:', err)
                }
            })
            .catch(err => {
                console.error('❌ [WhatsApp] Erro na chamada:', err.message)
            })
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
                sendAutoMessage(data as Lead)
            }
        } else {
            // Create
            const { data, error } = await supabase
                .from('leads')
                .insert([leadData])
                .select()
                .single()

            if (!error && data) {
                console.log('🆕 [FRONTEND] Lead criado:', data.id)
                setLeads([data, ...leads])
                sendAutoMessage(data as Lead)
            } else {
                console.error('❌ [FRONTEND] Erro ao criar lead:', error)
            }
        }
    }

    const handleDeleteLead = async (id: string) => {
        if (!confirm('Deseja excluir este lead?')) return

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

        const activeLead = filteredLeads.find(l => l.id === activeId)
        const overLead = filteredLeads.find(l => l.id === overId)

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

        const activeLead = filteredLeads.find(l => l.id === active.id)
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
            loadLeads() // Reverte se der erro
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-4 p-4 md:-m-8 md:p-8 overflow-hidden w-[calc(100%+32px)] md:w-[calc(100%+64px)]">
            {/* Header Fixo */}
            <div className="z-20 bg-gray-50/80 backdrop-blur-md pb-4 shrink-0 mr-0 md:mr-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground">Gestão de Leads</h1>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all font-medium border text-sm md:text-base
                                ${showFilters || filterProfession || filterBank || filterMinMargin !== '' || filterFollowUp
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                            <Filter size={18} />
                            <span className="hidden sm:inline">Filtros</span>
                            {(filterProfession || filterBank || filterMinMargin !== '' || filterFollowUp) && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                            )}
                        </button>

                        {/* Seletor de Mensagem Inicial */}
                        <div className="relative" ref={messagePickerRef}>
                            <button
                                onClick={() => { setShowMessagePicker(!showMessagePicker); setShowNewMsgForm(false) }}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all font-medium border text-sm md:text-base
                                    ${showMessagePicker
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                                <MessageSquare size={18} />
                                <span className="hidden sm:inline max-w-[120px] truncate">{activeAutoMessage.title}</span>
                                <ChevronDown size={14} />
                            </button>

                            {showMessagePicker && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensagem ao cadastrar lead</p>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto">
                                        {autoMessages.map(msg => (
                                            <div
                                                key={msg.id}
                                                onClick={() => selectMessage(msg)}
                                                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50
                                                    ${activeAutoMessage.id === msg.id ? 'bg-primary/5' : ''}`}
                                            >
                                                <span className={`mt-1 w-3 h-3 rounded-full shrink-0 border-2
                                                    ${activeAutoMessage.id === msg.id
                                                        ? 'bg-primary border-primary'
                                                        : 'border-gray-300'}`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800">{msg.title}</p>
                                                    <p className="text-xs text-gray-400 truncate">{msg.text}</p>
                                                </div>
                                                {autoMessages.length > 1 && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); deleteMessage(msg.id) }}
                                                        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-100 p-3">
                                        {!showNewMsgForm ? (
                                            <button
                                                onClick={() => setShowNewMsgForm(true)}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors"
                                            >
                                                <Plus size={15} />
                                                Nova mensagem
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Título (ex: Margem INSS)"
                                                    value={newMsgTitle}
                                                    onChange={e => setNewMsgTitle(e.target.value)}
                                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                                                />
                                                <textarea
                                                    placeholder="Texto da mensagem... use {nome} para personalizar"
                                                    value={newMsgText}
                                                    onChange={e => setNewMsgText(e.target.value)}
                                                    rows={3}
                                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setShowNewMsgForm(false); setNewMsgTitle(''); setNewMsgText('') }}
                                                        className="flex-1 py-1.5 text-xs text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={addNewMessage}
                                                        disabled={!newMsgTitle.trim() || !newMsgText.trim()}
                                                        className="flex-1 py-1.5 text-xs text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setEditingLead(null)
                                setIsModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-4 md:px-6 py-2 bg-accent text-white rounded-xl hover:bg-accent-dark transition-all shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm md:text-base"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Cadastrar Lead</span>
                            <span className="sm:hidden">Novo</span>
                        </button>
                    </div>
                </div>

                {/* Barra de Busca e Filtros Rápidos */}
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou CPF..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                            suppressHydrationWarning
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>

                    {/* Painel de Filtros Avançados */}
                    {showFilters && (
                        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Profissão</label>
                                <select
                                    value={filterProfession}
                                    onChange={(e) => setFilterProfession(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Todas</option>
                                    {professions.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Banco Origem</label>
                                <select
                                    value={filterBank}
                                    onChange={(e) => setFilterBank(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Todos</option>
                                    {banks.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Margem Mínima</label>
                                <input
                                    type="number"
                                    placeholder="R$ 0,00"
                                    value={filterMinMargin}
                                    onChange={(e) => setFilterMinMargin(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="flex items-end pb-1.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={filterFollowUp}
                                        onChange={(e) => setFilterFollowUp(e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-gray-600">Apenas Follow-up</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-gray-300">
                    <div className="flex gap-6 h-full min-w-max">
                        {KANBAN_COLUMNS.map((column) => (
                            <KanbanColumn
                                key={column.id}
                                column={column}
                                leads={filteredLeads}
                                loading={loading}
                                onEdit={(l) => {
                                    setEditingLead(l)
                                    setIsModalOpen(true)
                                }}
                                onDelete={handleDeleteLead}
                            />
                        ))}
                    </div>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white rounded-lg shadow-2xl p-4 border-l-4 border-l-primary scale-105 rotate-2 opacity-95">
                            <h4 className="font-bold text-gray-900 text-sm">
                                {filteredLeads.find(l => l.id === activeId)?.name || 'Lead Selecionado'}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{filteredLeads.find(l => l.id === activeId)?.phone}</p>
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
