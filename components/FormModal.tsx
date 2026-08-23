"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calculator,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Coins,
  CreditCard,
  FileCheck,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Plus,
  Receipt,
  Save,
  Scissors,
  Store,
  Trash2,
  X
} from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { TABLES } from "@/lib/config";
import type { FieldSchema, RefOption, SheetRow } from "@/lib/types";
import { normalizeDateToIso, parseDateStrict, toInputDateValue } from "@/lib/dates";
import { imagePreviewUrl } from "@/components/BillImageThumbnail";
import { ProjectBudgetAllocator } from "@/components/forms/ProjectBudgetAllocator";
import { BillCategoryBudgetGuardrail } from "@/components/forms/BillCategoryBudgetGuardrail";

type FormPayload = {
  tableName: string;
  schema: FieldSchema[];
  initialValues: SheetRow;
  refOptions: Record<string, RefOption[]>;
};

// Global in-memory cache and in-flight request tracker for schemas & refOptions
const formSchemaCache = new Map<string, FormPayload>();
const formSchemaInFlight = new Map<string, Promise<FormPayload | null>>();

export function clearFormSchemaCache(tableName?: string) {
  if (tableName) {
    const normalized = tableName.trim();
    formSchemaCache.delete(normalized);
  } else {
    formSchemaCache.clear();
  }
}

