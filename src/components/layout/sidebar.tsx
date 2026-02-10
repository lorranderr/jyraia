'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, LogOut, Menu, X, Megaphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const menuItems = [
    { href: '/dashboard', icon: Users, label: 'Leads' },
    { href: '/dashboard/campanhas', icon: Megaphone, label: 'Campanhas' },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)

    // Fechar sidebar ao trocar de rota
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Fechar sidebar ao redimensionar para desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsOpen(false)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <>
            {/* Botão Hamburger — só aparece no mobile */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 left-4 z-50 md:hidden p-2 bg-primary text-white rounded-lg shadow-lg active:scale-95 transition-transform"
                aria-label="Abrir menu"
            >
                <Menu size={22} />
            </button>

            {/* Overlay escuro (mobile) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed left-0 top-0 h-screen bg-primary flex flex-col z-50 w-64
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                `}
            >
                {/* Logo/Header */}
                <div className="p-6 border-b border-primary-light flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">
                            JATCAIXAAQUI
                        </h1>
                        <p className="text-xs text-white/60 mt-1">Centro de Comando</p>
                    </div>
                    {/* Botão fechar — só mobile */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden p-1 text-white/60 hover:text-white transition-colors"
                        aria-label="Fechar menu"
                    >
                        <X size={20} />
                    </button>
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
        </>
    )
}
