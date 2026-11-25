// Alexa skill endpoint for "Homie" (pronounced "jomi"), in Spanish.
// Configure https://<your-site>/api/alexa as the HTTPS endpoint in the Alexa Developer Console.
import Anthropic from '@anthropic-ai/sdk'
import { verifyAlexaRequest } from './verify.mjs'
import { aplDirective } from './apl.mjs'

export const config = { path: '/api/*' }

const anthropic = new Anthropic({ timeout: 6000, maxRetries: 0 })

const PREGUNTA = '¿Qué quieres?'

function hasScreen(body) {
  return Boolean(body?.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL'])
}

function escapeSsml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function reply(body, { speech, reprompt, screenText, end = false }) {
  const response = {
    outputSpeech: { type: 'SSML', ssml: `<speak>${speech}</speak>` },
    shouldEndSession: end,
  }
  if (reprompt) response.reprompt = { outputSpeech: { type: 'SSML', ssml: `<speak>${reprompt}</speak>` } }
  if (screenText && hasScreen(body)) response.directives = [aplDirective(screenText)]
  return Response.json({ version: '1.0', response })
}

async function askHomie(question) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 300,
    system:
      'Eres Homie, un bot asistente simpático y cercano que vive en un dispositivo Alexa. ' +
      'Responde siempre en español, de forma breve (máximo 3 frases), clara y natural para ser leída en voz alta. ' +
      'No uses markdown, listas, emojis ni enlaces. Si no puedes hacer algo (como poner música o controlar la casa), dilo con amabilidad.',
    messages: [{ role: 'user', content: question }],
  })
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ')
    .trim()
}

async function handleAlexa(body) {
  const req = body.request ?? {}

  if (req.type === 'LaunchRequest') {
    return reply(body, {
      speech: `¡Hola! Soy Jomi. ${PREGUNTA}`,
      reprompt: `${PREGUNTA} Puedes preguntarme lo que quieras.`,
      screenText: PREGUNTA,
    })
  }

  if (req.type === 'SessionEndedRequest') {
    return Response.json({ version: '1.0', response: {} })
  }

  if (req.type === 'IntentRequest') {
    const intent = req.intent?.name

    if (intent === 'PreguntaIntent') {
      const consulta = req.intent.slots?.consulta?.value?.trim()
      if (!consulta) {
        return reply(body, { speech: `No te escuché bien. ${PREGUNTA}`, reprompt: PREGUNTA, screenText: PREGUNTA })
      }
      let answer
      try {
        answer = await askHomie(consulta)
      } catch (err) {
        console.error('AI error', err)
        answer = ''
      }
      if (!answer) {
        return reply(body, {
          speech: `Uy, ahora mismo no puedo pensar en eso. ¿Quieres preguntarme otra cosa?`,
          reprompt: PREGUNTA,
          screenText: PREGUNTA,
        })
      }
      return reply(body, {
        speech: `${escapeSsml(answer)} <break time="400ms"/> ¿Algo más?`,
        reprompt: '¿Quieres algo más?',
        screenText: answer,
      })
    }

    if (intent === 'AMAZON.HelpIntent') {
      return reply(body, {
        speech:
          'Soy Jomi, tu asistente. Puedes decirme cosas como: quiero saber cuántos planetas hay, o cuéntame un chiste. ' +
          PREGUNTA,
        reprompt: PREGUNTA,
        screenText: PREGUNTA,
      })
    }

    if (intent === 'AMAZON.StopIntent' || intent === 'AMAZON.CancelIntent') {
      return reply(body, { speech: '¡Hasta luego!', screenText: '¡Hasta luego!', end: true })
    }

    if (intent === 'AMAZON.NavigateHomeIntent') {
      return reply(body, { speech: PREGUNTA, reprompt: PREGUNTA, screenText: PREGUNTA })
    }

    // AMAZON.FallbackIntent and anything else
    return reply(body, {
      speech: `No te entendí. Prueba empezando con "quiero", "dime" o "cuéntame". ${PREGUNTA}`,
      reprompt: PREGUNTA,
      screenText: PREGUNTA,
    })
  }

  return reply(body, { speech: PREGUNTA, reprompt: PREGUNTA, screenText: PREGUNTA })
}

export default async function handler(request) {
  const { pathname } = new URL(request.url)

  if (pathname !== '/api/alexa') {
    return Response.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (request.method === 'GET') {
    return Response.json({ ok: true, skill: 'Homie', mensaje: 'Endpoint de Alexa activo. Usa POST.' })
  }
  if (request.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 })
  }

  const rawBody = await request.text()
  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Skip signature checks only under local `netlify dev` so the endpoint can be tested with curl.
  if (process.env.NETLIFY_DEV !== 'true') {
    try {
      await verifyAlexaRequest(request, rawBody, body)
    } catch (err) {
      console.warn('Rejected Alexa request:', err.message)
      return Response.json({ error: 'Solicitud no verificada' }, { status: 400 })
    }
  }

  return handleAlexa(body)
}
