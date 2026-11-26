import { useEffect, useState } from 'react'
import { Building2, FileText, Loader2, Receipt, Smartphone } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Notice } from '@/components/data/Notice'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  companySaved,
  fetchSettings,
  mobileAppSaved,
  saveSettingsGroup,
  selectBank,
  selectCompany,
  selectCompanySettings,
  selectInvoiceSettings,
  selectMobileApp,
  selectOffice,
} from '@/store/settingsSlice'
import { selectUsers } from '@/store/usersSlice'
import { BillingSettings } from './components/BillingSettings'
import { BillTemplate } from './components/BillTemplate'
import { CompanySettings } from './components/CompanySettings'
import { MobileAppSettings } from './components/MobileAppSettings'
import { cleanHolidays, validateCompany } from './settingsModel'

const TABS = [
  { id: 'company', label: 'Company', icon: Building2, title: 'Company details' },
  { id: 'billing', label: 'Billing', icon: Receipt, title: 'Billing settings' },
  { id: 'template', label: 'Bill template', icon: FileText, title: 'What the printed bill says' },
  { id: 'mobile', label: 'Mobile app', icon: Smartphone, title: 'Mobile app settings' },
]

/** Settings — company details and what the field app asks for. */
export default function Settings() {
  const dispatch = useDispatch()
  const savedCompany = useSelector(selectCompany)
  const savedOffice = useSelector(selectOffice)
  const savedBank = useSelector(selectBank)
  const savedMobileApp = useSelector(selectMobileApp)
  const savedInvoice = useSelector(selectInvoiceSettings)
  const savedBillCompany = useSelector(selectCompanySettings)
  const staff = useSelector(selectUsers).filter((user) => user.role !== 'ADMIN')

  const [tab, setTab] = useState('company')
  const [form, setForm] = useState({ company: savedCompany, office: savedOffice, bank: savedBank })
  const [mobileApp, setMobileApp] = useState(savedMobileApp)
  const [invoice, setInvoice] = useState(savedInvoice)
  const [template, setTemplate] = useState({ company: savedBillCompany, bank: savedBank })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    dispatch(fetchSettings())
  }, [dispatch])

  // The server owns the bank and billing groups. When a load or a save brings
  // new values in, the draft on screen is reset to them — adjusted during the
  // render that notices, rather than in an effect that would render twice.
  const [serverCopy, setServerCopy] = useState({
    bank: savedBank,
    invoice: savedInvoice,
    company: savedBillCompany,
    mobileApp: savedMobileApp,
  })
  if (
    serverCopy.bank !== savedBank ||
    serverCopy.invoice !== savedInvoice ||
    serverCopy.company !== savedBillCompany ||
    serverCopy.mobileApp !== savedMobileApp
  ) {
    setServerCopy({ bank: savedBank, invoice: savedInvoice, company: savedBillCompany, mobileApp: savedMobileApp })
    if (serverCopy.bank !== savedBank) setForm((f) => ({ ...f, bank: savedBank }))
    if (serverCopy.invoice !== savedInvoice) setInvoice(savedInvoice)
    // Otherwise the switches would show this screen's defaults until somebody
    // reloaded, and an admin could read "photo optional" off a tab while the
    // API was already refusing check-ins without one.
    if (serverCopy.mobileApp !== savedMobileApp) setMobileApp(savedMobileApp)
    setTemplate({ company: savedBillCompany, bank: savedBank })
  }

  const changeInvoice = (field, value) => setInvoice((state) => ({ ...state, [field]: value }))

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

    if (tab === 'template') {
      const [co, bk] = await Promise.all([
        dispatch(saveSettingsGroup({ group: 'company', patch: template.company })),
        dispatch(saveSettingsGroup({ group: 'bank', patch: template.bank })),
      ])
      setSaving(false)
      if (saveSettingsGroup.rejected.match(co) || saveSettingsGroup.rejected.match(bk)) {
        return setNotice({ tone: 'danger', message: 'Could not save the bill template.' })
      }
      return setNotice({ tone: 'success', message: 'Bill template saved — every bill prints with it from now on.' })
    }

    if (tab === 'billing') {
      const result = await dispatch(saveSettingsGroup({ group: 'invoice', patch: invoice }))
      setSaving(false)
      if (saveSettingsGroup.rejected.match(result)) {
        return setNotice({ tone: 'danger', message: result.payload?.message ?? 'Could not save the billing settings.' })
      }
      return setNotice({ tone: 'success', message: 'Billing settings saved — they apply to every bill from now on.' })
    }

    if (tab === 'company') {
      // The bank is the server's; the rest of this tab is still local.
      const result = await dispatch(saveSettingsGroup({ group: 'bank', patch: form.bank }))
      if (saveSettingsGroup.rejected.match(result)) {
        setSaving(false)
        return setNotice({ tone: 'danger', message: result.payload?.message ?? 'Could not save the bank details.' })
      }
      dispatch(companySaved({ ...form, office: { ...form.office, holidays: cleanHolidays(form.office.holidays) } }))
    } else {
      // These are not a preference the panel keeps to itself — the API reads
      // them on every check-in. "Require a photo" switched on here is what
      // makes the app refuse a check-in without a selfie, so it has to reach
      // the server rather than live in this tab until the next reload.
      const result = await dispatch(saveSettingsGroup({ group: 'mobileApp', patch: mobileApp }))
      setSaving(false)
      if (saveSettingsGroup.rejected.match(result)) {
        return setNotice({ tone: 'danger', message: result.payload?.message ?? 'Could not save the mobile app settings.' })
      }
      dispatch(mobileAppSaved(mobileApp))
      return setNotice({
        tone: 'success',
        message: mobileApp.photoAtCheckIn
          ? 'Mobile app settings saved — a check-in now needs a photo.'
          : 'Mobile app settings saved — a photo at check-in is optional.',
      })
    }

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
          ) : tab === 'billing' ? (
            <BillingSettings invoice={invoice} onChange={changeInvoice} />
          ) : tab === 'template' ? (
            <BillTemplate
              company={template.company}
              bank={template.bank}
              onChange={(key, value) => setTemplate((t) => ({ ...t, company: { ...t.company, [key]: value } }))}
              onChangeBank={(key, value) => setTemplate((t) => ({ ...t, bank: { ...t.bank, [key]: value } }))}
            />
          ) : (
            <MobileAppSettings mobileApp={mobileApp} staff={staff} onChange={(field, value) => setMobileApp((m) => ({ ...m, [field]: value }))} />
          )}
        </div>
      </div>
    </div>
  )
}
