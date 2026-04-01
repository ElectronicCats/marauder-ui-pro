export const DEFAULT_WIGLE_HEADER = 'WigleWifi-1.4,appRelease=PwnterreyESP32Marauder'
export const DEFAULT_COLUMN_HEADER =
  'MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type'

/**
 * @param {Array<{ mac: string, ssid: string, auth: string, firstSeen: string, channel: string, rssi: string, lat: string, lon: string, alt: string, accuracy: string, type: string }>} entries
 */
export function buildWardriveCsvString (entries, csvHeader, csvColumnHeader) {
  const header = csvHeader || DEFAULT_WIGLE_HEADER
  const columns = csvColumnHeader || DEFAULT_COLUMN_HEADER
  const rows = entries.map(
    (e) =>
      `${e.mac},${e.ssid},${e.auth},${e.firstSeen},${e.channel},${e.rssi},${e.lat},${e.lon},${e.alt},${e.accuracy},${e.type}`
  )
  return [header, columns, ...rows].join('\n')
}

export function buildWardriveCsvBlob (entries, csvHeader, csvColumnHeader) {
  const csv = buildWardriveCsvString(entries, csvHeader, csvColumnHeader)
  return new Blob([csv], { type: 'text/csv' })
}

export function wardriveCsvFileName () {
  return `wardrive_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
}

export function buildWardriveCsvFile (entries, csvHeader, csvColumnHeader) {
  const blob = buildWardriveCsvBlob(entries, csvHeader, csvColumnHeader)
  return new File([blob], wardriveCsvFileName(), { type: 'text/csv' })
}
