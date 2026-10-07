import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchItems, selectItems, selectItemsStatus } from '@/store/itemsSlice'

/**
 * The catalogue, loaded the first time any screen asks for it. Schemes, price
 * lists and the order editor all read items without owning them, so the fetch
 * lives here rather than being repeated in each one.
 */
export function useItems() {
  const dispatch = useDispatch()
  const items = useSelector(selectItems)
  const status = useSelector(selectItemsStatus)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchItems())
  }, [status, dispatch])

  return items
}
