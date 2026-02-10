'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Megaphone, Send, Filter, Search, Users, CheckCircle,
    XCircle, AlertCircle, Loader2, Phone, User, ChevronDown,
    ChevronUp, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Lead {
    id: string
    phone: string
    name: string | null
    status: string | null
    last_margin: number | null
    ultimo_emprestimo_banco: string | null
    ultimo_emprestimo_data: string | null
    ultimo_emprestimo_valor: number | null
    profissao: string | null
}

interface SendResult {
    phone: string
    name: string
    success: boolean
    error?: string
}

type CampaignStatus = 'idle' | 'sending' | 'done'

export default function CampanhasPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')

    // Filtros
    const [filterBank, setFilterBank] = useState('')
    const [filterPeriod, setFilterPeriod] = useState('')
    const [filterMinValue, setFilterMinValue] = useState<number | ''>('')
    const [filterStatus, setFilterStatus] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(true)

    // Seleção
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Disparo
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('idle')
    const [results, setResults] = useState<SendResult[]>([])
    const [showResults, setShowResults] = useState(false)

    useEffect(() => {
        loadLeads()
    }, [])

    async function loadLeads() {
        const { data, error } = await supabase
            .from('leads')
            .select('id, phone, name, status, last_margin, ultimo_emprestimo_banco, ultimo_emprestimo_data, ultimo_emprestimo_valor, profissao')
            .order('name', { ascending: true })

        if (!error && data) {
            setLeads(data)
        }
        setLoading(false)
    }

    // Opções únicas para filtros
    const banks = useMemo(() =>
        Array.from(new Set(leads.map(l => l.ultimo_emprestimo_banco).filter(Boolean))) as string[]
        , [leads])

    // Leads filtrados
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Filtro banco
            if (filterBank && lead.ultimo_emprestimo_banco !== filterBank) return false

            // Filtro período
            if (filterPeriod && lead.ultimo_emprestimo_data) {
                const empDate = new Date(lead.ultimo_emprestimo_data)
                const now = new Date()
                const diffDays = Math.floor((now.getTime() - empDate.getTime()) / (1000 * 60 * 60 * 24))
                if (filterPeriod === '30' && diffDays > 30) return false
                if (filterPeriod === '60' && diffDays > 60) return false
                if (filterPeriod === '90' && diffDays > 90) return false
            }

            // Filtro valor mínimo (margem)
            if (filterMinValue !== '' && (lead.last_margin || 0) < filterMinValue) return false

            // Filtro status
            if (filterStatus.length > 0) {
                const leadStatus = lead.status || 'novo'
                if (!filterStatus.includes(leadStatus)) return false
            }

            // Deve ter telefone
            if (!lead.phone) return false

            return true
        })
    }, [leads, filterBank, filterPeriod, filterMinValue, filterStatus])

    // Quando os filtros mudam, selecionar todos por padrão
    useEffect(() => {
        setSelectedIds(new Set(filteredLeads.map(l => l.id)))
    }, [filteredLeads])

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLeads.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredLeads.map(l => l.id)))
        }
    }

    const toggleStatus = (status: string) => {
        setFilterStatus(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        )
    }

    const selectedLeads = filteredLeads.filter(l => selectedIds.has(l.id))

    const handleSend = async () => {
        if (!message.trim() || selectedLeads.length === 0) return

        if (!confirm(`Confirma o disparo de ${selectedLeads.length} mensagen(s)?`)) return

        setCampaignStatus('sending')
        setResults([])
        setShowResults(true)

        try {
            const response = await fetch('/api/campaign/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numbers: selectedLeads.map(l => ({
                        phone: l.phone,
                        name: l.name || 'Cliente'
                    })),
                    text: message,
                }),
            })

            const data = await response.json()

            if (data.results) {
                setResults(data.results)
            }
        } catch (err) {
            console.error('Erro no disparo:', err)
        }

        setCampaignStatus('done')
    }

    const statusOptions = [
        { id: 'novo', label: 'Novo Lead', color: 'bg-gray-100 text-gray-700' },
        { id: 'negociando', label: 'Negociando', color: 'bg-yellow-100 text-yellow-700' },
        { id: 'aprovado', label: 'Aprovado', color: 'bg-purple-100 text-purple-700' },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent rounded-xl shadow-lg shadow-accent/20">
                        <Megaphone className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground">Campanhas</h1>
                        <p className="text-xs text-gray-500">Disparo de mensagens via WhatsApp</p>
                    </div>
                </div>
            </div>

            {/* Mensagem */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Mensagem</label>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded font-mono">
                        Use {'{nome}'} para personalizar
                    </span>
                </div>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Olá {nome}! Temos uma oferta especial para você..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
                    rows={4}
                />
                {message && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Preview</p>
                        <p className="text-sm text-green-800">
                            {message.replace(/\{nome\}/gi, 'João da Silva')}
                        </p>
                    </div>
                )}
            </div>

            {/* Filtros de Segmentação */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full px-4 md:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-primary" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Segmentação</span>
                        {(filterBank || filterPeriod || filterMinValue !== '' || filterStatus.length > 0) && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                    </div>
                    {showFilters ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {showFilters && (
                    <div className="px-4 md:px-6 pb-5 space-y-4 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Banco</label>
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
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Período</label>
                                <select
                                    value={filterPeriod}
                                    onChange={(e) => setFilterPeriod(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Todos</option>
                                    <option value="30">Últimos 30 dias</option>
                                    <option value="60">Últimos 60 dias</option>
                                    <option value="90">Últimos 90 dias</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Margem Mínima</label>
                                <input
                                    type="number"
                                    placeholder="R$ 0,00"
                                    value={filterMinValue}
                                    onChange={(e) => setFilterMinValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => toggleStatus(s.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                                            ${filterStatus.includes(s.id)
                                                ? 'bg-primary text-white border-primary shadow-sm'
                                                : `${s.color} border-transparent hover:border-gray-300`
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Leads */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-primary" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Destinatários
                        </span>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">
                            {selectedIds.size}/{filteredLeads.length}
                        </span>
                    </div>
                    <button
                        onClick={toggleSelectAll}
                        className="text-xs text-primary font-semibold hover:underline"
                    >
                        {selectedIds.size === filteredLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 gap-2">
                            <Loader2 className="animate-spin text-primary" size={20} />
                            <span className="text-sm text-gray-500">Carregando leads...</span>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-10">
                            <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-sm text-gray-400">Nenhum lead encontrado com esses filtros</p>
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <label
                                key={lead.id}
                                className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(lead.id)}
                                    onChange={() => toggleSelect(lead.id)}
                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                            {lead.name || 'Sem nome'}
                                        </span>
                                        {lead.ultimo_emprestimo_banco && (
                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase hidden sm:inline">
                                                {lead.ultimo_emprestimo_banco}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <Phone size={10} />
                                        <span>{lead.phone}</span>
                                        {lead.last_margin && lead.last_margin > 0 && (
                                            <>
                                                <span className="mx-0.5">•</span>
                                                <span className="text-green-600 font-semibold">
                                                    R$ {lead.last_margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </label>
                        ))
                    )}
                </div>
            </div>

            {/* Botão de Disparo */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Info size={16} />
                    <span>
                        {selectedLeads.length} lead(s) selecionado(s) • Delay de 3s entre disparos
                    </span>
                </div>
                <button
                    onClick={handleSend}
                    disabled={campaignStatus === 'sending' || !message.trim() || selectedLeads.length === 0}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-accent text-white rounded-xl hover:bg-accent-dark transition-all shadow-md hover:shadow-lg active:scale-95 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    {campaignStatus === 'sending' ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Enviando...</span>
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            <span>Disparar Campanha</span>
                        </>
                    )}
                </button>
            </div>

            {/* Relatório de Resultados */}
            {showResults && results.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Relatório de Envio
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                                <CheckCircle size={14} />
                                {results.filter(r => r.success).length} enviados
                            </span>
                            {results.filter(r => !r.success).length > 0 && (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                    <XCircle size={14} />
                                    {results.filter(r => !r.success).length} falhas
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                        {results.map((result, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 md:px-6 py-3">
                                {result.success ? (
                                    <CheckCircle className="text-green-500 shrink-0" size={16} />
                                ) : (
                                    <XCircle className="text-red-500 shrink-0" size={16} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-900">{result.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{result.phone}</span>
                                </div>
                                {!result.success && result.error && (
                                    <span className="text-[10px] text-red-500 truncate max-w-[120px]">{result.error}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
