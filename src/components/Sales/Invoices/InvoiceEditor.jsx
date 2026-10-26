import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Printer, Send } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "@/components/common/Modal";
import { FormDrawer } from "@/components/data/FormDrawer";
import { BillTemplate } from "@/components/Settings/components/BillTemplate";
import { useToast } from "@/components/common/Toast";
import { cn } from "@/lib/utils";
import { SearchSelect } from "@/components/form/SearchSelect";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useItems";
import { formatINR } from "@/lib/format";
import * as invoicesService from "@/services/invoicesService";
import {
  fetchDistributors,
  selectDistributors,
} from "@/store/distributorsSlice";
import { issueInvoice, saveInvoice } from "@/store/invoicesSlice";
import {
  fetchSettings,
  selectBank,
  saveSettingsGroup,
  selectCompanySettings,
  selectInvoiceSettings,
} from "@/store/settingsSlice";
import { fetchBatches, selectBatches } from "@/store/stockSlice";
import { usePriceTiers } from "@/hooks/usePriceTiers";
import { InvoiceLines } from "./components/InvoiceLines";
import { BILL_COPIES } from "./components/InvoicePrint/billFormat";
import { InvoicePrint } from "./components/InvoicePrint";
import {
  emptyInvoiceForm,
  formToPayload,
  invoiceToForm,
  previewLine,
  previewTotals,
  validateInvoiceForm,
} from "./invoiceModel";

/** Form field → input id, to focus the first problem on Save. */
const FIELD_IDS = {
  invoiceNo: "invoice-no",
  distributorId: "invoice-distributor",
  invoiceDate: "invoice-date",
  creditDays: "invoice-credit-days",
};

/**
 * Making a bill.
 *
 * **Save records it. Issue sends it.** Saving only writes the paperwork;
 * issuing is what takes the stock out of the factory, under this invoice
 * number, and it asks first — "एक बार गलती से हो गया तो वो तो चला गया".
 *
 * The money is the server's: it prices every line from the distributor's own
 * rate column, takes the GST back out of that price, and splits the tax into
 * CGST + SGST or IGST depending on where the firm is. What is shown here while
 * typing is the server's answer from the last save.
 */
/** An input sitting on the bill: plain, boxed, the sheet's own type size. */
const FIELD =
  "w-full rounded-[2px] border border-black/40 bg-white px-1 py-px text-[9px] outline-none focus:border-green-deep disabled:border-black/20 disabled:bg-bg disabled:text-ink-muted";

