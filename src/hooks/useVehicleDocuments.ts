import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { VehicleDocument, VehicleDocType } from '../types'

export function useVehicleDocuments(vehicleId: string) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicle_documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
    if (error || !data) { setLoading(false); return }

    const withUrls = await Promise.all(
      data.map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from('vehicle-docs')
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, signed_url: urlData?.signedUrl ?? undefined }
      })
    )
    setDocuments(withUrls)
    setLoading(false)
  }, [vehicleId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const uploadDocument = async (file: File, name: string, docType: VehicleDocType) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${user.id}/${vehicleId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('vehicle-docs')
      .upload(path, file, { contentType: file.type })
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        name,
        storage_path: path,
        doc_type: docType,
        file_size: file.size,
      })
      .select()
      .single()
    if (error) throw error

    const { data: urlData } = await supabase.storage
      .from('vehicle-docs')
      .createSignedUrl(path, 3600)

    setDocuments((prev) => [{ ...data, signed_url: urlData?.signedUrl ?? undefined }, ...prev])
  }

  const deleteDocument = async (doc: VehicleDocument) => {
    await supabase.storage.from('vehicle-docs').remove([doc.storage_path])
    await supabase.from('vehicle_documents').delete().eq('id', doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  return { documents, loading, uploadDocument, deleteDocument, refetch: fetchDocuments }
}
