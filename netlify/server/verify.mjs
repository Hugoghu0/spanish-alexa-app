// Verifies that a request really comes from Amazon Alexa
// (required by Alexa for skills hosted on your own HTTPS endpoint).
import crypto from 'node:crypto'
import tls from 'node:tls'

const certCache = new Map()
const MAX_SKEW_MS = 150 * 1000

function isValidCertUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    url.hostname.toLowerCase() === 's3.amazonaws.com' &&
    (url.port === '' || url.port === '443') &&
    url.pathname.startsWith('/echo.api/')
  )
}

function splitPem(pem) {
  return pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? []
}

let roots
function trustedRoots() {
  roots ??= tls.rootCertificates.map((pem) => new crypto.X509Certificate(pem))
  return roots
}

async function loadSigningCert(certUrl) {
  const cached = certCache.get(certUrl)
  if (cached && new Date(cached.validTo) > new Date()) return cached

  const res = await fetch(certUrl)
  if (!res.ok) throw new Error('No se pudo descargar el certificado')
  const chain = splitPem(await res.text()).map((pem) => new crypto.X509Certificate(pem))
  if (chain.length === 0) throw new Error('Cadena de certificados vacía')

  const now = new Date()
  for (const cert of chain) {
    if (new Date(cert.validFrom) > now || new Date(cert.validTo) < now) {
      throw new Error('Certificado fuera de vigencia')
    }
  }

  const leaf = chain[0]
  const san = leaf.subjectAltName ?? ''
  if (!san.split(',').map((s) => s.trim()).includes('DNS:echo-api.amazon.com')) {
    throw new Error('El certificado no es de echo-api.amazon.com')
  }

  // Each certificate must be signed by the next one in the chain...
  for (let i = 0; i < chain.length - 1; i++) {
    if (!chain[i].checkIssued(chain[i + 1]) || !chain[i].verify(chain[i + 1].publicKey)) {
      throw new Error('Cadena de certificados inválida')
    }
  }
  // ...and the last one must chain to a trusted root CA.
  const last = chain[chain.length - 1]
  const anchored = trustedRoots().some(
    (root) => root.fingerprint256 === last.fingerprint256 || (last.checkIssued(root) && last.verify(root.publicKey)),
  )
  if (!anchored) throw new Error('Certificado no confiable')

  certCache.set(certUrl, leaf)
  return leaf
}

export async function verifyAlexaRequest(request, rawBody, body) {
  const certUrl = request.headers.get('signaturecertchainurl')
  const signature = request.headers.get('signature-256')
  if (!certUrl || !signature || !isValidCertUrl(certUrl)) {
    throw new Error('Faltan cabeceras de firma válidas')
  }

  const ts = Date.parse(body?.request?.timestamp ?? '')
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    throw new Error('Marca de tiempo inválida')
  }

  const cert = await loadSigningCert(certUrl)
  const ok = crypto.verify('sha256', Buffer.from(rawBody, 'utf8'), cert.publicKey, Buffer.from(signature, 'base64'))
  if (!ok) throw new Error('Firma inválida')

  const expectedSkillId = process.env.ALEXA_SKILL_ID
  const skillId = body?.session?.application?.applicationId ?? body?.context?.System?.application?.applicationId
  if (expectedSkillId && skillId !== expectedSkillId) {
    throw new Error('ID de skill no coincide')
  }
}
