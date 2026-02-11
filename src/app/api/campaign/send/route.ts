import { NextRequest, NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN!
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE!

const DELAY_MS = 15000 // 15 segundos entre cada disparo

interface SendRequest {
    numbers: { phone: string; name: string }[]
    text: string
}

export async function POST(request: NextRequest) {
    try {
        const body: SendRequest = await request.json()
        const { numbers, text } = body

        if (!numbers || !text || numbers.length === 0) {
            return NextResponse.json(
                { error: 'Números e mensagem são obrigatórios' },
                { status: 400 }
            )
        }

        const results: { phone: string; name: string; success: boolean; error?: string }[] = []

        for (let i = 0; i < numbers.length; i++) {
            const { phone, name } = numbers[i]

            // Substituir variável {nome} pelo nome do lead
            const personalizedText = text.replace(/\{nome\}/gi, name || 'Cliente')

            // Normalizar o número: remover tudo que não for dígito e garantir DDI 55
            let cleanNumber = phone.replace(/\D/g, '')
            if (!cleanNumber.startsWith('55')) {
                cleanNumber = '55' + cleanNumber
            }

            try {
                const response = await fetch(
                    `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': EVOLUTION_API_TOKEN,
                        },
                        body: JSON.stringify({
                            number: cleanNumber,
                            text: personalizedText,
                        }),
                    }
                )

                if (response.ok) {
                    results.push({ phone, name, success: true })
                } else {
                    const errorData = await response.text()
                    results.push({ phone, name, success: false, error: errorData })
                }
            } catch (err: any) {
                results.push({ phone, name, success: false, error: err.message })
            }

            // Delay entre disparos (exceto o último)
            if (i < numbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS))
            }
        }

        const sent = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length

        return NextResponse.json({
            total: numbers.length,
            sent,
            failed,
            results,
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Erro interno' },
            { status: 500 }
        )
    }
}
