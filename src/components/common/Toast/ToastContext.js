import { createContext, useContext } from 'react'

/** Set by ToastProvider; `const toast = useToast()` then `toast({ title, … })`. */
export const ToastContext = createContext(() => {})

export const useToast = () => useContext(ToastContext)
