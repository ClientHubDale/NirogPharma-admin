import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'

/**
 * Features every list page uses (TanStack Table v9 registers them explicitly).
 * Filtering/search happens before the data reaches the table, so the table
 * only sorts, paginates and hides columns. Column helpers must be created
 * from this same object: createColumnHelper(listFeatures).
 */
export const listFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
})
