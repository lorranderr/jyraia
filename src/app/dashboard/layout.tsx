import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="min-h-screen flex flex-col" style={{ marginLeft: '256px' }}>
                {/* Content */}
                <main className="flex-1 p-8">
                    {children}
                </main>

                {/* Footer Institucional */}
                <footer className="p-4 text-center border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        © 2026 CRM JATCAIXAAQUI. Criado e todos os direitos reservados pela{' '}
                        <span className="font-semibold text-primary">N7Tech</span>.
                    </p>
                </footer>
            </div>
        </div>
    )
}
