'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
    Megaphone, Send, Filter, Search, Users, CheckCircle,
    XCircle, AlertCircle, Loader2, Phone, User, ChevronDown,
    ChevronUp, Info, ImagePlus, X, Trash2
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
    text?: string
    timestamp?: string
}

type CampaignStatus = 'idle' | 'sending' | 'done'

export default function CampanhasPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')

    // Imagem da campanha
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [resultSearchQuery, setResultSearchQuery] = useState('')
    const [selectedResult, setSelectedResult] = useState<SendResult | null>(null)
    const [completionDate, setCompletionDate] = useState<string | null>(null)

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
        console.log('handleSend clicked', { messageLen: message.length, selectedLeadsLen: selectedLeads.length, hasImage: !!imageFile })
        if ((!message.trim() && !imageFile) || selectedLeads.length === 0) return
        setIsConfirmModalOpen(true)
    }

    const processSend = async () => {
        console.log('processSend started')
        setIsConfirmModalOpen(false)
        setCampaignStatus('sending')
        setResults([])
        setShowResults(true)
        setCompletionDate(null)

        // Comprimir e converter imagem para base64 se existir
        let imageBase64: string | null = null
        if (imageFile) {
            imageBase64 = await new Promise<string>((resolve) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const MAX_SIZE = 1024
                    let { width, height } = img

                    // Redimensionar mantendo proporção (máx 1024px)
                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        if (width > height) {
                            height = Math.round((height * MAX_SIZE) / width)
                            width = MAX_SIZE
                        } else {
                            width = Math.round((width * MAX_SIZE) / height)
                            height = MAX_SIZE
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')!
                    ctx.drawImage(img, 0, 0, width, height)

                    // Exportar como JPEG com qualidade 0.7 (~70%)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                    resolve(dataUrl.split(',')[1])
                }
                img.src = URL.createObjectURL(imageFile)
            })
        }

        try {
            const response = await fetch('/api/campaign/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numbers: selectedLeads.map(l => ({
                        id: l.id,
                        phone: l.phone,
                        name: l.name || 'Cliente'
                    })),
                    text: message,
                    ...(imageBase64 && {
                        media: {
                            base64: imageBase64,
                            mimetype: 'image/jpeg',
                            filename: (imageFile!.name.replace(/\.[^.]+$/, '') || 'campanha') + '.jpg',
                        }
                    }),
                }),
            })

            const data = await response.json()
            console.log('Response received', data)

            if (data.results) {
                const enrichedResults = data.results.map((r: any) => ({
                    ...r,
                    text: message.replace(/\{nome\}/gi, r.name || 'Cliente'),
                    timestamp: new Date().toLocaleTimeString('pt-BR')
                }))
                setResults(enrichedResults)
                setCompletionDate(new Date().toLocaleDateString('pt-BR'))
            }
        } catch (err) {
            console.error('Erro no disparo:', err)
        }

        setCampaignStatus('done')
    }

    // Handlers de imagem
    const handleImageSelect = (file: File) => {
        if (!file.type.startsWith('image/')) return
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB')
            return
        }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const statusOptions = [
        { id: 'novo', label: 'Novo Lead', color: 'bg-gray-100 text-gray-700' },
        { id: 'negociando', label: 'Negociando', color: 'bg-yellow-100 text-yellow-700' },
        { id: 'finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-700' },
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

            {/* Mensagem + Imagem */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-4">
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

                {/* Upload de Imagem */}
                <div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-2">
                        Imagem <span className="text-gray-400 font-normal normal-case">(opcional)</span>
                    </label>

                    {imagePreview ? (
                        <div className="relative inline-block">
                            <img
                                src={imagePreview}
                                alt="Preview da campanha"
                                className="max-h-48 rounded-xl border border-gray-200 shadow-sm object-contain"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                title="Remover imagem"
                            >
                                <X size={14} />
                            </button>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                <ImagePlus size={12} />
                                <span>{imageFile?.name}</span>
                                <span className="text-gray-300">•</span>
                                <span>{((imageFile?.size || 0) / 1024).toFixed(0)} KB</span>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                            onDrop={(e) => {
                                e.preventDefault(); e.stopPropagation()
                                const file = e.dataTransfer.files?.[0]
                                if (file) handleImageSelect(file)
                            }}
                            className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                        >
                            <ImagePlus size={28} className="text-gray-300 group-hover:text-primary/60 transition-colors" />
                            <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                                Clique ou arraste uma imagem aqui
                            </span>
                            <span className="text-[10px] text-gray-300">
                                PNG, JPG ou WEBP • Máx. 5MB
                            </span>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageSelect(file)
                        }}
                        className="hidden"
                    />
                </div>
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
                                    suppressHydrationWarning
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
                                    suppressHydrationWarning
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
                        {selectedLeads.length} lead(s) selecionado(s) • Delay de 15s entre disparos
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={campaignStatus === 'sending' || (!message.trim() && !imageFile) || selectedLeads.length === 0}
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
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    Relatório de Envio
                                    {completionDate && (
                                        <span className="text-[10px] font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full lowercase">
                                            {completionDate}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                                    <CheckCircle size={14} />
                                    {results.filter(r => r.success).length}
                                </span>
                                {results.filter(r => !r.success).length > 0 && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                        <XCircle size={14} />
                                        {results.filter(r => !r.success).length}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Busca nos Resultados */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome ou celular no relatório..."
                                value={resultSearchQuery}
                                onChange={(e) => setResultSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary transition-all"
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {results
                            .filter(r =>
                                !resultSearchQuery ||
                                r.name.toLowerCase().includes(resultSearchQuery.toLowerCase()) ||
                                r.phone.includes(resultSearchQuery)
                            )
                            .map((result, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedResult(result)}
                                    className="w-full flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-gray-50 transition-colors text-left group cursor-pointer"
                                >
                                    {result.success ? (
                                        <CheckCircle className="text-green-500 shrink-0" size={16} />
                                    ) : (
                                        <XCircle className="text-red-500 shrink-0" size={16} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">{result.name}</span>
                                            {result.timestamp && (
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {result.timestamp}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">{result.phone}</span>
                                    </div>
                                    {!result.success && result.error && (
                                        <span className="text-[10px] text-red-500 truncate max-w-[120px]">{result.error}</span>
                                    )}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Info size={14} className="text-gray-300" />
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Resultado */}
            <ResultDetailModal
                result={selectedResult}
                onClose={() => setSelectedResult(null)}
            />
            {/* Modal de Confirmação Customizado */}
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => {
                    console.log('ConfirmModal: onClose triggered')
                    setIsConfirmModalOpen(false)
                }}
                onConfirm={processSend}
                count={selectedLeads.length}
            />
        </div>
    )
}

function ResultDetailModal({ result, onClose }: { result: SendResult | null, onClose: () => void }) {
    if (!result) return null

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{result.name}</h3>
                                <p className="text-xs text-gray-500">{result.phone}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <XCircle size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Mensagem Enviada</label>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed italic">
                                    "{result.text || 'Nenhuma mensagem registrada'}"
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Horário Envio</label>
                                <span className="text-sm text-gray-600 font-mono">{result.timestamp || '--:--'}</span>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                                <span className={`text-sm font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.success ? 'Sucesso' : 'Falha'}
                                </span>
                            </div>
                        </div>

                        {!result.success && result.error && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1">Erro</label>
                                <p className="text-xs text-red-700">{result.error}</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95"
                        >
                            Fechar Detalhes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ConfirmModal({ isOpen, onClose, onConfirm, count }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, count: number }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 space-y-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4">
                        <Megaphone size={32} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">Confirmar Disparo</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Você está prestes a enviar uma campanha para <span className="font-bold text-gray-900">{count} lead(s)</span>.
                            Deseja continuar?
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                console.log('ConfirmModal: onConfirm action fired')
                                onConfirm()
                            }}
                            className="px-4 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all shadow-md active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>

                {/* Linha Decorativa Inferior */}
                <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-700 w-full" />
            </div>
        </div>
    )
}
