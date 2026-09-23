import { BadgeIndianRupee, CalendarClock, HelpCircle } from 'lucide-react'
import { MultiSelect } from '@/components/form/MultiSelect'
import { Switch } from '@/components/form/Switch'
import { pickAccess, withAllOption } from '@/components/Users/Users/userModel'
import { APP_MODULES } from '../../settingsModel'

/** A switch row with a short explanation behind the ? */
function ToggleRow({ id, label, hint, checked, onCheckedChange, children }) {
  return (
    <div className="border-b border-mint-pale last:border-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {label}
          <span title={hint} aria-label={hint} className="text-ink-muted">
            <HelpCircle className="size-3.5" />
          </span>
        </label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {children && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

/** A card of switches with a title and icon. */
function Card({ icon: Icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
      <header className="flex items-center gap-3 border-b border-mint-pale px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-mint-pale">
          <Icon className="size-4 text-green-deep" />
        </span>
        <h3 className="text-base font-bold text-black">{title}</h3>
      </header>
      {children}
    </section>
  )
}

/** Settings › Mobile app — what the field app asks for and what it shows. */
export function MobileAppSettings({ mobileApp, staff, onChange }) {
  return (
    <div className="space-y-5">
      <Card icon={CalendarClock} title="Attendance">
        <ToggleRow
          id="app-mandatory"
          label="Turn on mandatory attendance"
          hint="Staff must check in on the app before these screens open."
          checked={mobileApp.mandatoryAttendance}
          onCheckedChange={(on) => onChange('mandatoryAttendance', on)}
        >
          {mobileApp.mandatoryAttendance && (
            <MultiSelect
              id="app-modules"
              aria-label="Screens that need a check-in"
              placeholder="Add a screen"
              value={mobileApp.mandatoryModules}
              onChange={(v) => onChange('mandatoryModules', v)}
              options={APP_MODULES}
            />
          )}
        </ToggleRow>

        <ToggleRow
          id="app-photo"
          label="Require a photo at check-in"
          hint="The app asks for a selfie when someone checks in."
          checked={mobileApp.photoAtCheckIn}
          onCheckedChange={(on) => onChange('photoAtCheckIn', on)}
        />
        <ToggleRow
          id="app-track-odo"
          label="Track odometer reading"
          hint="Show odometer boxes at check-in and check-out, to work out distance travelled."
          checked={mobileApp.trackOdometer}
          onCheckedChange={(on) => {
            onChange('trackOdometer', on)
            if (!on) onChange('requireOdometer', false)
          }}
        />
        <ToggleRow
          id="app-require-odo"
          label="Require odometer reading"
          hint="Staff cannot check in or out until they enter the reading. Needs odometer tracking to be on."
          checked={mobileApp.requireOdometer}
          onCheckedChange={(on) => {
            onChange('requireOdometer', on)
            if (on) onChange('trackOdometer', true)
          }}
        />
      </Card>

      <Card icon={BadgeIndianRupee} title="Salary">
        <ToggleRow
          id="app-show-salary"
          label="Show salary to the user"
          hint="Staff see their own payout bill — salary, TA/DA and incentive — in the app. Pick who below."
          checked={mobileApp.showSalary}
          onCheckedChange={(on) => onChange('showSalary', on)}
        >
          {mobileApp.showSalary && (
            <MultiSelect
              id="app-salary-users"
              aria-label="Staff who can see their salary"
              placeholder="Add a user"
              value={mobileApp.salaryVisibleTo}
              onChange={(next) => onChange('salaryVisibleTo', pickAccess(next))}
              options={withAllOption('All staff', staff.map((user) => ({ value: user.id, label: user.name, hint: user.designation })))}
            />
          )}
        </ToggleRow>

        {mobileApp.showSalary && (
          <ToggleRow
            id="app-salary-perday"
            label="Per-day tracking"
            hint="Staff also see the day-by-day working — days present, kilometres and what each day earned — not just the month's total."
            checked={mobileApp.salaryPerDayTracking}
            onCheckedChange={(on) => onChange('salaryPerDayTracking', on)}
          />
        )}
      </Card>
    </div>
  )
}
