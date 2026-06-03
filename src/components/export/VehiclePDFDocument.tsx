import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Vehicle, MaintenanceLog, MotoSettingsHistory, SessionNote } from '../../types'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: '#FAF7F2' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#1C1C1E' },
  subtitle: { fontSize: 11, color: '#2A5F8F', marginBottom: 16 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#E8682A', borderBottom: '1pt solid #E8E2D9', paddingBottom: 4, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 4, marginBottom: 3 },
  label: { fontFamily: 'Helvetica-Bold', width: 120 },
  value: { flex: 1, color: '#444' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#E8E2D9', padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tableRow: { flexDirection: 'row', padding: 4, borderBottom: '0.5pt solid #E8E2D9', fontSize: 9 },
  col1: { width: 70 }, col2: { flex: 1 }, col3: { width: 70 }, col4: { width: 50 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' },
})

function fmt(date: string) { try { return format(new Date(date), 'dd/MM/yyyy', { locale: es }) } catch { return date } }

interface Props {
  vehicle: Vehicle
  ordinaryLogs: MaintenanceLog[]
  extraordinaryLogs: MaintenanceLog[]
  motoHistory?: MotoSettingsHistory[]
  sessions?: SessionNote[]
  dateRange?: { from: string; to: string } | null
}

export function VehiclePDFDocument({ vehicle, ordinaryLogs, extraordinaryLogs, motoHistory, sessions, dateRange }: Props) {
  const filter = (logs: MaintenanceLog[]) => dateRange
    ? logs.filter((l) => l.date >= dateRange.from && l.date <= dateRange.to)
    : logs

  const ord = filter(ordinaryLogs)
  const ext = filter(extraordinaryLogs)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AELFWINE'S GARAGE</Text>
        <Text style={styles.subtitle}>Ficha de vehiculo — generado el {format(new Date(), 'dd/MM/yyyy', { locale: es })}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del vehiculo</Text>
          {[
            ['Nombre', vehicle.name],
            ['Marca / Modelo', [vehicle.brand, vehicle.model].filter(Boolean).join(' ')],
            ['Ano', vehicle.year?.toString() ?? '-'],
            ['Matricula', vehicle.license_plate ?? '-'],
            ['Motor', vehicle.engine ?? '-'],
            ['Aceite', vehicle.oil_type ? `${vehicle.oil_type}${vehicle.oil_quantity ? ` · ${vehicle.oil_quantity}L` : ''}` : '-'],
            ['Intervalo', `${vehicle.maintenance_interval_km ? vehicle.maintenance_interval_km.toLocaleString('es-ES') + ' km' : ''} ${vehicle.maintenance_interval_days ? '/ ' + vehicle.maintenance_interval_days + ' dias' : ''}`.trim() || '-'],
            ['Km actuales', vehicle.current_km.toLocaleString('es-ES') + ' km'],
          ].map(([l, v]) => (
            <View key={l} style={styles.row}>
              <Text style={styles.label}>{l}:</Text>
              <Text style={styles.value}>{v}</Text>
            </View>
          ))}
        </View>

        {ord.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mantenimiento ordinario</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Fecha</Text>
              <Text style={styles.col2}>Tipo</Text>
              <Text style={styles.col3}>Km</Text>
              <Text style={styles.col4}>Coste</Text>
            </View>
            {ord.map((l) => (
              <View key={l.id} style={styles.tableRow}>
                <Text style={styles.col1}>{fmt(l.date)}</Text>
                <Text style={styles.col2}>{l.title}</Text>
                <Text style={styles.col3}>{l.km_at_service?.toLocaleString('es-ES') ?? '-'}</Text>
                <Text style={styles.col4}>{l.cost != null ? l.cost + '€' : '-'}</Text>
              </View>
            ))}
          </View>
        )}

        {ext.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mantenimiento extraordinario</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Fecha</Text>
              <Text style={styles.col2}>Tipo</Text>
              <Text style={styles.col3}>Km</Text>
              <Text style={styles.col4}>Coste</Text>
            </View>
            {ext.map((l) => (
              <View key={l.id} style={styles.tableRow}>
                <Text style={styles.col1}>{fmt(l.date)}</Text>
                <Text style={styles.col2}>{l.title}</Text>
                <Text style={styles.col3}>{l.km_at_service?.toLocaleString('es-ES') ?? '-'}</Text>
                <Text style={styles.col4}>{l.cost != null ? l.cost + '€' : '-'}</Text>
              </View>
            ))}
          </View>
        )}

        {motoHistory && motoHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Setups suspension / carburacion</Text>
            {motoHistory.map((snap) => (
              <View key={snap.id} style={{ marginBottom: 10 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{snap.label} | {fmt(snap.date)}{snap.feeling_rating ? ` | ${'★'.repeat(snap.feeling_rating)}` : ''}</Text>
                <Text style={{ fontSize: 9, color: '#555', marginTop: 2 }}>
                  Carb: Main {snap.main_jet ?? '-'} | Pilot {snap.pilot_jet ?? '-'} | Clip {snap.needle_clip ?? '-'} | Aire {snap.air_screw ?? '-'}v{'\n'}
                  Hork: Pre {snap.fork_preload ?? '-'} | Comp {snap.fork_compression ?? '-'} | Ext {snap.fork_rebound ?? '-'}{'\n'}
                  Amort: Pre {snap.shock_preload ?? '-'} | CompH {snap.shock_compression_high ?? '-'} | CompL {snap.shock_compression_low ?? '-'} | Ext {snap.shock_rebound ?? '-'}
                </Text>
                {snap.notes && <Text style={{ fontSize: 8, color: '#777', marginTop: 2 }}>{snap.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {sessions && sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas de sesion</Text>
            {sessions.map((s) => (
              <View key={s.id} style={{ marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{fmt(s.date)} — {s.title}{s.feeling_rating ? ` ${'★'.repeat(s.feeling_rating)}` : ''}</Text>
                {s.location && <Text style={{ fontSize: 8, color: '#555' }}>{s.location}</Text>}
                {s.content && <Text style={{ fontSize: 9, color: '#444', marginTop: 2 }}>{s.content}</Text>}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>Generado por Aelfwine's Garage</Text>
      </Page>
    </Document>
  )
}
