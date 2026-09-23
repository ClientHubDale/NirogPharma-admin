import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { FileSpreadsheet, Pencil, Plus, Settings, Upload, UserCog } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { ImportDialog } from '@/components/data/ImportDialog'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { StatusPill } from '@/components/data/StatusPill'
import { UserAvatar } from '@/components/common/UserAvatar'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Switch } from '@/components/form/Switch'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/csv'
import { buildWorkbook, downloadWorkbook, readWorkbookRows } from '@/lib/xlsx'
import { INITIAL_BRANDS, INITIAL_CATEGORIES } from '@/mocks/items'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import { selectUsers, userPatched, usersImported, userSaved } from '@/store/usersSlice'
import { UserForm } from './components/UserForm'
import {
  emptyUserForm,
  formToUser,
  ROLE_LABEL,
  rowsToUsers,
  USER_IMPORT_REQUIRED,
  USER_ROLES,
  USER_SAMPLE_ROWS,
  USER_SHEET_COLUMNS,
  userToForm,
  validateUserForm,
} from './userModel'

const helper = createColumnHelper(listFeatures)
const ROLE_TONE = { ADMIN: 'info', MANAGER: 'success', EXECUTIVE: 'info' }

/** User › Users — everyone who signs in, and what they can reach. */
export default function Users() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const users = useSelector(selectUsers)
  const regions = useSelector(selectRegions)
  const cities = useSelector(selectCities)
  const routes = useSelector(selectRoutes)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [drawer, setDrawer] = useState(null) // { form, errors, editingId }
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  const nameOf = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (role && u.role !== role) return false
      return !q || `${u.name} ${u.mobile} ${u.email} ${u.designation}`.toLowerCase().includes(q)
    })
  }, [users, search, role])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  const openCreate = () => setDrawer({ editingId: null, errors: {}, form: emptyUserForm() })
  const openEdit = (user) => setDrawer({ editingId: user.id, errors: {}, form: userToForm(user) })

  const save = async () => {
    const found = validateUserForm(drawer.form, { users, editingId: drawer.editingId })
    if (Object.keys(found).some((k) => found[k])) return setDrawer((d) => ({ ...d, errors: found }))
    setSaving(true)
    await new Promise((r) => setTimeout(r, 350)) // mock network
    const user = formToUser(drawer.form, drawer.editingId ?? `usr-${Date.now()}`)
    dispatch(userSaved({ user }))
    setSaving(false)
    setDrawer(null)
    setNotice({ tone: 'success', message: `${user.name} ${drawer.editingId ? 'updated' : 'added'} — signs in with ${user.mobile}.` })
  }

  const toggleStatus = (user, on) => {
    dispatch(userPatched({ id: user.id, changes: { status: on ? 'ACTIVE' : 'INACTIVE' } }))
    setNotice({ tone: 'success', message: `${user.name} is now ${on ? 'active' : 'inactive'}${on ? '' : ' and cannot sign in'}.` })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({ id: 'sno', header: 'ID', meta: { className: 'w-16' }, cell: ({ row }) => <span className="font-mono text-xs text-ink-muted">{page.pageIndex * page.pageSize + row.index + 1}</span> }),
        helper.accessor('name', {
          header: 'User Name',
          cell: ({ row, getValue }) => (
            <div className="flex items-center gap-2.5">
              <UserAvatar name={getValue()} photo={row.original.photo?.[0]?.url} className="size-8 bg-mint-pale text-[0.7rem] text-forest" />
              <Link to={`/admin/attendance/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-green-deep uppercase hover:underline">
                {getValue()}
              </Link>
            </div>
          ),
        }),
        helper.accessor('mobile', { header: 'Mobile', cell: (i) => <span className="font-mono text-sm whitespace-nowrap">{i.getValue()}</span> }),
        helper.accessor('email', { header: 'Email', cell: (i) => <span className="text-ink">{i.getValue() || '—'}</span> }),
        helper.accessor('role', {
          header: 'Role',
          cell: (i) => <StatusPill tone={ROLE_TONE[i.getValue()] ?? 'neutral'}>{ROLE_LABEL[i.getValue()] ?? i.getValue()}</StatusPill>,
        }),
        helper.accessor('status', {
          header: 'Status',
          cell: ({ row, getValue }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                id={`status-${row.original.id}`}
                checked={getValue() === 'ACTIVE'}
                onCheckedChange={(on) => toggleStatus(row.original, on)}
                label={<span className="sr-only">{`${row.original.name} is ${getValue() === 'ACTIVE' ? 'active' : 'inactive'}`}</span>}
              />
            </div>
          ),
        }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">Action</span>,
          meta: { align: 'right', className: 'w-16' },
          cell: ({ row }) => (
            <button
              type="button"
              aria-label={`Edit ${row.original.name}`}
              onClick={(e) => {
                e.stopPropagation()
                openEdit(row.original)
              }}
              className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <Pencil className="size-4" />
            </button>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.pageIndex, page.pageSize, users],
  )

  /* ── Excel ── */

  const exportUsers = async () => {
    const wb = await buildWorkbook({
      sheetName: 'Users',
      columns: USER_SHEET_COLUMNS,
      rows: filtered.map((u) => ({
        name: u.name,
        mobile: u.mobile,
        role: ROLE_LABEL[u.role] ?? u.role,
        email: u.email,
        designation: u.designation,
        reportingTo: nameOf[u.reportingTo] ?? '',
        status: u.status === 'ACTIVE' ? 'Active' : 'Inactive',
      })),
    })
    await downloadWorkbook(`nirog-users-${new Date().toISOString().slice(0, 10)}.xlsx`, wb)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}.` })
  }

  const downloadSample = async () => {
    const wb = await buildWorkbook({ sheetName: 'Users', columns: USER_SHEET_COLUMNS, rows: USER_SAMPLE_ROWS, blankRows: 30 })
    await downloadWorkbook('nirog-sample-import-users.xlsx', wb)
  }

  /** Throws to keep the Import dialog open when nothing could be imported. */
  const importFile = async (file) => {
    let rows
    try {
      rows = /\.xlsx$/i.test(file.name) ? await readWorkbookRows(file) : parseCSV(await file.text())
    } catch {
      throw new Error('Couldn’t read this file. Open it in Excel and save it again as .xlsx, then retry.')
    }
    if (!rows.length) throw new Error('The file has no rows under the header. Use Download Sample for the format.')
    const { added, skipped } = rowsToUsers(rows, users)
    const reasons = skipped.slice(0, 5).map((s) => `Line ${s.line}: ${s.reason}`)
    if (!added.length) throw new Error(`No users imported. ${reasons.join(' · ')}`)
    dispatch(usersImported({ users: added }))
    setNotice({
      tone: 'success',
      message: `Imported ${added.length} ${added.length === 1 ? 'user' : 'users'}${skipped.length ? `, skipped ${skipped.length}. ${reasons.join(' · ')}` : '.'} Their password is nirog@123.`,
    })
  }

  const userOptions = useMemo(
    () => users.filter((u) => u.role !== 'EXECUTIVE' && u.id !== drawer?.editingId).map((u) => ({ value: u.id, label: u.name, hint: ROLE_LABEL[u.role] })),
    [users, drawer?.editingId],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Users" subtitle={`${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}`}>
        <Button variant="outline" size="icon-lg" className="size-11" aria-label="User settings" onClick={() => navigate('/admin/settings')}>
          <Settings className="size-4" />
        </Button>
        <Button variant="outline" size="lg" className="h-11" onClick={exportUsers} disabled={!filtered.length}>
          <FileSpreadsheet data-icon="inline-start" /> Export
        </Button>
        <Button variant="outline" size="lg" className="h-11" onClick={() => setImportOpen(true)}>
          <Upload data-icon="inline-start" /> Import
        </Button>
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage() }} placeholder="Search name, mobile, email" className="sm:w-72" />
          <SearchSelect
            aria-label="Filter by role"
            placeholder="Select user"
            clearable
            searchable={false}
            options={USER_ROLES}
            value={role}
            onChange={(v) => { setRole(v); resetPage() }}
            className="sm:w-56"
          />
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(u) => u.id}
          pagination={page}
          onPaginationChange={setPagination}
          onRowClick={openEdit}
          empty={
            <EmptyState
              icon={UserCog}
              title={search || role ? 'No users match' : 'No users yet'}
              description="Users sign in with their mobile number and password — the admin creates every account."
            >
              <Button size="lg" onClick={openCreate}>
                <Plus data-icon="inline-start" /> New user
              </Button>
            </EmptyState>
          }
        />
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit user' : 'Create user'}
        description={drawer?.editingId ? drawer.form.mobile : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveLabel={drawer?.editingId ? 'Save changes' : 'Save'}
      >
        {drawer && (
          <UserForm
            form={drawer.form}
            errors={drawer.errors}
            editing={Boolean(drawer.editingId)}
            onChange={(field, value) => setDrawer((d) => ({ ...d, form: { ...d.form, [field]: value }, errors: { ...d.errors, [field]: undefined } }))}
            userOptions={userOptions}
            regions={regions}
            cities={cities}
            routes={routes}
            categories={INITIAL_CATEGORIES}
            brands={INITIAL_BRANDS}
          />
        )}
      </FormDrawer>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import users"
        requiredNote={USER_IMPORT_REQUIRED}
        onDownloadSample={downloadSample}
        onSubmit={importFile}
      />
    </div>
  )
}
