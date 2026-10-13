import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPriceTiers, selectPriceTiers, selectPriceTiersStatus } from '@/store/priceTiersSlice'

/**
 * The rate columns, loaded the first time any screen asks. The item form, the
 * distributor form, the items table and the import sheet all need the same
 * list, so the fetch lives here rather than in each of them.
 */
export function usePriceTiers() {
  const dispatch = useDispatch()
  const tiers = useSelector(selectPriceTiers)
  const status = useSelector(selectPriceTiersStatus)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPriceTiers())
  }, [status, dispatch])

  return tiers
}
