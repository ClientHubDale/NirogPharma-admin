import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchGifts, selectGifts, selectGiftsStatus } from '@/store/giftsSlice'

/** The giveaway list, loaded the first time a scheme needs it. */
export function useGifts() {
  const dispatch = useDispatch()
  const gifts = useSelector(selectGifts)
  const status = useSelector(selectGiftsStatus)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchGifts())
  }, [status, dispatch])

  return gifts
}
