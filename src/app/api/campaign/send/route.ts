import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN!
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE!

const DELAY_MS = 15000 // 15 segundos entre cada disparo

interface SendRequest {
    numbers: { id: string; phone: string; name: string }[]
    text: string
    media?: {
        base64: string
        mimetype: string
        filename: string
    }
}

export async function POST(request: NextRequest) {
    console.log('[API] Rota /api/campaign/send acessada!')

    // Service role key bypassa RLS; cai no anon key caso não configurado
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
        console.log('[API] Aguardando request.json()...')
        const body: SendRequest = await request.json()
        console.log('[API] request.json() resolvido!')
        const { numbers, text, media } = body
        console.log('--- INICIANDO ENVIO AUTO API CAMPAIGN ---')
        console.log('Payload Recebido:', JSON.stringify(body))

        if (!numbers || (!text && !media) || numbers.length === 0) {
            return NextResponse.json(
                { error: 'Números e mensagem (ou imagem) são obrigatórios' },
                { status: 400 }
            )
        }

        const results: { id: string; phone: string; name: string; success: boolean; error?: string }[] = []

        for (let i = 0; i < numbers.length; i++) {
            const { id, phone, name } = numbers[i]

            // Substituir variável {nome} pelo nome do lead
            const personalizedText = text.replace(/\{nome\}/gi, name || 'Cliente')

            // Normalizar o número: remover tudo que não for dígito e garantir DDI 55
            let cleanNumber = phone.replace(/\D/g, '')
            if (!cleanNumber.startsWith('55')) {
                cleanNumber = '55' + cleanNumber
            }

            let logStatus = 'error'
            let logError = ''

            const controller = new AbortController()
            const fetchTimeout = setTimeout(() => controller.abort(), 10000)

            try {
                let response: Response

                if (media) {
                    // Enviar com imagem via sendMedia (Evolution API v2 - campos na raiz)
                    response = await fetch(
                        `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_TOKEN,
                            },
                            body: JSON.stringify({
                                number: cleanNumber,
                                mediatype: 'image',
                                mimetype: media.mimetype,
                                caption: personalizedText || undefined,
                                media: media.base64,
                                fileName: media.filename,
                            }),
                            signal: controller.signal,
                        }
                    )
                } else {
                    // Enviar apenas texto
                    response = await fetch(
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
                                delay: 1200,
                            }),
                            cache: 'no-store',
                            signal: controller.signal,
                        }
                    )
                }

                clearTimeout(fetchTimeout)

                if (response.ok) {
                    const responseData = await response.json().catch(() => ({}));
                    console.log('✅ EVO API OK:', responseData);
                    results.push({ id, phone, name, success: true })
                    logStatus = 'success'
                } else {
                    const errorData = await response.text()
                    console.log('❌ EVO API ERRO:', response.status, errorData);
                    logError = `HTTP ${response.status}: ${errorData}`
                    results.push({ id, phone, name, success: false, error: logError })
                }
            } catch (err: any) {
                clearTimeout(fetchTimeout)
                if (err.name === 'AbortError') {
                    logError = 'Timeout: Evolution API não respondeu em 30 segundos'
                } else {
                    const cause = err.cause ? ` (${err.cause.message})` : ''
                    logError = `Erro de conexão: ${err.message}${cause}`
                }
                console.error('❌ EVO API EXCEPTION:', logError)
                results.push({ id, phone, name, success: false, error: logError })
            }

            // Salvar no Histórico (Supabase)
            if (id) {
                const { error: insertError } = await supabase.from('campaign_logs').insert([{
                    lead_id: id,
                    status: logStatus,
                    error_description: logError || null,
                    message_text: personalizedText
                }])
                if (insertError) {
                    console.error('[API] Falha ao salvar campaign_log:', insertError.message)
                }
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