export async function prefetchFormSchema(tableName: string, forceRefresh = false): Promise<FormPayload | null> {
  if (!tableName) return null;
  const normalized = tableName.trim();
  if (!forceRefresh && formSchemaCache.has(normalized)) {
    return formSchemaCache.get(normalized)!;
  }
  if (formSchemaInFlight.has(normalized)) {
    return formSchemaInFlight.get(normalized)!;
  }

  const promise = fetch(`/api/form-schema?tableName=${encodeURIComponent(normalized)}&_t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to load form schema");
      const data = (await res.json()) as FormPayload;
      if (data && data.schema) {
        formSchemaCache.set(normalized, data);
        return data;
      }
      return null;
    })
    .catch((err) => {
      console.warn(`Could not prefetch form schema for ${normalized}:`, err);
      return null;
    })
    .finally(() => {
      formSchemaInFlight.delete(normalized);
    });

  formSchemaInFlight.set(normalized, promise);
  return promise;
}

type FormModalProps = {
  form?: FormPayload | null;
  tableName?: string;
  title?: string;
  buttonLabel?: string;
  relaxed?: boolean;
  submitPath?: string;
  openEventName?: string;
  hideLauncher?: boolean;
};

type OpenFormDetail = {
  row?: SheetRow;
  sheetRow?: string | number;
};

const DATA_FORM_SECTIONS: { id: string; title: string; iconName: string; fields: string[] }[] = [
  {
    id: "basic",
    title: "ข้อมูลหลัก & โครงการ",
    iconName: "ClipboardList",
    fields: ["ลำดับ", "ID Project", "บิล", "ผู้เบิก", "ผู้สร้างบิล", "ว/ด/ป"]
  },
  {
    id: "vendor",
    title: "ร้านค้า / ผู้รับเหมา",
    iconName: "Store",
    fields: ["ร้านค้า/ผู้รับเหมา", "ร้านค้า", "ผู้รับเหมา", "รายละเอียดงาน", "สินค้า", "ประเภท"]
  },
  {
    id: "expense",
    title: "รายการค่าใช้จ่าย & ยอดเงิน",
    iconName: "Coins",
    fields: [
      "ค่าของ", "ค่าแรง", "statusค่าแรง", "ค่าแรงคงเหลือ", "พนักงาน", "ชื่อพนักงาน",
      "น้ำมัน", "ซ่อมรถ", "ทะเบียน", "เครื่องจักร", "เครื่องมือ", "ชื่อเครื่องมือ", "อื่นๆ", "รายการ"
    ]
  },
  {
    id: "tax",
    title: "ภาษี & เงื่อนไขการชำระเงิน",
    iconName: "Receipt",
    fields: ["vat", "วันได้บิล", "เครดิต", "วันจ่าย", "หัก", "จำนวนหัก", "วันออก 3%"]
  },
  {
    id: "attachment",
    title: "หลักฐาน & เอกสารแนบ",
    iconName: "FileCheck",
    fields: ["รูปถ่ายบิล"]
  }
];

function SectionHeaderIcon({ name }: { name: string }) {
  switch (name) {
    case "ClipboardList": return <ClipboardList size={16} className="text-slate-600" />;
    case "Store": return <Store size={16} className="text-slate-600" />;
    case "Coins": return <Coins size={16} className="text-slate-600" />;
    case "Receipt": return <Receipt size={16} className="text-slate-600" />;
    case "FileCheck": return <FileCheck size={16} className="text-slate-600" />;
    default: return <FileText size={16} className="text-slate-600" />;
  }
}

export function FormModal({
  form,
  tableName,
  title = "เพิ่มข้อมูล",
  buttonLabel = "เพิ่มรายการ",
  relaxed = false,
  submitPath,
  openEventName,
  hideLauncher = false
}: FormModalProps) {
  const router = useRouter();
  const resolvedTableName = tableName || form?.tableName || "Data";

  const [activeForm, setActiveForm] = useState<FormPayload | null>(() => {
    if (form) {
      if (form.tableName) formSchemaCache.set(form.tableName, form);
      return form;
    }
    return formSchemaCache.get(resolvedTableName) || null;
  });
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => activeForm ? getInitialStringValues(activeForm) : {});
  const [editSheetRow, setEditSheetRow] = useState<string | number | null>(null);
  const [enumListSearch, setEnumListSearch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [attachedFilesByField, setAttachedFilesByField] = useState<Record<string, File[]>>({});
  const isEditing = editSheetRow !== null && editSheetRow !== undefined;
  const isDataForm = resolvedTableName === TABLES.DATA || resolvedTableName === "Data";

  const [resetKey, setResetKey] = useState(0);
  const formBodyRef = useRef<HTMLDivElement>(null);

  // Sync if prop form changes
  useEffect(() => {
    if (form) {
      setActiveForm(form);
      if (form.tableName) formSchemaCache.set(form.tableName, form);
    }
  }, [form]);

  // Background prefetch schema on mount so form opens instantly with 0ms delay
  useEffect(() => {
    if (resolvedTableName) {
      prefetchFormSchema(resolvedTableName).then(loaded => {
        if (loaded) {
          setActiveForm(loaded);
          setValues(prev => Object.keys(prev).length === 0 ? getInitialStringValues(loaded) : prev);
        }
      });
    }
  }, [resolvedTableName]);

  // Listen to global cache invalidation event (when projects, stores, contractors, staff are added)
  useEffect(() => {
    const handleInvalidate = () => {
      clearFormSchemaCache();
      if (resolvedTableName) {
        prefetchFormSchema(resolvedTableName, true).then(loaded => {
          if (loaded) {
            setActiveForm(loaded);
          }
        });
      }
    };
    window.addEventListener("schema-cache-invalidated", handleInvalidate);
    return () => window.removeEventListener("schema-cache-invalidated", handleInvalidate);
  }, [resolvedTableName]);

  function populateFormValues(targetForm: FormPayload, detail?: OpenFormDetail) {
    const nextValues = detail?.row
      ? getRowStringValues(targetForm, detail.row)
      : getInitialStringValues(targetForm);
    if (detail?.row) {
      targetForm.schema.filter(f => f.type === "Ref" && f.refFill).forEach(field => {
        const refVal = nextValues[field.name];
        if (refVal) {
          const options = targetForm.refOptions[field.name] || [];
          const selectedOpt = options.find(opt =>
            String(opt.value) === refVal ||
            String(opt.label) === refVal ||
            (opt.row && (
              String(opt.row.id) === refVal ||
              String(opt.row.id_Contractor) === refVal ||
              String(opt.row.id_store) === refVal
            ))
          );
          if (selectedOpt) {
            Object.entries(field.refFill!).forEach(([targetField, sourceColumn]) => {
              if (!hasValue(nextValues[targetField])) {
                nextValues[targetField] = String(selectedOpt.row?.[sourceColumn] ?? "");
              }
            });
          }
        }
      });
    }
    applyLocalFormulas(nextValues, targetForm.tableName);
    setError("");
    setSuccessMessage("");
    setEnumListSearch({});
    setAttachedFilesByField({});
    const targetRowKey = detail?.sheetRow ?? detail?.row?._sheetRow ?? detail?.row?.id ?? detail?.row?.id_bank ?? detail?.row?.id_store ?? detail?.row?.id_Contractor ?? detail?.row?.id_car ?? detail?.row?.id_cus ?? detail?.row?.id_Company;
    setEditSheetRow(detail?.row ? (targetRowKey !== undefined && targetRowKey !== null ? (typeof targetRowKey === "number" || typeof targetRowKey === "string" ? targetRowKey : String(targetRowKey)) : 1) : null);
    setValues(nextValues);
    setResetKey(k => k + 1);
  }

  async function handleOpen(detail?: OpenFormDetail) {
    setAttachedFilesByField({});
    setError("");
    setSuccessMessage("");

    // If editing existing row, populate directly
    if (detail?.row && activeForm) {
      populateFormValues(activeForm, detail);
      setOpen(true);
      prefetchFormSchema(resolvedTableName, true).then(fresh => {
        if (fresh) setActiveForm(fresh);
      });
      return;
    }

    // Open modal immediately and fetch fresh real-time sequence from server
    setOpen(true);
    if (activeForm) {
      populateFormValues(activeForm, detail);
    } else {
      setLoadingSchema(true);
    }

    try {
      const fresh = await prefetchFormSchema(resolvedTableName, true);
      if (fresh) {
        setActiveForm(fresh);
        if (!detail?.row) {
          const freshInitial = getInitialStringValues(fresh);
          setValues(prev => {
            const next = { ...prev };
            if (freshInitial["ลำดับ"]) next["ลำดับ"] = freshInitial["ลำดับ"];
            if (freshInitial["ID Project"] && !next["ID Project"]) next["ID Project"] = freshInitial["ID Project"];
            if (freshInitial["id_Conwork"] && !next["id_Conwork"]) next["id_Conwork"] = freshInitial["id_Conwork"];
            return next;
          });
        } else {
          populateFormValues(fresh, detail);
        }
      }
    } finally {
      setLoadingSchema(false);
    }
  }

  const visibleFields = (activeForm?.schema || []).filter(field => {
    if (field.type === "Hidden") return false;
    if ((resolvedTableName === TABLES.PROJECT || resolvedTableName === "Project") && (field.name.startsWith("งบไม่เกิน") || field.name === "คุมงบประเภทงาน")) {
      return false;
    }
    return isFieldVisible(field, values);
  });

  useEffect(() => {
    if (!openEventName) return;
    const openFromExternalButton = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as OpenFormDetail | undefined : undefined;
      handleOpen(detail);
    };
    window.addEventListener(openEventName, openFromExternalButton as EventListener);
    return () => window.removeEventListener(openEventName, openFromExternalButton as EventListener);
  }, [activeForm, openEventName, resolvedTableName]);

  function updateValue(field: FieldSchema, value: string) {
    if (!activeForm) return;
    setValues(current => {
      const next = { ...current, [field.name]: value };
      applyRefFill(next, field, activeForm, value);
      normalizeDependentValues(next, field.name, activeForm);
      if (activeForm.tableName === TABLES.DATA && field.name === "จำนวนหัก") return next;
      if (
        (activeForm.tableName === TABLES.PROJECT || activeForm.tableName === "Project" || activeForm.tableName === "1. Project รวม") &&
        field.name === "ยอดรวม vat"
      ) {
        return next;
      }
      pruneHiddenConditionalValues(next, activeForm);
      applyLocalFormulas(next, activeForm.tableName);
      return next;
    });
  }

  function updateValueByName(fieldName: string, value: string) {
    if (!activeForm) return;
    setValues(current => {
      const next = { ...current, [fieldName]: value };
      const targetField = activeForm.schema.find(f => f.name === fieldName);
      if (targetField) {
        applyRefFill(next, targetField, activeForm, value);
        normalizeDependentValues(next, fieldName, activeForm);
      }
      applyLocalFormulas(next, activeForm.tableName);
      return next;
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitPath || !activeForm) return;

    const submitValues = sanitizeValuesForSubmit(values, activeForm);
    if (activeForm.tableName === TABLES.DATA || activeForm.tableName === "Data") {
      const loggedInUser = getCookie("auth_name") || getCookie("auth_employee_id");
      if (loggedInUser && !submitValues["ผู้สร้างบิล"]) {
        submitValues["ผู้สร้างบิล"] = loggedInUser;
      }
    }
    const validationError = validateVisibleRequiredFields(submitValues, activeForm);
    if (validationError) {
      setError(validationError);
      formBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const formElement = event.currentTarget;
    const body = new FormData();
    body.set("tableName", activeForm.tableName);
    Object.entries(submitValues).forEach(([key, value]) => body.append(key, value));
    if (isEditing && editSheetRow !== null) body.set("sheetRow", String(editSheetRow));

    let hasFiles = false;

    // 1. Append all attached files from state
    Object.entries(attachedFilesByField).forEach(([fieldName, files]) => {
      files.forEach(file => {
        if (file && file.size > 0) {
          hasFiles = true;
          body.append(fieldName, file);
        }
      });
    });

    // 2. Also fallback check any native file inputs
    formElement.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach(input => {
      if (!attachedFilesByField[input.name]) {
        Array.from(input.files || []).forEach(file => {
          if (file.size > 0) {
            hasFiles = true;
            body.append(input.name, file);
          }
        });
      }
    });

    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = isEditing
        ? hasFiles
          ? await fetch(submitPath, {
            method: "PATCH",
            body
          })
          : await fetch(submitPath, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableName: activeForm.tableName, sheetRow: editSheetRow, values: submitValues })
          })
        : await fetch(submitPath, {
          method: "POST",
          body
        });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "บันทึกไม่สำเร็จ");
      
      clearFormSchemaCache();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("schema-cache-invalidated"));
      }

      setAttachedFilesByField({});

      if (isEditing) {
        setOpen(false);
        setEditSheetRow(null);
        setValues(getInitialStringValues(activeForm));
        setResetKey(k => k + 1);
        if (activeForm.tableName === TABLES.DATA) {
          window.location.reload();
        } else {
          router.refresh();
        }
      } else {
        // Reset form & verify fresh sequence from server for the next entry
        formElement.reset();

        const freshForm = await prefetchFormSchema(activeForm.tableName, true);
        if (freshForm) {
          setActiveForm(freshForm);
        }

        const prevSeq = String(payload.row?.["ลำดับ"] || payload.row?.["ลำดับtest"] || submitValues["ลำดับ"] || "");
        const prevSeqNum = Number(prevSeq);

        let nextSeq = freshForm?.initialValues?.["ลำดับ"] ? String(freshForm.initialValues["ลำดับ"]) : "";
        if (prevSeqNum > 0 && (!nextSeq || Number(nextSeq) <= prevSeqNum)) {
          nextSeq = String(prevSeqNum + 1);
        }

        const baseValues = freshForm ? getInitialStringValues(freshForm) : getInitialStringValues(activeForm);
        if (nextSeq && (activeForm.tableName === TABLES.DATA || activeForm.tableName === "Data")) {
          baseValues["ลำดับ"] = nextSeq;
        }

        setValues(baseValues);
        setEnumListSearch({});
        setAttachedFilesByField({});
        setError("");
        setSuccessMessage(
          prevSeq
            ? `บันทึกรายการบิลลำดับที่ ${prevSeq} สำเร็จเรียบร้อย! ระบบเตรียมเลขลำดับถัดไป (#${nextSeq || Number(prevSeq) + 1}) ให้พร้อมกรอกต่อแล้ว`
            : "บันทึกรายการเรียบร้อยแล้ว สามารถสร้างรายการถัดไปต่อได้เลย"
        );
        setResetKey(k => k + 1);

        // Scroll to the very top smoothly so user sees success alert & top of form
        setTimeout(() => {
          formBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }, 50);

        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ");
      formBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  // Pre-calculate contract & balance summary metrics for Data form
  const baseAmt = toNumber(values["ยอดเงิน"]);
  const deductVal = values["หัก"];
  const deductAmt = toNumber(values["จำนวนหัก"] || values["3เปอร์"]);
  const netTransferAmt = toNumber(values["ยอดโอน"] || values["ยอดเงิน"]);

  const isContractorBill = values["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา";
  const { originalBalance, hasContract } = parseContractRemainingLabor(values["ค่าแรงคงเหลือ"] || "");
  const currentLaborClaim = toNumber(values["ค่าแรง"]);
  const netBalanceAfter = originalBalance - currentLaborClaim;
  const isOverContract = isContractorBill && hasContract && netBalanceAfter < 0;

  return (
    <>
      {!hideLauncher ? (
        <div className={open ? "hidden" : ""}>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
            onClick={() => handleOpen()}
            onMouseEnter={() => { if (!activeForm && resolvedTableName) prefetchFormSchema(resolvedTableName); }}
            onTouchStart={() => { if (!activeForm && resolvedTableName) prefetchFormSchema(resolvedTableName); }}
          >
            <Plus size={15} className="text-white" />
            <span>{buttonLabel}</span>
          </button>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" role="presentation">
          <form
            className={`w-full bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 h-[92vh] sm:h-auto sm:max-h-[92vh] ${
              relaxed ? "max-w-5xl" : "max-w-3xl"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
            aria-busy={saving || loadingSchema}
            onSubmit={submitForm}
          >
            {/* Clean Mobile App Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shrink-0">
              <div>
                <h3 id="form-modal-title" className="text-sm sm:text-base text-slate-900 m-0 tracking-tight">
                  {isEditing ? title.replace(/^เพิ่ม/, "แก้ไข") : title}
                </h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="ปิด"
                disabled={saving}
                onClick={() => { setOpen(false); setEditSheetRow(null); }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Form Content */}
            <div ref={formBodyRef} className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-3.5 bg-slate-50/70 overscroll-contain">
              {loadingSchema || !activeForm ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-9 h-9 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                  <div className="text-sm text-slate-800">กำลังเตรียมฟอร์มข้อมูล...</div>
                  <div className="text-xs text-slate-500">กำลังโหลดตัวเลือกและโครงสร้างฟอร์ม</div>
                </div>
              ) : (
                <>
                  {saving ? (
                    <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                      <LoadingState title="กำลังบันทึก" message="กำลังอัปโหลดและบันทึกข้อมูล..." compact />
                    </div>
                  ) : null}

                  <fieldset className="space-y-4 border-0 p-0 m-0" disabled={saving}>
                    {/* Top Notification Alerts */}
                    {successMessage ? (
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150 font-normal">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>{successMessage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSuccessMessage("")}
                          className="text-emerald-600 hover:text-emerald-800 transition cursor-pointer p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}

                    {error ? (
                      <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs font-normal flex items-center justify-between animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-rose-600 shrink-0" />
                          <span>{error}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setError("")}
                          className="text-rose-600 hover:text-rose-800 transition cursor-pointer p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}

                    {/* Bill Category Budget Guardrail */}
                    {isDataForm ? (
                      <BillCategoryBudgetGuardrail
                        values={values}
                        projectRows={(activeForm.refOptions["ID Project"] || activeForm.refOptions["ชื่อ Project"] || []).map(opt => opt.row).filter(Boolean) as SheetRow[]}
                      />
                    ) : null}

                    {/* Categorized Fields Rendering for DATA form */}
                    {isDataForm ? (
                      <div className="space-y-4">
                        {DATA_FORM_SECTIONS.map(section => {
                          const sectionFields = visibleFields.filter(f => section.fields.includes(f.name));
                          if (!sectionFields.length) return null;
                          return (
                            <div key={section.id} className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <SectionHeaderIcon name={section.iconName} />
                                <h4 className="text-xs text-slate-900 m-0">{section.title}</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {sectionFields.map(field => (
                                  <div className={`${getFieldClassName(field)} space-y-1`} key={field.name}>
                                    <label className="text-xs font-medium text-slate-700 block">
                                      {getFieldLabel(field)}
                                      {field.required ? <span className="text-rose-600 font-medium ml-0.5">*</span> : ""}
                                    </label>
                                    {renderField(
                                      field,
                                      activeForm,
                                      values[field.name] || "",
                                      values,
                                      isEditing,
                                      value => updateValue(field, value),
                                      enumListSearch[field.name] || "",
                                      value => setEnumListSearch(current => ({ ...current, [field.name]: value })),
                                      resetKey,
                                      attachedFilesByField[field.name] || [],
                                      files => setAttachedFilesByField(current => ({ ...current, [field.name]: files }))
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Catch-all for any unsectioned fields */}
                        {(() => {
                          const assignedNames = new Set(DATA_FORM_SECTIONS.flatMap(s => s.fields));
                          const unsectionedFields = visibleFields.filter(f => !assignedNames.has(f.name));
                          if (!unsectionedFields.length) return null;
                          return (
                            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <FileText size={16} className="text-slate-600" />
                                <h4 className="text-xs text-slate-900 m-0">ข้อมูลเพิ่มเติม</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {unsectionedFields.map(field => (
                                  <div className={`${getFieldClassName(field)} space-y-1`} key={field.name}>
                                    <label className="text-xs font-medium text-slate-700 block">
                                      {getFieldLabel(field)}
                                      {field.required ? <span className="text-rose-600 font-medium ml-0.5">*</span> : ""}
                                    </label>
                                    {renderField(
                                      field,
                                      activeForm,
                                      values[field.name] || "",
                                      values,
                                      isEditing,
                                      value => updateValue(field, value),
                                      enumListSearch[field.name] || "",
                                      value => setEnumListSearch(current => ({ ...current, [field.name]: value })),
                                      resetKey,
                                      attachedFilesByField[field.name] || [],
                                      files => setAttachedFilesByField(current => ({ ...current, [field.name]: files }))
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Standard Grid for Non-Data forms */
                      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {visibleFields.map(field => (
                            <div className={`${getFieldClassName(field)} space-y-1.5`} key={field.name}>
                              <label className="text-xs font-medium text-slate-700 block">{getFieldLabel(field)}{field.required ? <span className="text-rose-600 font-medium ml-0.5">*</span> : ""}</label>
                              {renderField(
                                field,
                                activeForm,
                                values[field.name] || "",
                                values,
                                isEditing,
                                value => updateValue(field, value),
                                enumListSearch[field.name] || "",
                                value => setEnumListSearch(current => ({ ...current, [field.name]: value })),
                                resetKey,
                                attachedFilesByField[field.name] || [],
                                files => setAttachedFilesByField(current => ({ ...current, [field.name]: files }))
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeForm.tableName === TABLES.PROJECT || activeForm.tableName === "Project" ? (
                      <ProjectBudgetAllocator values={values} onChange={updateValueByName} />
                    ) : null}
                  </fieldset>
                </>
              )}
            </div>

            {/* Action Footer Bar (Mobile Full-Width Buttons & Summary) */}
            <footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200 shrink-0 shadow-lg sm:shadow-none">
              {isDataForm && baseAmt > 0 ? (
                <div className="flex items-center justify-between sm:justify-start gap-2.5 text-xs sm:text-sm bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 font-sans">
                  <span className="text-slate-500 font-medium">ยอดเงิน: <strong className="text-slate-900 ">{baseAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></span>
                  {deductAmt > 0 ? (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">หัก: <strong className="text-amber-700 ">-{deductAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></span>
                    </>
                  ) : null}
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-700 ">ยอดโอน: <strong className="text-emerald-700 ">{netTransferAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></span>
                </div>
              ) : <div />}

              <div className="flex items-center gap-2.5 w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setOpen(false); setEditSheetRow(null); setSuccessMessage(""); }}
                  className="w-1/3 sm:w-auto h-11 sm:h-12 px-5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 border border-slate-300 bg-white transition cursor-pointer active:bg-slate-200 flex items-center justify-center"
                >
                  ยกเลิก
                </button>
                <button
                  type={submitPath ? "submit" : "button"}
                  disabled={saving || loadingSchema || !activeForm || !submitPath}
                  className="flex-1 sm:flex-initial h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl text-sm sm:text-base text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer shadow-md active:scale-[0.99]"
                >
                  <Save size={18} />
                  <span>{saving ? "กำลังบันทึก..." : (isEditing ? "บันทึกการแก้ไข" : (isDataForm ? "บันทึกรายการบิล" : "บันทึกข้อมูล"))}</span>
                </button>
              </div>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ImageFileFieldInput({
  field,
  value,
  readOnly,
  onChange,
  attachedFiles = [],
  onAttachedFilesChange,
  resetKey = 0
}: {
  field: FieldSchema;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  attachedFiles?: File[];
  onAttachedFilesChange: (files: File[]) => void;
  resetKey?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing image URLs from database (comma-separated string)
  const existingUrls = value
    ? value
        .split(/\s*,\s*|\s*;\s*|\n+/)
        .map(u => u.trim())
        .filter(Boolean)
    : [];

  // Local object URLs for previewing newly attached files
  const [filePreviews, setFilePreviews] = useState<Array<{ file: File; url: string }>>([]);

  useEffect(() => {
    const previews = attachedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setFilePreviews(previews);

    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [attachedFiles, resetKey]);

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    onAttachedFilesChange([...attachedFiles, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExisting = (indexToRemove: number) => {
    const updated = existingUrls.filter((_, idx) => idx !== indexToRemove);
    onChange(updated.join(", "));
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    const updated = attachedFiles.filter((_, idx) => idx !== indexToRemove);
    onAttachedFilesChange(updated);
  };

  const totalImageCount = existingUrls.length + attachedFiles.length;

  return (
    <div className="space-y-2.5">
      {/* Hidden File Input for triggering native camera / file picker */}
      <input
        ref={fileInputRef}
        type="file"
        name={field.name}
        accept={field.type === "Image" ? "image/*" : undefined}
        multiple
        disabled={readOnly}
        onChange={handleFilesAdded}
        className="hidden"
      />

      {/* Grid of All Photos (Existing + Newly Attached) */}
      {totalImageCount > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-normal">
            <span className="flex items-center gap-1.5">
              <Camera size={14} className="text-slate-500" />
              <span>รูปภาพที่แนบทั้งหมด ({totalImageCount} รูป)</span>
            </span>
            {existingUrls.length > 0 && attachedFiles.length > 0 ? (
              <span className="text-[11px] text-slate-400 font-normal">
                (รูปเดิม {existingUrls.length} รูป + รูปใหม่ {attachedFiles.length} รูป)
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            {/* 1. Existing Uploaded Images */}
            {existingUrls.map((url, idx) => {
              const preview = imagePreviewUrl(url);
              return (
                <div
                  key={`existing-img-${url}-${idx}`}
                  className="group relative aspect-square rounded-md overflow-hidden border border-slate-300 bg-slate-100 flex flex-col justify-between"
                >
                  <img
                    src={preview || url}
                    alt={`รูปเดิม ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                    เดิม #{idx + 1}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition cursor-pointer active:scale-90"
                      title="ลบรูปนี้"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* 2. Newly Attached Files (Pending Upload) */}
            {filePreviews.map(({ file, url }, idx) => (
              <div
                key={`new-file-${file.name}-${idx}`}
                className="group relative aspect-square rounded-md overflow-hidden border border-sky-400 bg-sky-50 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-100"
              >
                <img
                  src={url}
                  alt={`รูปใหม่ ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 bg-sky-700 text-white text-[9px] px-1 py-0.2 rounded font-normal">
                  ใหม่ #{idx + 1}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition cursor-pointer active:scale-90"
                    title="ลบรูปนี้"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}

            {/* Quick Add More Tile inside the grid */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-md border-2 border-dashed border-slate-300 hover:border-slate-800 hover:bg-white bg-slate-100/60 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition cursor-pointer active:scale-95"
                title="กดเพื่อแนบรูปเพิ่มอีก"
              >
                <Plus size={18} />
                <span className="text-[10px] text-center leading-tight font-normal">แนบเพิ่ม</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Main Upload Dropzone / Button (Shown when no images attached yet) */}
      {!readOnly && totalImageCount === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-slate-700 hover:bg-slate-50 rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
            <Camera size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-800 font-normal">
              กดเพื่อถ่ายรูป หรือเลือกรูปภาพจากเครื่อง
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
              สามารถแนบทีละรูป หรือเลือกหลายรูปพร้อมกันได้
            </div>
          </div>
        </div>
      )}

      {/* Action button when images already exist */}
      {!readOnly && totalImageCount > 0 && (
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 font-normal"
          >
            <ImagePlus size={14} className="text-slate-600" />
            <span>ถ่ายรูป / แนบรูปเพิ่มอีก</span>
          </button>
        </div>
      )}
    </div>
  );
}

function renderField(
  field: FieldSchema,
  form: FormPayload,
  value: string,
  currentValues: Record<string, string>,
  isEditing: boolean,
  onChange: (value: string) => void,
  enumSearchValue = "",
  onEnumSearchChange: (value: string) => void = () => {},
  resetKey = 0,
  attachedFiles: File[] = [],
  onAttachedFilesChange: (files: File[]) => void = () => {}
) {
  const readOnly = Boolean(field.readonly || (isEditing && field.readonlyOnEdit));
  if (field.type === "Image" || field.type === "File") {
    return (
      <ImageFileFieldInput
        field={field}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        attachedFiles={attachedFiles}
        onAttachedFilesChange={onAttachedFilesChange}
        resetKey={resetKey}
      />
    );
  }

  if (field.type === "Ref" || field.type === "Enum" || field.type === "EnumList") {
    const options = getFieldOptions(field, form, currentValues);
    if (field.type === "Ref" && field.name === "ร้านค้า") {
      return (
        <SearchableRefSelect
          name={field.name}
          value={value}
          options={options}
          readOnly={readOnly}
          placeholder="พิมพ์ชื่อร้านค้า หรือรหัสร้านค้า"
          onChange={onChange}
        />
      );
    }

    if (field.type === "EnumList") {
      const selectedValues = splitEnumListValue(value);
      const optionValues = new Set(options.map(option => String(option.value)));
      const selectedOptionValues = selectedValues.filter(item => optionValues.has(item));
      const customValue = selectedValues.filter(item => !optionValues.has(item)).join(", ");
      const normalizedSearch = enumSearchValue.trim().toLowerCase();
      const filteredOptions = normalizedSearch
        ? options.filter(option => `${String(option.value)} ${String(option.label)}`.toLowerCase().includes(normalizedSearch))
        : options;

      function setSelectedValues(nextValues: string[], nextCustomValue = customValue) {
        const customItems = splitEnumListValue(nextCustomValue);
        onChange([...new Set([...nextValues, ...customItems].filter(Boolean))].join(", "));
      }

      function removeSelectedValue(selectedValue: string) {
        setSelectedValues(
          selectedOptionValues.filter(item => item !== selectedValue),
          splitEnumListValue(customValue).filter(item => item !== selectedValue).join(", ")
        );
      }

      return (
        <div className="space-y-2 border border-slate-300 rounded-lg p-3 bg-slate-50/70">
          <input type="hidden" name={field.name} value={value} />
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center" aria-live="polite">
              {selectedValues.length ? (
                selectedValues.map((selectedValue, index) => (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs font-medium" key={`${selectedValue}-${index}`}>
                    <span>{selectedValue}</span>
                    {!readOnly ? (
                      <button type="button" className="hover:text-rose-600 transition cursor-pointer ml-0.5" aria-label={`ลบ ${selectedValue}`} onClick={() => removeSelectedValue(selectedValue)}>
                        <X size={13} />
                      </button>
                    ) : null}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 font-normal italic text-xs">ยังไม่ได้เลือกรายการ</span>
              )}
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full shrink-0">{selectedValues.length} / {options.length}</span>
          </div>
          <input
            type="text"
            className="w-full h-8 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs font-normal text-slate-800 placeholder:text-slate-400 transition-all"
            value={enumSearchValue}
            readOnly={readOnly}
            placeholder="ค้นหารายละเอียดงาน..."
            onChange={event => onEnumSearchChange(event.target.value)}
          />
          <div className="max-h-44 overflow-y-auto space-y-1 bg-white p-2 border border-slate-300 rounded-lg" role="group" aria-label={field.name}>
            {filteredOptions.map((option, index) => {
              const optionValue = String(option.value);
              const checked = selectedValues.includes(optionValue);
              return (
                <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-normal cursor-pointer transition ${checked ? "bg-slate-100 text-slate-900 font-medium" : "hover:bg-slate-50 text-slate-700"}`} key={`${optionValue}-${index}`}>
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={checked}
                    disabled={readOnly}
                    className="w-4 h-4 rounded border-slate-300 accent-slate-800 cursor-pointer"
                    onChange={event => {
                      const nextValues = event.target.checked
                        ? [...selectedOptionValues, optionValue]
                        : selectedOptionValues.filter(item => item !== optionValue);
                      setSelectedValues(nextValues);
                    }}
                  />
                  <span>{String(option.label)}</span>
                </label>
              );
            })}
            {!filteredOptions.length ? <div className="p-3 text-center text-slate-400 text-xs font-normal">ไม่พบรายการ</div> : null}
          </div>
          <input
            type="text"
            className="w-full h-8 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs font-normal text-slate-800 placeholder:text-slate-400 transition-all"
            value={customValue}
            readOnly={readOnly}
            placeholder="เพิ่มงานอื่น คั่นด้วย comma"
            onChange={event => setSelectedValues(selectedOptionValues, event.target.value)}
          />
        </div>
      );
    }

  if (field.inputMode === "buttons") {
    const optionValues = new Set(options.map(option => String(option.value)));
    const customChoice = customChoiceConfig(field.name);
    
    const strVal = String(value ?? "").trim();
    const isZeroOrEmpty = strVal === "" || strVal === "0" || strVal === "0.00";

    const customValue = customChoice && !isZeroOrEmpty && strVal !== customChoice.optionValue && !optionValues.has(strVal) ? strVal : "";
    const choiceValue = customChoice ? (customValue ? customChoice.optionValue : (isZeroOrEmpty ? "" : strVal)) : strVal;
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={field.name}>
            {options.map((option, index) => {
              const optionValue = String(option.value);
              const checked = choiceValue === optionValue;
              const buttonStyle = getOptionButtonStyle(field.name, optionValue, checked);
              return (
                <label
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-1.5 ${buttonStyle}`}
                  key={`${optionValue}-${index}`}
                  onClick={(e) => {
                    if (readOnly) return;
                    if (checked && !field.required) {
                      e.preventDefault();
                      onChange("");
                    }
                  }}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={optionValue}
                    checked={checked}
                    disabled={readOnly}
                    className="sr-only"
                    onChange={event => {
                      if (customChoice && event.target.value === customChoice.optionValue) {
                        onChange(customValue || customChoice.optionValue);
                        return;
                      }
                      onChange(event.target.value);
                    }}
                  />
                  {field.name === "color" || field.name === "COLOR" ? (
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      optionValue.toLowerCase() === "red" ? "bg-rose-500" : optionValue.toLowerCase() === "green" ? "bg-emerald-500" : "bg-slate-900"
                    }`} />
                  ) : null}
                  <span>{getFieldOptionLabel(field.name, String(option.label || option.value))}</span>
                </label>
              );
            })}
          </div>
          {customChoice && choiceValue === customChoice.optionValue ? (
            <input
              type="number"
              className="w-full h-9 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs font-normal text-slate-800 placeholder:text-slate-400"
              value={customValue}
              readOnly={readOnly}
              placeholder={customChoice.placeholder}
              onChange={event => onChange(event.target.value)}
            />
          ) : null}
        </div>
      );
    }

    if (field.type === "Enum") {
      return (
        <select
          name={field.name}
          value={value}
          disabled={readOnly}
          onChange={e => onChange(e.target.value)}
          className="w-full h-10 sm:h-9 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs sm:text-sm font-normal text-slate-800 transition-all cursor-pointer"
        >
          <option value="">เลือก{field.name}...</option>
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={String(option.value)}>
              {String(option.label)}
            </option>
          ))}
        </select>
      );
    }

    return (
      <SearchableRefSelect
        name={field.name}
        value={value}
        options={options}
        readOnly={readOnly}
        placeholder={`เลือก${field.name}...`}
        onChange={onChange}
      />
    );
  }

  if (field.type === "LongText") {
    return (
      <textarea
        name={field.name}
        value={value}
        readOnly={readOnly}
        rows={3}
        onChange={event => onChange(event.target.value)}
        className="w-full p-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all resize-y"
      />
    );
  }

  const billDateMode = form.tableName === TABLES.DATA && field.type === "Date";
  const type = field.type === "Date" ? "date" : field.type === "Decimal" || field.type === "Number" ? "number" : "text";
  const inputMode = field.type === "Decimal" ? "decimal" : field.type === "Number" ? "numeric" : undefined;

  const isProjectTable = form.tableName === TABLES.PROJECT || form.tableName === "Project" || form.tableName === "1. Project รวม";
  const isProjectVatTotal = isProjectTable && field.name === "ยอดรวม vat";
  const workAmount = isProjectTable ? toNumber(currentValues["ยอดงาน"]) : 0;
  const totalVatNum = isProjectTable ? toNumber(value || (workAmount ? workAmount * 1.07 : 0)) : 0;
  const vatAmount = workAmount > 0 ? Math.max(0, Math.round((totalVatNum - workAmount) * 100) / 100) : 0;

  return (
    <div className="space-y-1">
      <input
        type={type}
        name={field.name}
        value={billDateMode ? toDateInputValue(value) : value}
        readOnly={readOnly}
        inputMode={inputMode}
        lang={billDateMode ? "th-TH" : undefined}
        onChange={event => onChange(billDateMode ? normalizeBillDateInput(event.target.value) : event.target.value)}
        className="w-full h-10 sm:h-9 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all"
      />
      {isProjectVatTotal && workAmount > 0 ? (
        <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
          <span>ภาษี VAT 7%: <strong className="font-semibold text-emerald-700">฿{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-500 text-[10px]">(ยอดงาน ฿{workAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} + VAT ฿{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })})</span>
        </div>
      ) : null}
    </div>
  );
}

