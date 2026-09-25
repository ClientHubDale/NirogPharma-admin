import { useEffect, useState } from 'react'

const KEY = 'nirog.sidebar.collapsed'

/** Whether the desktop sidebar is a narrow icon rail. Remembered per browser. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0')
    } catch {
      // A private window can refuse storage — the sidebar still works.
    }
  }, [collapsed])

  return [collapsed, () => setCollapsed((value) => !value)]
}
