import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-xl">
                    <LayoutDashboard className="text-white" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Bem-vindo ao Centro de Comando
                    </h1>
                    <p className="text-sm text-gray-500">
                        Gerencie seus leads e acompanhe suas operações
                    </p>
                </div>
            </div>

            {/* Dashboard Cards Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 - Leads */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total de Leads</p>
                            <p className="text-3xl font-bold text-primary mt-1">0</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <LayoutDashboard className="text-primary" size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Aguardando implementação do Kanban</p>
                </div>

                {/* Card 2 - Em Andamento */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Em Andamento</p>
                            <p className="text-3xl font-bold text-accent mt-1">0</p>
                        </div>
                        <div className="p-3 bg-accent/10 rounded-lg">
                            <LayoutDashboard className="text-accent" size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Fase 2: Kanban operacional</p>
                </div>

                {/* Card 3 - Finalizados */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Finalizados</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">0</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <LayoutDashboard className="text-green-600" size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Contratos fechados este mês</p>
                </div>
            </div>

            {/* Status do Sistema */}
            <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-2">🚀 Sistema em Construção</h2>
                <p className="text-white/80 text-sm">
                    O CRM JATCAIXAAQUI está em fase de desenvolvimento.
                    A funcionalidade de Kanban para gestão de leads será implementada na Fase 2.
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full w-[80%] bg-accent rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium">80%</span>
                </div>
                <p className="text-xs text-white/60 mt-2">Fase 1: Fundação e Setup</p>
            </div>
        </div>
    )
}