function SearchableRefSelect({
  name,
  value,
  options,
  readOnly,
  placeholder,
  onChange
}: {
  name: string;
  value: string;
  options: RefOption[];
  readOnly: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const selectedOption = value ? options.find(option =>
    String(option.value) === value ||
    String(option.label) === value ||
    (option.row && (
      String(option.row.id) === value ||
      String(option.row.id_store) === value ||
      String(option.row["ชื่อร้านค้า"]) === value ||
      Object.values(option.row).some(v => v !== null && v !== undefined && String(v).trim() !== "" && String(v) === value)
    ))
  ) : undefined;
  const selectedLabel = selectedOption ? optionLabel(selectedOption, name) : value;
  const selectedImgUrl = (selectedOption?.row?.image || selectedOption?.row?.image_url || "") as string;

  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [brokenSelectedImg, setBrokenSelectedImg] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter(option => optionSearchText(option, name).includes(normalizedQuery)).slice(0, 80)
    : options.slice(0, 80);

  useEffect(() => { setQuery(selectedLabel); }, [selectedLabel, value]);
  useEffect(() => { setBrokenSelectedImg(false); }, [selectedImgUrl]);

  function openMenu() {
    if (readOnly) return;
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    openMenu();
    const exact = options.find(option => {
      const optionValue = String(option.value);
      const label = optionLabel(option, name);
      return optionValue.toLowerCase() === nextQuery.toLowerCase() || label.toLowerCase() === nextQuery.toLowerCase();
    });
    onChange(exact ? String(exact.value) : nextQuery);
  }

  function selectOption(option: RefOption) {
    onChange(String(option.value));
    setQuery(optionLabel(option, name));
    setOpen(false);
  }

  const showSelectedImg = isValidImgUrl(selectedImgUrl) && !brokenSelectedImg;

  const menuEl = open && !readOnly && menuPos ? (
    <div
      className="bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1 font-sans animate-in fade-in zoom-in-95 duration-100"
      role="listbox"
      aria-label={name}
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 9999,
      }}
    >
      {filteredOptions.length ? (
        filteredOptions.map((option, index) => {
          const optionValue = String(option.value);
          const rawImg = option.row?.image || option.row?.image_url || "";
          const imgUrl = isValidImgUrl(typeof rawImg === "string" ? rawImg.trim() : "");
          return (
            <DropdownOption
              key={`${optionValue}-${index}`}
              option={option}
              fieldName={name}
              optionValue={optionValue}
              imgUrl={imgUrl}
              isActive={optionValue === value}
              onSelect={selectOption}
            />
          );
        })
      ) : (
        <div className="p-3 text-center text-slate-400 text-xs font-normal">ไม่พบข้อมูล</div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        className="w-full h-10 sm:h-9 px-3 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded-lg text-xs sm:text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all"
        value={query}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={openMenu}
        onChange={event => updateQuery(event.target.value)}
      />
      {typeof document !== "undefined" ? createPortal(menuEl, document.body) : null}
    </div>
  );
}

function DropdownOption({
  option, fieldName, optionValue, imgUrl, isActive, onSelect
}: {
  option: RefOption;
  fieldName: string;
  optionValue: string;
  imgUrl: string;
  isActive: boolean;
  onSelect: (o: RefOption) => void;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = imgUrl && !broken;
  return (
    <button
      type="button"
      className={`w-full px-2.5 py-1.5 text-left text-xs font-normal flex items-center justify-between rounded-md cursor-pointer transition-colors ${
        isActive
          ? "bg-slate-100 text-slate-900 font-medium"
          : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-900"
      }`}
      role="option"
      aria-selected={isActive}
      onMouseDown={e => e.preventDefault()}
      onClick={() => onSelect(option)}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showImg ? (
          <img
            src={imgUrl}
            alt=""
            className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0"
            onError={() => setBroken(true)}
          />
        ) : null}
        <span className="truncate text-slate-800 font-normal">{optionLabel(option, fieldName)}</span>
      </div>
      {isActive ? <Check size={14} className="text-slate-600 shrink-0 ml-1" /> : null}
    </button>
  );
}

function optionLabel(option: RefOption | undefined, fieldName?: string) {
  if (!option) return "";
  const val = String(option.value || "").trim();
  const rawLabel = String(option.label || option.value || "").trim();

  if (fieldName === "ทะเบียน" || fieldName === "ทะเบียนรถ") {
    if (rawLabel.includes(" - ")) {
      const parts = rawLabel.split(" - ");
      return parts.slice(1).join(" - ").trim() || rawLabel;
    }
    return rawLabel;
  }

  if (fieldName === "ผู้เบิก") {
    const loggedInId = getCookie("auth_employee_id").trim();
    const loggedInName = getCookie("auth_name").trim();
    if (loggedInName && (val === loggedInId || rawLabel.includes(loggedInId) || val === loggedInName)) {
      return loggedInName;
    }
    if (rawLabel.includes(" - ")) {
      const parts = rawLabel.split(" - ");
      return parts.slice(1).join(" - ").trim() || rawLabel;
    }
    return rawLabel;
  }

  if (!val) return rawLabel;
  if (!rawLabel || rawLabel === val) return val;
  if (rawLabel.startsWith(val)) return rawLabel;
  return `${val} - ${rawLabel}`;
}

function optionSearchText(option: RefOption, fieldName?: string) {
  return `${String(option.value || "")} ${optionLabel(option, fieldName)}`.toLowerCase();
}

/** กรองและดึง URL รูปภาพที่ถูกต้อง (HTTP/HTTPS, Data URL) */
function isValidImgUrl(url: string): string {
  return imagePreviewUrl(url);
}

function customChoiceConfig(fieldName: string) {
  if (fieldName === "vat") return { optionValue: "ระบุเอง", placeholder: "กำหนด VAT เอง" };
  if (fieldName === "หัก") return { optionValue: "ระบุเอง", placeholder: "กำหนดเปอร์เซ็นต์หักเอง" };
  if (fieldName === "เครดิต") return { optionValue: "ระบุเอง", placeholder: "กำหนดเครดิตเอง (วัน)" };
  return null;
}

function getFieldOptionLabel(fieldName: string, label: string): string {
  if (fieldName === "color" || fieldName === "COLOR") {
    const val = label.trim().toLowerCase();
    if (val === "red" || val.includes("แดง") || val.includes("ใหญ่")) return "Red (งานใหญ่)";
    if (val === "green" || val.includes("เขียว") || val.includes("เล็ก")) return "Green (งานเล็ก)";
    if (val === "black" || val.includes("ดำ") || val.includes("เสร็จ")) return "Black (งานเสร็จแล้ว)";
  }
  return label;
}

function getOptionButtonStyle(fieldName: string, optionValue: string, checked: boolean): string {
  if (fieldName === "color" || fieldName === "COLOR") {
    const val = optionValue.trim().toLowerCase();
    if (val === "red" || val.includes("แดง") || val.includes("ใหญ่")) {
      return checked
        ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300"
        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-medium";
    }
    if (val === "green" || val.includes("เขียว") || val.includes("เล็ก")) {
      return checked
        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300"
        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-medium";
    }
    if (val === "black" || val.includes("ดำ") || val.includes("เสร็จ")) {
      return checked
        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400"
        : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 font-medium";
    }
  }

  return checked
    ? "bg-slate-800 text-white border-slate-800 font-medium"
    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(";").shift() || "");
  return "";
}

