import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import type { VehicleDocument, VehicleDocType } from '../types'

export function useVehicleDocuments(vehicleId: string) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<VehicleDocument[]>(`/vehicles/${vehicleId}/documents`)
      setDocuments(data)
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const uploadDocument = async (file: File, name: string, docType: VehicleDocType): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('doc_type', docType)

    const doc = await api<VehicleDocument>(`/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      body: formData,
    })
    setDocuments((prev) => [doc, ...prev])
  }

  const deleteDocument = async (doc: VehicleDocument): Promise<void> => {
    await api(`/documents/${doc.id}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  return { documents, loading, uploadDocument, deleteDocument, refetch: fetchDocuments }
}
