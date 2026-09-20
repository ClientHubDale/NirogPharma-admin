import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { CalendarClock } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link, Navigate, useParams } from 'react-router-dom'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Pagination } from '@/components/data/Pagination'
import { fieldStaff } from '@/mocks/liveLocation'
import { selectAttendance } from '@/store/attendanceSlice'
import { selectOfficeTime } from '@/store/settingsSlice'
import { isLate, isPartial, workedMinutes } from './attendanceModel'
import { Dash, ImagesCell, TimeCell, WorkedCell } from './components/AttendanceCells'
import { StatTabs } from './components/StatTabs'

const helper = createColumnHelper(listFeatures)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const thisMonth = () => new Date().toISOString().slice(0, 7)

/** One user's month: the days they worked, their hours and where they were. */
export default function UserAttendance() {
  const { userId } = useParams()
  const records = useSelector(selectAttendance)
  const officeTime = useSelector(selectOfficeTime)
  const [month, setMonth] = useState(thisMonth)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 31 })

  const user = fieldStaff.find((u) => u.id === userId)
  const rows = useMemo(
    () =>
      records
        .filter((r) => r.userId === userId && r.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((record) => ({ ...record, worked: workedMinutes(record), partial: isPartial(record, officeTime) })),
    [records, userId, month, officeTime],
  )

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('date', {
          header: 'Date',
          cell: (i) => {
            const d = new Date(`${i.getValue()}T00:00:00`)
            return (
              <span className="inline-flex size-12 flex-col items-center justify-center rounded-lg border border-mint-pale bg-bg">
                <span className="font-mono text-base leading-none font-semibold text-black">{d.getDate()}</span>
                <span className="text-[0.65rem] text-ink-muted">{DAYS[d.getDay()]}</span>
              </span>
            )
          },
        }),
        helper.display({ id: 'in', header: 'In', cell: ({ row }) => <TimeCell time={row.original.inAt} lat={row.original.inLat} lng={row.original.inLng} direction="in" /> }),
        helper.display({ id: 'out', header: 'Out', cell: ({ row }) => <TimeCell time={row.original.outAt} lat={row.original.outLat} lng={row.original.outLng} direction="out" /> }),
        helper.accessor('worked', { header: 'Working hrs', cell: ({ row }) => <WorkedCell minutes={row.original.worked} partial={row.original.partial} /> }),
        helper.accessor('odoIn', { header: 'Odo In', cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()}</span> : <Dash />) }),
        helper.accessor('odoOut', { header: 'Odo Out', cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()}</span> : <Dash />) }),
        helper.accessor((r) => (r.odoIn != null && r.odoOut != null ? r.odoOut - r.odoIn : null), {
          id: 'odoDistance',
          header: 'Odo Distance',
          cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()} km</span> : <Dash />),
        }),
        helper.accessor('distanceKm', {
          header: 'Distance',
          cell: (i) => (i.getValue() != null ? <span className="font-mono text-sm">{i.getValue()} km</span> : <Dash />),
        }),
        helper.display({ id: 'images', header: 'Images', cell: ({ row }) => <ImagesCell images={row.original.images} title={`${user?.name ?? ''} · ${row.original.date}`} /> }),
        helper.accessor('comment', {
          header: 'Comment',
          enableSorting: false,
          meta: { align: 'right', className: 'max-w-[12rem]' },
          cell: (i) => <span className="block truncate text-ink">{i.getValue()}</span>,
        }),
      ]),
    [user],
  )

  if (!user) return <Navigate to="/admin/attendance" replace />

  const stats = {
    present: rows.length,
    late: rows.filter((r) => isLate(r, officeTime)).length,
    partial: rows.filter((r) => r.partial).length,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-lg font-extrabold sm:text-2xl" aria-label="Breadcrumb">
          <Link to="/admin/attendance" className="text-green-deep hover:underline">Users</Link>
          <span className="text-ink-muted">›</span>
          <span className="uppercase">{user.name}</span>
        </nav>
        <input
          type="month"
          aria-label="Attendance month"
          value={month}
          max={thisMonth()}
          onChange={(e) => setMonth(e.target.value || thisMonth())}
          className="h-11 rounded-lg border border-mint bg-white px-3.5 text-sm font-medium text-black outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25"
        />
      </header>

      <StatTabs
        tabs={[
          { id: 'present', label: 'Present', value: stats.present, readOnly: true },
          { id: 'late', label: 'Late Check In', value: stats.late, readOnly: true },
          { id: 'partial', label: 'Partial Working hr', value: stats.partial, readOnly: true },
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="border-b border-mint-pale p-4">
          <Pagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={rows.length}
            onPageChange={(pageIndex) => setPagination((s) => ({ ...s, pageIndex }))}
            className="justify-between sm:justify-end"
          />
        </div>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          pagination={pagination}
          onPaginationChange={setPagination}
          empty={<EmptyState icon={CalendarClock} title="No attendance this month" description="Pick another month — records start when the field app is used." />}
        />
      </section>
    </div>
  )
}