function getInitialStringValues(form: FormPayload) {
  const values = Object.fromEntries(form.schema.map(field => [field.name, String(form.initialValues[field.name] ?? "")]));
  if (form.tableName === TABLES.DATA || form.tableName === "Data") {
    const loggedInEmployeeId = getCookie("auth_employee_id");
    const loggedInName = getCookie("auth_name");
    if (loggedInEmployeeId || loggedInName) {
      const requesterOptions = form.refOptions["ผู้เบิก"] || [];

      // 1. Match by logged-in display name first (e.g. "คุณแมน")
      const matchedByName = loggedInName ? requesterOptions.find(opt =>
        String(opt.label).trim().toLowerCase() === loggedInName.trim().toLowerCase() ||
        String(opt.value).trim().toLowerCase() === loggedInName.trim().toLowerCase() ||
        (opt.row && (
          String(opt.row["ชื่อเล่น"] || "").trim().toLowerCase() === loggedInName.trim().toLowerCase() ||
          String(opt.row["ชื่อ-นามสกุล"] || "").trim().toLowerCase() === loggedInName.trim().toLowerCase() ||
          String(opt.row["name"] || "").trim().toLowerCase() === loggedInName.trim().toLowerCase()
        ))
      ) : undefined;

      // 2. Fallback: match by employee ID / username (e.g. "PT101")
      const matchedById = loggedInEmployeeId ? requesterOptions.find(opt =>
        String(opt.value) === loggedInEmployeeId ||
        String(opt.row?.id) === loggedInEmployeeId ||
        String(opt.row?.employee_id) === loggedInEmployeeId ||
        String(opt.row?.user_id) === loggedInEmployeeId ||
        String(opt.row?.username) === loggedInEmployeeId
      ) : undefined;

      const matchedUserOption = matchedByName || matchedById;

      if (matchedUserOption) {
        values["ผู้เบิก"] = String(matchedUserOption.value);
      } else if (loggedInName) {
        values["ผู้เบิก"] = loggedInName;
      } else if (loggedInEmployeeId) {
        values["ผู้เบิก"] = loggedInEmployeeId;
      }

      const loggedInUser = loggedInName || loggedInEmployeeId;
      if (loggedInUser) {
        values["ผู้สร้างบิล"] = loggedInUser;
      }
    }
  }
  return values;
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function getRowStringValues(form: FormPayload, row: SheetRow) {
  const values: Record<string, string> = {};

  const rawVendorType = firstNonEmpty(row["ร้านค้า/ผู้รับเหมา"], row.vendor_type);
  const vendorType = rawVendorType || (firstNonEmpty(row["ผู้รับเหมา"], row.contractor_id) ? "ผู้รับเหมา" : "ร้านค้า");

  form.schema.forEach(field => {
    let rawVal = firstNonEmpty(row[field.name], form.initialValues[field.name]);

    if (form.tableName === TABLES.DATA || form.tableName === "Data") {
      if (field.name === "ร้านค้า/ผู้รับเหมา") {
        rawVal = vendorType;
      } else if (field.name === "ร้านค้า") {
        rawVal = firstNonEmpty(row["ร้านค้า"], row.store_id, row["ร้าน/บุคคล"], row.vendor_or_person);
      } else if (field.name === "ผู้รับเหมา") {
        rawVal = firstNonEmpty(row["ผู้รับเหมา"], row.contractor_id, row["ร้าน/บุคคล"], row.vendor_or_person);
      } else if (field.name === "สินค้า") {
        rawVal = firstNonEmpty(row["สินค้า"], row.product, row["สินค้า/ทำงาน"], row.description);
      } else if (field.name === "รายละเอียดงาน") {
        rawVal = firstNonEmpty(row["รายละเอียดงาน"], row.work_details, row["สินค้า/ทำงาน"], row.description);
      } else if (field.name === "รายการ") {
        rawVal = firstNonEmpty(row["รายการ"], row.sub_category, row.item_name);
      } else if (field.name === "ชื่อเครื่องมือ") {
        rawVal = firstNonEmpty(row["ชื่อเครื่องมือ"], row.tool_name);
      } else if (field.name === "ทะเบียน") {
        rawVal = firstNonEmpty(row["ทะเบียน"], row.plate_no);
      } else if (field.name === "ชื่อพนักงาน") {
        rawVal = firstNonEmpty(row["ชื่อพนักงาน"], row.staff_name);
      } else if (field.name === "statusค่าแรง") {
        rawVal = firstNonEmpty(row["statusค่าแรง"], row.labor_status);
      } else if (["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"].includes(field.name)) {
        const rowType = String(row["ประเภท"] || row.category || "").toLowerCase();
        const rowAmount = firstNonEmpty(row[field.name], row["ยอดเงิน"], row.amount);
        if (!hasValue(rawVal) && hasValue(rowAmount) && rowType.includes(field.name.toLowerCase())) {
          rawVal = String(rowAmount);
        }
      }
    }

    if ((field.name === "vat" || field.name === "หัก" || field.name === "เครดิต") && (rawVal === "0" || rawVal === "0.00" || String(rawVal) === "0")) {
      rawVal = "";
    }

    if (field.type === "Date" && rawVal) {
      values[field.name] = toInputDateValue(rawVal);
    } else if (field.type === "Ref" && rawVal) {
      const options = form.refOptions[field.name] || [];
      const match = options.find(opt =>
        String(opt.value) === rawVal ||
        String(opt.label) === rawVal ||
        (opt.row && (
          String(opt.row.id) === rawVal ||
          String(opt.row.id_store) === rawVal ||
          String(opt.row.id_Conwork) === rawVal ||
          String(opt.row["ชื่อร้านค้า"]) === rawVal ||
          String(opt.row["ชื่อเล่น"]) === rawVal ||
          String(opt.row["ชื่อ-นามสกุล"]) === rawVal ||
          Object.values(opt.row).some(v => String(v) === rawVal)
        ))
      );
      values[field.name] = match ? String(match.value) : rawVal;
    } else if (field.name === "สินค้า" && rawVal) {
      const enumOpts = field.values || [];
      const match = enumOpts.find(opt => opt === rawVal || opt.endsWith(rawVal) || rawVal.endsWith(opt) || opt.includes(rawVal));
      values[field.name] = match || rawVal;
    } else if (field.name === "รายการ" && rawVal) {
      const enumOpts = field.values || [];
      const match = enumOpts.find(opt => opt === rawVal || opt.trim() === rawVal.trim());
      values[field.name] = match || rawVal;
    } else {
      values[field.name] = rawVal;
    }
  });
  return values;
}

function splitEnumListValue(value: string) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function getFieldOptions(field: FieldSchema, form: FormPayload, values: Record<string, string>) {
  if (field.type === "Ref") {
    return filterRefOptions(field, form.refOptions[field.name] || [], values);
  }

  return getEnumValues(field, values).map(value => ({ value, label: value }));
}

function filterRefOptions(field: FieldSchema, options: RefOption[], values: Record<string, string>) {
  if (!field.filterBy) return options;
  const expectedValue = values[field.filterBy.field] || "";
  return options.filter(option => {
    if (expectedValue && String(option.row?.[field.filterBy!.column] ?? "") !== expectedValue) return false;
    if (!field.filterBy!.openContract) return true;
    return toNumber(option.row?.["ยอดเงินจ้าง"]) > toNumber(option.row?.["ยอดเงินจ่าย"]);
  });
}

function getEnumValues(field: FieldSchema, values: Record<string, string>) {
  const defaultValues = field.values || [];
  if (field.dynamicValues !== "billTypeOptions" || !field.dynamicOptionSets) return defaultValues;

  let dynamicList: string[] = [];
  if (values["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา") {
    dynamicList = field.dynamicOptionSets.contractor || [];
  } else if (hasValue(values["สินค้า"])) {
    dynamicList = field.dynamicOptionSets.storeWithItem || [];
  } else {
    dynamicList = field.dynamicOptionSets.storeDefault || [];
  }

  return dynamicList.length > 0 ? dynamicList : defaultValues;
}

function calculateDueDate(baseDateStr: string, days: number): string {
  const parsed = parseDateStrict(baseDateStr);
  if (!parsed || isNaN(days) || days <= 0) return "";
  const dt = new Date(parsed.year, parsed.month - 1, parsed.day);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDependentValues(values: Record<string, string>, changedField: string, form: FormPayload) {
  if (changedField === "ร้านค้า/ผู้รับเหมา") {
    if (values[changedField] === "ร้านค้า") {
      values["ผู้รับเหมา"] = "";
      values["รายละเอียดงาน"] = "";
      values["ค่าแรงคงเหลือ"] = "";
    } else {
      values["ร้านค้า"] = "";
      values["สินค้า"] = "";
    }
    values["ประเภท"] = "";
  }

  if (changedField === "สินค้า") {
    const typeField = form.schema.find(field => field.name === "ประเภท");
    if (typeField && values["ประเภท"] && !getEnumValues(typeField, values).includes(values["ประเภท"])) {
      values["ประเภท"] = "";
    }
  }

  if (changedField === "vat" && !hasValue(values["vat"])) {
    values["วันได้บิล"] = "";
    values["เครดิต"] = "";
    values["วันจ่าย"] = "";
  }

  if (changedField === "หัก" && !hasValue(values["หัก"])) {
    values["จำนวนหัก"] = "";
    values["วันออก 3%"] = "";
  }

  // Credit auto-calculate "วันจ่าย" from "วันได้บิล" (or "ว/ด/ป") + "เครดิต"
  if (changedField === "เครดิต" || changedField === "วันได้บิล" || changedField === "ว/ด/ป" || changedField === "วันที่") {
    const creditDays = parseCreditDays(values["เครดิต"]);
    if (creditDays > 0) {
      const baseDate = values["วันได้บิล"] || values["ว/ด/ป"] || values["วันที่"];
      if (hasValue(baseDate)) {
        const dueDate = calculateDueDate(baseDate, creditDays);
        if (dueDate) {
          values["วันจ่าย"] = dueDate;
        }
      }
    } else if (changedField === "เครดิต" && (!values["เครดิต"] || values["เครดิต"] === "0" || values["เครดิต"] === "เงินสด")) {
      values["วันจ่าย"] = "";
    }
  }

  const typeField = form.schema.find(field => field.name === "ประเภท");
  if (typeField && values["ประเภท"] && !getEnumValues(typeField, values).includes(values["ประเภท"])) {
    values["ประเภท"] = "";
  }
}

function parseCreditDays(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === "เงินสด" || str === "ไม่มี" || str === "0" || str === "" || str === "false") return 0;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function parseDeductPercent(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === "ไม่มี" || str === "0" || str === "0%" || str === "" || str === "false") return 0;
  const match = str.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function applyLocalFormulas(values: Record<string, string>, tableName: string) {
  if (tableName === TABLES.PROJECT || tableName === "Project" || tableName === "1. Project รวม") {
    if (hasValue(values["ยอดงาน"])) {
      const workNum = toNumber(values["ยอดงาน"]);
      const vatTotal = Math.round(workNum * 1.07 * 100) / 100;
      values["ยอดรวม vat"] = String(vatTotal);
    }
    return;
  }
  if (tableName === TABLES.DATA) {
    applyBillDeductAmount(values);
    return;
  }
  if (tableName !== TABLES.CONTRACT_WORK) return;
  const hireAmount = toNumber(values["ยอดเงินจ้าง"]);
  const paidAmount = toNumber(values["ยอดเงินจ่าย"]);
  if (hasValue(values["ยอดเงินจ้าง"]) || hasValue(values["ยอดเงินจ่าย"])) {
    values["ยอดเงินจ่าย"] = String(paidAmount);
    values["ค่าแรงคงเหลือ"] = String(hireAmount - paidAmount);
  }
}

function parseContractRemainingLabor(rawVal: string): { originalBalance: number; hasContract: boolean } {
  if (!rawVal) return { originalBalance: 0, hasContract: false };
  const firstPart = rawVal.split("จาก")[0] || rawVal;
  const num = toNumber(firstPart);
  return { originalBalance: num, hasContract: true };
}

function isVatActive(vatValue: unknown): boolean {
  if (vatValue === null || vatValue === undefined) return false;
  const str = String(vatValue).trim().toLowerCase();
  return str !== "" && str !== "0" && str !== "0.00" && str !== "0%" && str !== "ไม่มี" && str !== "ไม่มี vat" && str !== "false" && str !== "no";
}

function applyBillDeductAmount(values: Record<string, string>) {
  // Sum up active expense breakdown categories (EXCLUDE "ค่าแรงคงเหลือ"!)
  const expenseFields = ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"];
  const totalExpense = expenseFields.reduce((sum, field) => sum + toNumber(values[field]), 0);
  const baseAmount = totalExpense > 0 ? totalExpense : toNumber(values["ยอดเงิน"]);

  if (baseAmount > 0) {
    values["ยอดเงิน"] = String(baseAmount);
  }

  const deductValue = values["หัก"];
  const deductPercent = parseDeductPercent(deductValue);
  let deductAmount = 0;

  const hasVat = isVatActive(values["vat"]);
  const hasDeduct = hasValue(deductValue) && deductPercent > 0;

  if (!hasDeduct) {
    values["จำนวนหัก"] = "";
    values["3เปอร์"] = "";
    deductAmount = 0;
  } else {
    // If VAT is active (7% included in baseAmount), calculate deduction on pre-VAT amount
    if (hasVat) {
      const preVatAmount = baseAmount / 1.07;
      deductAmount = (preVatAmount * deductPercent) / 100;
    } else {
      // If NO VAT selected, calculate deduction directly on baseAmount (e.g. 3% of baseAmount)
      deductAmount = (baseAmount * deductPercent) / 100;
    }
    values["จำนวนหัก"] = deductAmount > 0 ? formatDecimal(deductAmount) : "";
    values["3เปอร์"] = values["จำนวนหัก"];
  }

  let netTransfer = baseAmount;

  if (hasVat && hasDeduct) {
    netTransfer = baseAmount - deductAmount;
  } else if (hasDeduct) {
    // Withholding Tax without VAT: baseAmount - deductAmount (e.g. 20,000 - 600 = 19,400)
    netTransfer = baseAmount - deductAmount;
  } else {
    netTransfer = baseAmount;
  }

  values["ยอดโอน"] = netTransfer > 0 ? formatDecimal(netTransfer) : (baseAmount > 0 ? String(baseAmount) : "");

  // Auto-calculate "วันจ่าย" from "วันได้บิล" (or "ว/ด/ป") + "เครดิต"
  const creditDays = parseCreditDays(values["เครดิต"]);
  if (creditDays > 0) {
    const baseDate = values["วันได้บิล"] || values["ว/ด/ป"] || values["วันที่"];
    if (hasValue(baseDate)) {
      const dueDate = calculateDueDate(baseDate, creditDays);
      if (dueDate) {
        values["วันจ่าย"] = dueDate;
      }
    }
  }
}

function applyRefFill(values: Record<string, string>, field: FieldSchema, form: FormPayload, value: string) {
  if (field.type !== "Ref" || !field.refFill) return;
  const selectedOption = (form.refOptions[field.name] || []).find(option => String(option.value) === value);
  Object.entries(field.refFill).forEach(([targetField, sourceColumn]) => {
    if (sourceColumn.includes("{")) {
      values[targetField] = selectedOption ? sourceColumn.replace(/\{([^}]+)\}/g, (_, key) => {
        const val = selectedOption.row?.[key];
        if (typeof val === "number") return new Intl.NumberFormat("th-TH").format(val);
        if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") return new Intl.NumberFormat("th-TH").format(Number(val));
        return String(val ?? "");
      }) : "";
    } else {
      values[targetField] = selectedOption ? String(selectedOption.row?.[sourceColumn] ?? "") : "";
    }
  });
}

function sanitizeValuesForSubmit(values: Record<string, string>, form: FormPayload) {
  const next = { ...values };
  pruneHiddenConditionalValues(next, form);
  applyLocalFormulas(next, form.tableName);
  return next;
}

function validateVisibleRequiredFields(values: Record<string, string>, form: FormPayload) {
  const missingField = form.schema.find(field => {
    if (!field.required || field.type === "Hidden" || field.readonly) return false;
    if (!isFieldVisible(field, values)) return false;
    return !hasValue(values[field.name]);
  });

  return missingField ? `กรุณากรอก ${getFieldLabel(missingField)}` : "";
}

function pruneHiddenConditionalValues(values: Record<string, string>, form: FormPayload) {
  form.schema.forEach(field => {
    if (field.type === "Hidden") return;
    if (isFieldVisible(field, values)) return;
    values[field.name] = "";
  });
}

function isFieldVisible(field: FieldSchema, values: Record<string, string>) {
  if (!field.showIf) return true;
  const actual = values[field.showIf.column] || "";
  if (field.showIf.equals !== undefined) return actual === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(actual);
  if (field.showIf.notBlank) {
    if (field.showIf.column === "vat") return isVatActive(actual);
    if (field.showIf.column === "หัก") return parseDeductPercent(actual) > 0;
    if (field.showIf.column === "เครดิต") return parseCreditDays(actual) > 0;
    return hasValue(actual);
  }
  return true;
}

function getFieldClassName(field: FieldSchema) {
  if (field.type === "LongText" || field.type === "Image" || field.type === "File" || field.type === "EnumList" || field.name === "ร้านค้า/ผู้รับเหมา") {
    return "col-span-full";
  }
  return "";
}

function getFieldLabel(field: FieldSchema) {
  if (field.name === "วันออก 3%") return "วันออก";
  return field.name;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function toDateInputValue(value: string) {
  return toInputDateValue(value);
}

function normalizeBillDateInput(value: string) {
  return normalizeDateToIso(value);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

