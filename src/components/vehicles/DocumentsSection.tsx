import { useState, useRef } from 'react'
import { FileText, Trash2, Upload, ExternalLink, Download } from 'lucide-react'
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Input'
import type { VehicleDocType } from '../../types'
import toast from 'react-hot-toast'

const DOC_TYPE_LABELS: Record<VehicleDocType, string> = {
  manual: 'Manual',
  parts_list: 'Lista de piezas',
}

export function DocumentsSection({ vehicleId }: { vehicleId: string }) {
  const { documents, loading, uploadDocument, deleteDocument } = useVehicleDocuments(vehicleId)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name: '', docType: 'manual' as VehicleDocType })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !form.name) setForm((prev) => ({ ...prev, name: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleUpload = async () => {
    if (!file) { toast.error('Selecciona un archivo'); return }
    if (!form.name.trim()) { toast.error('Pon un nombre al documento'); return }
    setUploading(true)
    try {
      await uploadDocument(file, form.name.trim(), form.docType)
      toast.success('Documento subido')
      setShowForm(false)
      setForm({ name: '', docType: 'manual' })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch { toast.error('Error al subir') } finally { setUploading(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar "${name}"?`)) return
    try {
      const doc = documents.find((d) => d.id === id)
      if (doc) await deleteDocument(doc)
      toast.success('Eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-gray-500 uppercase tracking-wide">Documentos</h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1 text-xs text-garage-orange font-body font-medium"
        >
          <Upload size={13} />
          Subir PDF
        </button>
      </div>

      {showForm && (
        <div className="bg-garage-cream rounded-xl border border-garage-sand p-4 space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Tipo</label>
            <Select
              value={form.docType}
              onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value as VehicleDocType }))}
            >
              <option value="manual">Manual</option>
              <option value="parts_list">Lista de piezas</option>
            </Select>
          </div>
          <Input
            label="Nombre del documento"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ej: Manual de usuario"
          />
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Archivo PDF</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-garage-sand file:text-garage-dark cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="flex-1 text-sm" loading={uploading} onClick={handleUpload}>Subir</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Cargando...</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Sin documentos aun</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl border border-garage-sand px-4 py-3">
              <FileText size={18} className="text-garage-steel flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-medium text-garage-dark truncate">{doc.name}</p>
                <span className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.doc_type as VehicleDocType]}</span>
                {doc.file_size && (
                  <span className="text-xs text-gray-400"> · {(doc.file_size / 1024).toFixed(0)} KB</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {doc.signed_url && (
                  <>
                    <a
                      href={doc.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-garage-sand text-garage-steel"
                      aria-label="Abrir en nueva pestaña"
                      title="Abrir"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <a
                      href={doc.signed_url + (doc.signed_url.includes('?') ? '&' : '?') + 'dl=1'}
                      className="p-1.5 rounded-lg hover:bg-garage-sand text-garage-steel"
                      aria-label="Descargar"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </a>
                  </>
                )}
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
