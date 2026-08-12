import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Category, Settings, Transaction } from '../types'
import { uid } from '../lib/format'
import { loadState, saveState } from '../lib/storage'

export interface Store {
  state: AppState
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  removeTransaction: (id: string) => void
  addCategory: (cat: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Category>) => void
  removeCategory: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceState: (next: AppState) => void
  clearTransactions: () => void
}

export function useStore(): Store {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  // Mantiene sincronizadas las pestañas abiertas del mismo navegador.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app-gastos:state') setState(loadState())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    setState((s) => ({
      ...s,
      transactions: [{ ...tx, amount: Math.abs(tx.amount), id: uid(), createdAt: Date.now() }, ...s.transactions],
    }))
  }, [])

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...patch, amount: Math.abs(patch.amount ?? t.amount) } : t,
      ),
    }))
  }, [])

  const removeTransaction = useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }))
  }, [])

  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    setState((s) => ({ ...s, categories: [...s.categories, { ...cat, id: uid() }] }))
  }, [])

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  /**
   * Solo elimina categorías propias y sin movimientos; el resto se archiva,
   * así ningún movimiento queda huérfano.
   */
  const removeCategory = useCallback((id: string) => {
    setState((s) => {
      const inUse = s.transactions.some((t) => t.categoryId === id)
      const cat = s.categories.find((c) => c.id === id)
      if (!cat) return s
      if (inUse || cat.builtin) {
        return { ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)) }
      }
      return { ...s, categories: s.categories.filter((c) => c.id !== id) }
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const replaceState = useCallback((next: AppState) => setState(next), [])

  const clearTransactions = useCallback(() => {
    setState((s) => ({ ...s, transactions: [] }))
  }, [])

  return useMemo(
    () => ({
      state,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addCategory,
      updateCategory,
      removeCategory,
      updateSettings,
      replaceState,
      clearTransactions,
    }),
    [
      state,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addCategory,
      updateCategory,
      removeCategory,
      updateSettings,
      replaceState,
      clearTransactions,
    ],
  )
}
