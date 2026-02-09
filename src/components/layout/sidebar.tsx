'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/leads', icon: Users, label: 'Leads' },
    { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-primary flex flex-col">
            {/* Logo/Header */}
            <div className="p-6 border-b border-primary-light">
                <h1 className="text-xl font-bold text-white">
                    🌶️ Pepper Control
                </h1>
                <p className="text-xs text-white/60 mt-1">Centro de Comando</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive
                                            ? 'bg-accent text-white shadow-lg'
                                            : 'text-white/80 hover:bg-primary-light hover:text-white'
                                        }
                  `}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-primary-light">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-white/80 hover:text-white hover:bg-primary-light rounded-lg transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    )
}
