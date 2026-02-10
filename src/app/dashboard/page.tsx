'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        finalized: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            setLoading(true)

            // 1. Total de Leads
            const { count: totalCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })

            // 2. Leads em Andamento (novo, negociando, aprovado + null)
            const { count: inProgressCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .or('status.in.(novo,negociando,aprovado),status.is.null')

            // 3. Leads Finalizados (fechado, perdido)
            const { count: finalizedCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .in('status', ['fechado', 'perdido'])

            setStats({
                total: totalCount || 0,
                inProgress: inProgressCount || 0,
                finalized: finalizedCount || 0
            })
            setLoading(false)
        }

        fetchStats()
    }, [])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/20">
                    <LayoutDashboard className="text-white" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Centro de Comando
                    </h1>
                    <p className="text-sm text-gray-500">
                        Acompanhe o desempenho e a saúde dos seus leads em tempo real
                    </p>
                </div>
            </div>

            {/* Dashboard Cards Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 - Total de Leads */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total de Leads</p>
                            <p className="text-3xl font-bold text-primary mt-1">
                                {loading ? (
                                    <span className="inline-block w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                ) : (
                                    stats.total
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Users className="text-primary" size={24} />
                        </div>
                    </div>
                </div>

                {/* Card 2 - Leads em Andamento */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Leads em Andamento</p>
                            <p className="text-3xl font-bold text-accent mt-1">
                                {loading ? (
                                    <span className="inline-block w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                                ) : (
                                    stats.inProgress
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-accent/10 rounded-lg">
                            <Clock className="text-accent" size={24} />
                        </div>
                    </div>
                </div>

                {/* Card 3 - Leads Finalizados */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Leads Finalizados</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">
                                {loading ? (
                                    <span className="inline-block w-8 h-8 border-2 border-green-100 border-t-green-600 rounded-full animate-spin" />
                                ) : (
                                    stats.finalized
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
