import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store'
import type { Vehicle } from '../types'

export function useVehicles() {
  const { vehicles, setVehicles, removeVehicle } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setVehicles(data ?? [])
    setLoading(false)
  }, [setVehicles])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const createVehicle = async (payload: Partial<Vehicle>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...payload, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    setVehicles([data, ...vehicles])
    return data as Vehicle
  }

  const updateVehicle = async (id: string, payload: Partial<Vehicle>) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setVehicles(vehicles.map((v) => (v.id === id ? (data as Vehicle) : v)))
    return data as Vehicle
  }

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) throw error
    removeVehicle(id)
  }

  return { vehicles, loading, error, fetchVehicles, createVehicle, updateVehicle, deleteVehicle }
}
