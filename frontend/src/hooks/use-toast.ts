import { useState, useEffect } from 'react'

type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    console.log('Toast:', title, description) // Minimal implementation
    // In a real app, you'd manage state here to show toast UI
  }

  return { toast }
}