export default function InvoiceEditor() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const distributors = useSelector(selectDistributors);
  const batches = useSelector(selectBatches);
  const items = useItems();
  const tiers = usePriceTiers();
  // The bank the money goes to and what a bill must carry, both the admin's.
  const bank = useSelector(selectBank);
  const companySettings = useSelector(selectCompanySettings);

  /**
   * The letterhead, edited without leaving a half-typed bill behind. The
   * client wanted it reachable from here — "चेंज टेम्पलेट करके… टेम्प्लेट में
   * क्लिक करोगे तो पूरा टेम्पलेट खुल जाएगा" — and the sheet behind the drawer
   * redraws the moment it is saved.
   */
  // Which copy the PDF should carry. All three unless one is picked.
  const [copyChoice, setCopyChoice] = useState("all");

  const [template, setTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const openTemplate = () =>
    setTemplate({ company: { ...companySettings }, bank: { ...bank } });

  const saveTemplate = async () => {
    setSavingTemplate(true);
    const [co, bk] = await Promise.all([
      dispatch(
        saveSettingsGroup({ group: "company", patch: template.company }),
      ),
      dispatch(saveSettingsGroup({ group: "bank", patch: template.bank })),
    ]);
    setSavingTemplate(false);
    if (
      saveSettingsGroup.rejected.match(co) ||
      saveSettingsGroup.rejected.match(bk)
    ) {
      return toast({ tone: "danger", title: "Could not save the template" });
    }
    setTemplate(null);
    toast({
      tone: "success",
      title: "Template saved",
      description: "Every bill prints with it from now on.",
    });
  };
  const rules = useSelector(selectInvoiceSettings);

  const [form, setForm] = useState(emptyInvoiceForm);
  // A new bill opens on the house terms; once it has its own they are left be.
  const [termsSeeded, setTermsSeeded] = useState(false);
  if (!invoiceId && !termsSeeded && rules.terms && !form.terms) {
    setTermsSeeded(true);
    setForm((f) => ({ ...f, terms: rules.terms }));
  }
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null); // the bill as the server last priced it
  const [loading, setLoading] = useState(Boolean(invoiceId));
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // "ऐसे फॉर्मेट में दिखाई दीजिये" — a bill that already exists opens as the
  // document, filled in, and the form is a click away behind Edit.
  const [reviewing, setReviewing] = useState(Boolean(invoiceId));

  useEffect(() => {
    dispatch(fetchDistributors());
    dispatch(fetchBatches({}));
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;
    invoicesService
      .getInvoice(invoiceId)
      .then((invoice) => {
        if (!alive) return;
        setSaved(invoice);
        setForm(invoiceToForm(invoice));
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field])
      setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const firm = distributors.find((row) => row.id === form.distributorId);
  const issued = saved && saved.status !== "PENDING";
  // Whether what is on screen still matches what the server last priced.
  const isDirty =
    !saved ||
    JSON.stringify(formToPayload(form)) !==
      JSON.stringify(formToPayload(invoiceToForm(saved)));

  /**
   * Whether there is anything to lose. A bill that has been typed into is
   * worth warning about; an untouched Create screen is not — warning there
   * would stop the admin leaving a form they never started.
   */
  const hasTyped =
    JSON.stringify(formToPayload(form)) !==
    JSON.stringify(formToPayload(emptyInvoiceForm()));
  const worthKeeping = saved ? isDirty : hasTyped;

  const batchNosOf = (line) =>
    (line.batches ?? [])
      .map((row) => batches.find((b) => b.id === row.batchId)?.batchNo)
      .filter(Boolean)
      .join(", ");

  // "डू यू वांट टू रिफ्रेश? देन यू लूज़" — a half-typed bill is easy to lose to
  // a stray reload, so the browser asks first. Only while something is unsaved.
  useEffect(() => {
    if (!worthKeeping || issued) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [worthKeeping, issued]);

  /** Which copy the PDF carries — shown under the GSTIN, where it prints. */
  const copyPicker = (
    <select
      id="invoice-copy"
      aria-label="Which copy to print"
      value={copyChoice}
      onChange={(e) => setCopyChoice(e.target.value)}
      className="mt-0.5 rounded-[2px] border border-black/40 bg-white px-1 py-px text-[9px] outline-none focus:border-green-deep print:hidden"
    >
      {BILL_COPIES.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  /** Only batches of that item, and only ones with something in them. */
  const batchesFor = (itemId) =>
    batches.filter((batch) => batch.itemId === itemId && batch.available > 0);
  const availableOf = (batchId) =>
    batches.find((row) => row.id === batchId)?.available ?? 0;

  /** The bill as it stands, priced in the browser the way the server will. */
  const totals = previewTotals(
    form.lines
      .filter((line) => line.itemId)
      .map((line) =>
        previewLine({
          item: items.find((row) => row.id === line.itemId),
          tier: firm?.priceTier,
          tiers,
          quantity: line.quantity,
        }),
      ),
  );

  /**
   * The bill as it stands, shaped the way the printed sheet wants it — so the
   * create screen can BE the bill rather than a form that looks nothing like
   * it. "डायरेक्ट बिल पे ही ऐड करें": the sheet is rendered once and the inputs
   * sit inside it, which is also why the two can never drift apart.
   */
  const interState = Boolean(firm?.state && firm.state.toUpperCase() !== "UP");
  const half = Math.round(totals.taxAmount * 50) / 100;
  const asBill = {
    ...form,
    priceTier: firm?.priceTier ?? "",
    shipTo: form.shipTo,
    proforma: form.proforma,
    interState,
    distributor: firm ?? {},
    dueDate: saved?.dueDate ?? "",
    ...totals,
    cgst: interState ? 0 : half,
    sgst: interState ? 0 : Math.round((totals.taxAmount - half) * 100) / 100,
    igst: interState ? totals.taxAmount : 0,
    lines: form.lines
      .filter((line) => line.itemId)
      .map((line) => {
        const item = items.find((row) => row.id === line.itemId);
        const priced =
          previewLine({
            item,
            tier: firm?.priceTier,
            tiers,
            quantity: line.quantity,
          }) ?? {};
        return {
          id: line.itemId,
          itemName: item?.name ?? "",
          quantity: line.quantity,
          gstRate: priced.gst ?? 0,
          rate: priced.rate ?? 0,
          taxableValue: priced.taxableValue ?? 0,
          total: priced.total ?? 0,
          batches: batchNosOf(line)
            .split(", ")
            .filter(Boolean)
            .map((batchNo) => ({ batchNo })),
        };
      }),
  };

  /**
   * `goBack` is false only when Issue calls this first — it needs the saved
   * bill in hand before it can send it, and leaving the page mid-way would
   * lose the issue.
   */
  const save = async ({ goBack = true } = {}) => {
    const found = validateInvoiceForm(form, availableOf);
    if (Object.keys(found).length) {
      setErrors(found);
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus();
      return null;
    }

    setSaving(true);
    const result = await dispatch(
      saveInvoice({ id: invoiceId, form: formToPayload(form) }),
    );
    setSaving(false);

    if (saveInvoice.rejected.match(result)) {
      const { message, details } = result.payload;
      if (details) setErrors((current) => ({ ...current, ...details }));
      toast({ tone: "danger", title: "Could not save", description: message });
      return null;
    }

    const invoice = result.payload.invoice;
    setSaved(invoice);

    if (goBack) {
      navigate("/admin/sales/invoices", {
        state: {
          notice: {
            tone: "success",
            message: `Invoice ${invoice.invoiceNo} saved — ${formatINR(invoice.total)}.`,
          },
          highlightId: invoice.id,
        },
      });
    }
    return invoice;
  };

  const issue = async () => {
    setConfirming(false);
    // Save whatever is on screen first, so what goes out is what is shown.
    const invoice =
      saved?.status === "PENDING" && !isDirty
        ? saved
        : await save({ goBack: false });
    if (!invoice) return;

    setSaving(true);
    const result = await dispatch(issueInvoice({ id: invoice.id }));
    setSaving(false);

    if (issueInvoice.rejected.match(result)) {
      return toast({
        tone: "danger",
        title: "Could not issue",
        description: result.payload.message,
      });
    }
    setSaved(result.payload.invoice);
    dispatch(fetchBatches({}));
    navigate("/admin/sales/invoices", {
      state: {
        notice: {
          tone: "success",
          message: `Invoice ${result.payload.invoice.invoiceNo} issued — the stock is out of the factory.`,
        },
        highlightId: result.payload.invoice.id,
      },
    });
  };

  if (loading) {
    return (
      <div
        className="grid min-h-60 place-items-center"
        role="status"
        aria-label="Loading invoice"
      >
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link
            to="/admin/sales/invoices"
            className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Sales Invoices
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
            {invoiceId ? "Edit sales invoice" : "Create Sales Invoice"}
            {form.invoiceNo && (
              <span className="ml-2 font-mono text-base font-medium text-ink-muted">
                {form.invoiceNo}
              </span>
            )}
          </h1>
          <p className="text-xs text-ink-muted">
            {issued
              ? `Issued · ${saved.status.toLowerCase()}`
              : "Save records the bill. Issue takes the stock out of the factory."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Prints the sheet below and nothing else — the browser's own Save
              as PDF. It works on a bill that has not been saved yet, because
              what is on screen already is the bill. */}
          {/* A saved bill prints through the standalone sheet, which can lay
              out all three copies. An unsaved one prints what is on screen. */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() =>
              saved
                ? window.open(
                    `/admin/sales/invoices/${saved.id}/print?print=1&copy=${copyChoice}`,
                    "_blank",
                    "noopener",
                  )
                : window.print()
            }
          >
            <Printer data-icon="inline-start" /> PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate("/admin/sales/invoices")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={openTemplate}
          >
            <Pencil data-icon="inline-start" /> Edit template
          </Button>
          {saved && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setReviewing((on) => !on)}
              >
                {reviewing ? (
                  <Pencil data-icon="inline-start" />
                ) : (
                  <Printer data-icon="inline-start" />
                )}
                {reviewing ? "Edit" : "View bill"}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={save}
            disabled={saving || issued}
          >
            {saving && (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            )}
            Save
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => setConfirming(true)}
            disabled={saving || issued}
          >
            <Send data-icon="inline-start" /> Issue
          </Button>
        </div>
      </div>

      {reviewing && saved ? (
        <div
          id="bill-sheet"
          className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-6"
        >
          <InvoicePrint
            invoice={saved}
            bank={bank}
            company={companySettings}
            taxRate={rules.defaultGstRate}
            show={{
              vehicleNo: rules.showVehicleNo !== false,
              ewayBillNo: rules.showEwayBill !== false,
            }}
            slots={{ copyChoice: copyPicker }}
          />
        </div>
      ) : (
        <div
          id="bill-sheet"
          className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-6"
        >
          <InvoicePrint
            invoice={asBill}
            bank={bank}
            company={companySettings}
            taxRate={rules.defaultGstRate}
            show={{
              vehicleNo: rules.showVehicleNo !== false,
              ewayBillNo: rules.showEwayBill !== false,
            }}
            slots={{
              copyChoice: copyPicker,
              invoiceNo: (
                <input
                  id="invoice-no"
                  aria-label="Invoice number"
                  placeholder="NP/26-27/673"
                  value={form.invoiceNo}
                  onChange={(e) => update("invoiceNo", e.target.value)}
                  disabled={issued || Boolean(saved)}
                  className={cn(
                    FIELD,
                    errors.invoiceNo && "border-destructive",
                  )}
                />
              ),
              invoiceDate: (
                <input
                  id="invoice-date"
                  type="date"
                  aria-label="Invoice date"
                  value={form.invoiceDate}
                  onChange={(e) => update("invoiceDate", e.target.value)}
                  disabled={issued || Boolean(saved)}
                  className={FIELD}
                />
              ),
              extraMeta: (
                <div className="space-y-[1px] print:hidden">
                  {rules.showCreditPeriod !== false && (
                  <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                    <span>CREDIT PERIOD</span>
                    <span>:</span>
                    <span className="flex items-center gap-1">
                      <input
                        id="invoice-credit-days"
                        aria-label="Credit period in days"
                        inputMode="numeric"
                        value={form.creditDays}
                        onChange={(e) =>
                          update(
                            "creditDays",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        disabled={issued}
                        className={cn(FIELD, "w-14")}
                      />
                      days
                    </span>
                  </div>
                  )}
                  <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                    <span>TOTAL NAG</span>
                    <span>:</span>
                    <input
                      id="invoice-packages"
                      aria-label="Number of packages"
                      inputMode="numeric"
                      placeholder="7"
                      value={form.packages}
                      onChange={(e) =>
                        update("packages", e.target.value.replace(/\D/g, ""))
                      }
                      disabled={issued}
                      className={cn(FIELD, "w-14")}
                    />
                  </div>
                  <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
                    <span>COMMENT</span>
                    <span>:</span>
                    <input
                      id="invoice-note"
                      aria-label="Comment"
                      placeholder="Anything to note"
                      value={form.note}
                      onChange={(e) => update("note", e.target.value)}
                      disabled={issued}
                      className={FIELD}
                    />
                  </div>
                  {saved && !issued && (
                    <p className="pt-0.5 text-[8px] text-ink-muted">
                      Settled when the bill was made
                    </p>
                  )}
                </div>
              ),
              billTo: (
                <div className="space-y-1.5">
                  {/* The picker is for the screen; paper gets the name. */}
                  {firm && (
                    <p className="hidden font-bold print:block">
                      M/S {firm.name}
                    </p>
                  )}
                  <SearchSelect
                    id="invoice-distributor"
                    aria-label="Distributor"
                    placeholder="Enter distributor name"
                    limit={10}
                    options={distributors.map((row) => ({
                      value: row.id,
                      label: row.name,
                      hint: row.city || row.mobile,
                    }))}
                    value={form.distributorId}
                    onChange={(v) => update("distributorId", v)}
                    invalid={Boolean(errors.distributorId)}
                    disabled={issued || Boolean(saved)}
                  />
                  {errors.distributorId && (
                    <p className="text-xs font-medium text-destructive">
                      {errors.distributorId}
                    </p>
                  )}
                  {firm && (
                    <div className="text-[11px] leading-snug">
                      {firm.address && (
                        <p className="whitespace-pre-line">{firm.address}</p>
                      )}
                      <p>
                        {[firm.state, firm.pincode].filter(Boolean).join(" · ")}
                      </p>
                      {firm.mobile && <p>Ph {firm.mobile}</p>}
                      <p className="font-semibold">
                        {firm.gstin
                          ? `GSTIN: ${firm.gstin}`
                          : "No GSTIN (unregistered)"}
                      </p>
                    </div>
                  )}
                </div>
              ),
              // "+ New" belongs only here: the bill is always to a distributor
              // we know, but the goods may go to a godown we do not.
              shipTo: (
                <div className="space-y-1.5">
                  {form.shipTo ? (
                    <>
                      <textarea
                        id="invoice-ship-to"
                        aria-label="Ship to address"
                        rows={4}
                        value={form.shipTo}
                        onChange={(e) => update("shipTo", e.target.value)}
                        disabled={issued}
                        placeholder={"M/S ...\nStreet, area\nCity, State, PIN"}
                        className={cn(FIELD, "resize-y")}
                      />
                      <button
                        type="button"
                        onClick={() => update("shipTo", "")}
                        disabled={issued}
                        className="text-[9px] font-semibold text-green-deep underline print:hidden"
                      >
                        Same as billing
                      </button>
                    </>
                  ) : (
                    <>
                      {firm ? (
                        <div className="text-[9px] leading-snug">
                          <p className="font-bold">M/S {firm.name}</p>
                          {firm.address && (
                            <p className="whitespace-pre-line">
                              {firm.address}
                            </p>
                          )}
                          <p>
                            {[firm.state, firm.pincode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[9px] text-ink-muted">
                          Same as billing
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "shipTo",
                            firm
                              ? `M/S ${firm.name}\n${firm.address ?? ""}`
                              : "",
                          )
                        }
                        disabled={issued}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-deep underline print:hidden"
                      >
                        + New address
                      </button>
                    </>
                  )}
                </div>
              ),
              transport: (
                <input
                  id="invoice-transport"
                  aria-label="Transport"
                  placeholder="FOR TPT BY AUTO"
                  value={form.transport}
                  onChange={(e) =>
                    update("transport", e.target.value.toUpperCase())
                  }
                  disabled={issued}
                  className={FIELD}
                />
              ),
              vehicleNo: (
                <input
                  id="invoice-vehicle"
                  aria-label="Vehicle number"
                  placeholder="UP-14-RT-5632"
                  value={form.vehicleNo}
                  onChange={(e) =>
                    update("vehicleNo", e.target.value.toUpperCase())
                  }
                  disabled={issued}
                  className={cn(
                    FIELD,
                    errors.vehicleNo && "border-destructive",
                  )}
                />
              ),
              ewayBillNo: (
                <input
                  id="invoice-eway"
                  aria-label="E-way bill number"
                  placeholder="1234 5678 9012"
                  value={form.ewayBillNo}
                  onChange={(e) =>
                    update("ewayBillNo", e.target.value.toUpperCase())
                  }
                  disabled={issued}
                  className={cn(
                    FIELD,
                    errors.ewayBillNo && "border-destructive",
                  )}
                />
              ),
              station: (
                <input
                  id="invoice-station"
                  aria-label="Station"
                  placeholder="RAMPUR"
                  value={form.station}
                  onChange={(e) =>
                    update("station", e.target.value.toUpperCase())
                  }
                  disabled={issued}
                  className={FIELD}
                />
              ),
              lines: (
                <InvoiceLines
                  form={form}
                  errors={errors}
                  items={items}
                  batchesFor={batchesFor}
                  onChange={update}
                  tier={firm?.priceTier}
                  tiers={tiers}
                  disabled={issued}
                  interState={interState}
                  taxRate={rules.defaultGstRate}
                />
              ),
            }}
          />
          {saved && isDirty && (
            <p className="pt-2 text-right text-xs text-warning-ink">
              Not saved yet.
            </p>
          )}
        </div>
      )}

      <FormDrawer
        open={Boolean(template)}
        onOpenChange={(open) => !open && setTemplate(null)}
        title="Edit bill template"
        description="What every printed bill says. The layout stays the same; these are the words on it."
        onSubmit={saveTemplate}
        saving={savingTemplate}
        saveLabel="Save template"
      >
        {template && (
          <BillTemplate
            company={template.company}
            bank={template.bank}
            onChange={(key, value) =>
              setTemplate((t) => ({
                ...t,
                company: { ...t.company, [key]: value },
              }))
            }
            onChangeBank={(key, value) =>
              setTemplate((t) => ({ ...t, bank: { ...t.bank, [key]: value } }))
            }
          />
        )}
      </FormDrawer>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Issue this invoice?"
        description="The stock leaves the factory and goes onto the distributor's books. This cannot be undone — a mistake has to be cancelled afterwards."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={issue}>Yes, issue it</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          {form.lines.filter((line) => line.itemId).length} item
          {form.lines.filter((line) => line.itemId).length === 1
            ? ""
            : "s"} to {firm?.name ?? "the distributor"}
          {form.invoiceNo ? ` on ${form.invoiceNo}` : ""}.
        </p>
      </Modal>
    </div>
  );
}
