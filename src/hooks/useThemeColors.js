import { useMemo } from 'react'

/**
 * Reads palette variables from :root so charts (which set colours as SVG
 * attributes, where CSS variables aren't reliable) still use index.css as the
 * single source of truth.
 *
 *   const { greenDeep } = useThemeColors(['--green-deep'])
 */
export function useThemeColors(names) {
  const key = names.join(',')
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    return Object.fromEntries(
      key.split(',').map((name) => [
        name.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
        styles.getPropertyValue(name).trim(),
      ]),
    )
  }, [key])
}
