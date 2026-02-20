import https from 'https'

function apiRequest(
  path: string,
  apiKey: string,
  method: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.assemblyai.com',
      path,
      method,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Failed to parse AssemblyAI response: ${data.slice(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function uploadAudio(wavBuffer: Buffer, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.assemblyai.com',
      path: '/v2/upload',
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
        'Transfer-Encoding': 'chunked',
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.upload_url)
        } catch {
          reject(new Error('Failed to upload audio to AssemblyAI'))
        }
      })
    })

    req.on('error', reject)
    req.write(wavBuffer)
    req.end()
  })
}

export async function sttAssemblyAI(wavBuffer: Buffer, apiKey: string): Promise<string> {
  const uploadUrl = await uploadAudio(wavBuffer, apiKey)

  const transcript = await apiRequest('/v2/transcript', apiKey, 'POST', {
    audio_url: uploadUrl,
    language_code: 'en',
  })

  const transcriptId = transcript.id

  // Poll for completion
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const result = await apiRequest(`/v2/transcript/${transcriptId}`, apiKey, 'GET')

    if (result.status === 'completed') {
      return result.text || ''
    }

    if (result.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${result.error}`)
    }
  }

  throw new Error('AssemblyAI transcription timed out')
}
