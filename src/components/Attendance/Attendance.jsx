import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { CalendarClock, Pencil } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { fieldStaff } from '@/mocks/liveLocation'
import { selectAttendance } from '@/store/attendanceSlice'
import { selectOfficeTime } from '@/store/settingsSlice'
import { attendanceStats, isPartial, workedMinutes } from './attendanceModel'
import { Dash, ImagesCell, TimeCell, WorkedCell } from './components/AttendanceCells'
import { StatTabs } from './components/StatTabs'

const helper = createColumnHelper(listFeatures)
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Attendance for one day: who is in, who is not, and the day's numbers. */
export default function Attendance() {
  const navigate = useNavigate()
  const records = useSelector(selectAttendance)
  const officeTime = useSelector(selectOfficeTime)
  const [date, setDate] = useState(todayISO)
  const [tab, setTab] = useState('present')
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

  const dayRecords = useMemo(() => records.filter((r) => r.date === date), [records, date])
  const stats = attendanceStats(dayRecords, officeTime, fieldStaff.length)

  /** One row per user, whether or not they checked in. */
  const rows = useMemo(() => {
    const byUser = Object.fromEntries(dayRecords.map((r) => [r.userId, r]))
    return fieldStaff.map((user) => {
      const record = byUser[user.id]
      const worked = workedMinutes(record)
      return {
        id: user.id,
        user,
        record,
        worked,
        partial: record ? isPartial(record, officeTime) : false,
        odoDistance: record?.odoIn != null && record?.odoOut != null ? record.odoOut - record.odoIn : null,
      }
    })
  }, [dayRecords, officeTime])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (tab === 'present') return Boolean(row.record)
        if (tab === 'absent') return !row.record
        if (tab === 'late') return row.record && row.record.inAt > officeTime.start
        if (tab === 'partial') return row.partial
        return true
      })
      .filter((row) => !q || row.user.name.toLowerCase().includes(q))
  }, [rows, tab, search, officeTime])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor((r) => r.user.name, {
          id: 'name',
          header: 'Name',
          cell: ({ row, getValue }) => (
            <Link
              to={`/admin/attendance/${row.original.user.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-green-deep uppercase hover:underline"
            >
              {getValue()}
            </Link>
          ),
        }),
        helper.display({
          id: 'in',
          header: 'In',
          cell: ({ row }) => <TimeCell time={row.original.record?.inAt} lat={row.original.record?.inLat} lng={row.original.record?.inLng} direction="in" />,
        }),
        helper.display({
          id: 'out',
          header: 'Out',
          cell: ({ row }) => <TimeCell time={row.original.record?.outAt} lat={row.original.record?.outLat} lng={row.original.record?.outLng} direction="out" />,
        }),
        helper.accessor('worked', { header: 'Working hrs', cell: ({ row }) => <WorkedCell minutes={row.original.worked} partial={row.original.partial} /> }),
        helper.accessor((r) => r.record?.odoIn, { id: 'odoIn', header: 'Odo In', cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()}</span> : <Dash />) }),
        helper.accessor((r) => r.record?.odoOut, { id: 'odoOut', header: 'Odo Out', cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()}</span> : <Dash />) }),
        helper.accessor('odoDistance', {
          header: 'Odo Distance',
          cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()} km</span> : <Dash />),
        }),
        helper.display({ id: 'images', header: 'Images', cell: ({ row }) => <ImagesCell images={row.original.record?.images} title={row.original.user.name} /> }),
        helper.accessor((r) => r.record?.comment ?? '', {
          id: 'comment',
          header: 'Comment',
          enableSorting: false,
          meta: { align: 'right', className: 'max-w-[12rem]' },
          cell: (i) => <span className="block truncate text-ink">{i.getValue()}</span>,
        }),
      ]),
    [],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Attendance</h1>
          <span className="inline-flex items-center rounded-lg bg-warning-soft px-3 py-1.5 text-sm font-semibold text-warning-ink">
            Office Time : {officeTime.start} - {officeTime.end}
          </span>
          <button
            type="button"
            aria-label="Edit office time in Settings"
            onClick={() => navigate('/admin/settings')}
            className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Pencil className="size-4" />
          </button>
        </div>
        <input
          type="date"
          aria-label="Attendance date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value || todayISO())}
          className="h-11 rounded-lg border border-mint bg-white px-3.5 text-sm font-medium text-black outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25"
        />
      </header>

      <StatTabs
        value={tab}
        onChange={(next) => { setTab(next); setPagination((st) => ({ ...st, pageIndex: 0 })) }}
        tabs={[
          { id: 'present', label: 'Present', value: stats.present },
          { id: 'absent', label: 'Absent', value: stats.absent },
          { id: 'late', label: 'Late Check In', value: stats.late },
          { id: 'partial', label: 'Partial Working hr', value: stats.partial },
          { id: 'active', label: 'Active', value: stats.active },
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPagination((s) => ({ ...s, pageIndex: 0 })) }} placeholder="Search staff" className="sm:w-72" />
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((s) => ({ ...s, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          pagination={page}
          onPaginationChange={setPagination}
          onRowClick={(row) => navigate(`/admin/attendance/${row.user.id}`)}
          empty={
            <EmptyState
              icon={CalendarClock}
              title="Nobody in this list"
              description={tab === 'present' ? 'No one has checked in on this date yet.' : 'Try another date or another card above.'}
            />
          }
        />
      </section>
    </div>
  )
}
