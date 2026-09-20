import { Minus } from 'lucide-react'
import { ImageUploader } from '@/components/form/ImageUploader'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { Checkbox } from '@/components/ui/checkbox'
import { BANKS, CURRENCIES, STATE_OPTIONS, TIMEZONES, WEEK_DAYS } from '../../settingsModel'
import { CollapsibleCard } from '../CollapsibleCard'

/** Settings › Company: who you are, your working hours and your bank. */
export function CompanySettings({ company, office, bank, errors, onChange }) {
  const set = (group, field) => (value) => onChange(group, field, value)
  const setHoliday = (index, changes) =>
    set('office', 'holidays')(office.holidays.map((h, i) => (i === index ? { ...h, ...changes } : h)))
  const toggleDay = (day) =>
    onChange('office', 'workingDays', office.workingDays.includes(day) ? office.workingDays.filter((d) => d !== day) : [...office.workingDays, day])

  return (
    <div className="space-y-5">
      <CollapsibleCard title="Basic details">
        <TextField id="co-name" label="Name" required size="md" value={company.name} onChange={(e) => set('company', 'name')(e.target.value)} error={errors.name} />
        <TextField
          id="co-mobile"
          label="Mobile"
          required
          size="md"
          inputMode="numeric"
          maxLength={10}
          value={company.mobile}
          onChange={(e) => set('company', 'mobile')(e.target.value.replace(/\D/g, ''))}
          error={errors.mobile}
        />
        <TextField id="co-email" label="Email" size="md" type="email" value={company.email} onChange={(e) => set('company', 'email')(e.target.value)} error={errors.email} />
        <TextAreaField id="co-address" label="Address" rows={2} value={company.address} onChange={(e) => set('company', 'address')(e.target.value)} />
        <div>
          <label htmlFor="co-state" className="mb-2 block text-sm font-semibold text-ink">State of supply</label>
          <SearchSelect id="co-state" aria-label="State of supply" placeholder="Select state" options={STATE_OPTIONS} value={company.stateCode} onChange={set('company', 'stateCode')} />
        </div>
        <TextField
          id="co-gstin"
          label="GSTIN"
          size="md"
          maxLength={15}
          value={company.gstin}
          onChange={(e) => set('company', 'gstin')(e.target.value.toUpperCase())}
          error={errors.gstin}
        />
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Type</p>
          <p className="flex h-11 items-center rounded-lg border border-mint-pale bg-bg px-3.5 text-sm font-semibold text-ink">{company.type}</p>
        </div>
        <SelectField id="co-currency" label="Currency" options={CURRENCIES} value={company.currency} onChange={set('company', 'currency')} />
        <SelectField id="co-timezone" label="Timezone" options={TIMEZONES} value={company.timezone} onChange={set('company', 'timezone')} />
      </CollapsibleCard>

      <CollapsibleCard title="Upload logo and signature">
        <ImageUploader label="Upload logo" images={company.logo} onChange={set('company', 'logo')} max={1} />
        <ImageUploader label="Upload Signature" images={company.signature} onChange={set('company', 'signature')} max={1} />
      </CollapsibleCard>

      <CollapsibleCard title="Office working hours">
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink">Working days</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {WEEK_DAYS.map((day) => (
              <label key={day.value} className="flex items-center gap-2 text-sm font-medium text-ink">
                <Checkbox checked={office.workingDays.includes(day.value)} onCheckedChange={() => toggleDay(day.value)} aria-label={day.label} />
                {day.label}
              </label>
            ))}
          </div>
          {errors.workingDays && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.workingDays}</p>}
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink">Work timings</p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label="Office start time"
              value={office.start}
              onChange={(e) => set('office', 'start')(e.target.value)}
              className="h-11 rounded-lg border border-mint bg-white px-3.5 font-mono text-sm outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25"
            />
            <span className="text-ink-muted">→</span>
            <input
              type="time"
              aria-label="Office end time"
              value={office.end}
              onChange={(e) => set('office', 'end')(e.target.value)}
              className="h-11 rounded-lg border border-mint bg-white px-3.5 font-mono text-sm outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">Attendance counts a check-in after {office.start} as late, and a day under these hours as partial.</p>
          {errors.workTimings && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.workTimings}</p>}
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink">Holidays</p>
          <ul className="space-y-2">
            {office.holidays.map((holiday, i) => (
              <li key={holiday.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  aria-label={`Holiday ${i + 1} name`}
                  placeholder="Holiday Name"
                  value={holiday.name}
                  onChange={(e) => setHoliday(i, { name: e.target.value })}
                  className="h-11 w-full rounded-lg border border-mint bg-white px-3.5 text-sm outline-none placeholder:text-ink-muted/70 focus:border-green-fresh focus:ring-3 focus:ring-ring/25 sm:w-64"
                />
                <input
                  type="date"
                  aria-label={`Holiday ${i + 1} date`}
                  value={holiday.date}
                  onChange={(e) => setHoliday(i, { date: e.target.value })}
                  className="h-11 w-full rounded-lg border border-mint bg-white px-3.5 text-sm outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25 sm:w-52"
                />
                <button
                  type="button"
                  aria-label={`Remove holiday ${i + 1}`}
                  onClick={() => set('office', 'holidays')(office.holidays.filter((_, index) => index !== i))}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-mint text-ink-muted hover:border-danger hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <Minus className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {errors.holidays && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.holidays}</p>}
          <button
            type="button"
            onClick={() => set('office', 'holidays')([...office.holidays, { id: `hol-${Date.now()}`, name: '', date: '' }])}
            className="mt-2 h-11 w-full rounded-lg border border-mint bg-white text-sm font-semibold text-ink hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            Add holiday
          </button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Bank details">
        <TextField
          id="bank-account"
          label="Account number"
          size="md"
          inputMode="numeric"
          value={bank.accountNumber}
          onChange={(e) => set('bank', 'accountNumber')(e.target.value.replace(/\D/g, ''))}
          error={errors.accountNumber}
        />
        <TextField id="bank-holder" label="Account holder name" size="md" value={bank.accountHolder} onChange={(e) => set('bank', 'accountHolder')(e.target.value)} />
        <div>
          <label htmlFor="bank-name" className="mb-2 block text-sm font-semibold text-ink">Bank name</label>
          <SearchSelect id="bank-name" aria-label="Bank name" placeholder="Select bank" clearable options={BANKS} value={bank.bankName} onChange={set('bank', 'bankName')} />
        </div>
        <TextField id="bank-branch" label="Branch name" size="md" value={bank.branch} onChange={(e) => set('bank', 'branch')(e.target.value)} />
        <TextField id="bank-ifsc" label="IFSC code" size="md" maxLength={11} value={bank.ifsc} onChange={(e) => set('bank', 'ifsc')(e.target.value.toUpperCase())} error={errors.ifsc} />
        <ImageUploader label="Upload QR Code" images={bank.qr} onChange={set('bank', 'qr')} max={1} />
      </CollapsibleCard>
    </div>
  )
}
