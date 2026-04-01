const MAX_FILES = 100

/**
 * POST multipart/form-data: device_source + files[] (same field name repeated).
 * @param {File[]} files
 * @param {string} authToken JWT (Bearer)
 */
export async function uploadWardriveFiles (files, authToken) {
  const url = import.meta.env.VITE_UPLOAD_URL
  const deviceSource = import.meta.env.VITE_DEVICE_SOURCE

  if (!url) {
    throw new Error('VITE_UPLOAD_URL is not configured')
  }
  if (!deviceSource) {
    throw new Error('VITE_DEVICE_SOURCE is not configured')
  }
  if (!authToken) {
    throw new Error('Not authenticated — sign in to the platform first')
  }

  const slice = files.slice(0, MAX_FILES)
  if (slice.length === 0) {
    throw new Error('No files to upload')
  }

  const formData = new FormData()
  formData.append('device_source', deviceSource)
  for (const file of slice) {
    formData.append('files', file, file.name)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`
    },
    body: formData
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Upload failed (${res.status})`)
  }

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return res.json()
  }
  return { ok: true }
}
