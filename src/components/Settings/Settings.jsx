import { useState } from 'react'
import { Building2, Loader2, Smartphone } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Notice } from '@/components/data/Notice'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { companySaved, mobileAppSaved, selectBank, selectCompany, selectMobileApp, selectOffice } from '@/store/settingsSlice'
import { CompanySettings } from './components/CompanySettings'
import { MobileAppSettings } from './components/MobileAppSettings'
import { cleanHolidays, validateCompany } from './settingsModel'

const TABS = [
  { id: 'company', label: 'Company', icon: Building2, title: 'Company details' },
  { id: 'mobile', label: 'Mobile app', icon: Smartphone, title: 'Mobile app settings' },
]

/** Settings — company details and what the field app asks for. */
export default function Settings() {
  const dispatch = useDispatch()
  const savedCompany = useSelector(selectCompany)
  const savedOffice = useSelector(selectOffice)
  const savedBank = useSelector(selectBank)
  const savedMobileApp = useSelector(selectMobileApp)

  const [tab, setTab] = useState('company')
  const [form, setForm] = useState({ company: savedCompany, office: savedOffice, bank: savedBank })
  const [mobileApp, setMobileApp] = useState(savedMobileApp)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const change = (group, field, value) => {
    setForm((f) => ({ ...f, [group]: { ...f[group], [field]: value } }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const save = async () => {
    if (tab === 'company') {
      const found = validateCompany(form)
      setErrors(found)
      if (Object.keys(found).some((k) => found[k])) {
        document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 350)) // mock network
    if (tab === 'company') dispatch(companySaved({ ...form, office: { ...form.office, holidays: cleanHolidays(form.office.holidays) } }))
    else dispatch(mobileAppSaved(mobileApp))
    setSaving(false)
    setNotice({
      tone: 'success',
      message: tab === 'company' ? `Company details saved — office hours ${form.office.start} to ${form.office.end} now apply to Attendance.` : 'Mobile app settings saved.',
    })
  }

  const active = TABS.find((t) => t.id === tab)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Settings</h1>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-mint-pale bg-white p-2 lg:h-fit lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id)
                setErrors({})
              }}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors',
                tab === id ? 'bg-mint-pale text-green-deep' : 'text-ink hover:bg-bg',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-mint-pale bg-white px-5 py-4">
            <h2 className="text-lg font-extrabold text-black sm:text-xl">{active.title}</h2>
            <Button size="lg" onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" data-icon="inline-start" />} Save
            </Button>
          </div>

          {tab === 'company' ? (
            <CompanySettings company={form.company} office={form.office} bank={form.bank} errors={errors} onChange={change} />
          ) : (
            <MobileAppSettings mobileApp={mobileApp} onChange={(field, value) => setMobileApp((m) => ({ ...m, [field]: value }))} />
          )}
        </div>
      </div>
    </div>
  )
}
