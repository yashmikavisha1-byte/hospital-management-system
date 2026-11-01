import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import { downloadPdf } from "../downloadPdf";

const titles = {
  patients: "Patients",
  doctors: "Doctors",
  appointments: "Appointments",
  records: "Medical records",
  bills: "Billing",
  medicines: "Pharmacy",
  lab: "Laboratory",
  wards: "Wards",
};

function formatError(error) {
  return error.response?.data?.message || error.message || "The request could not be completed.";
}

function displayDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${month}/${day}/${year}` : String(value);
}

function EmptyState({ children }) {
  return <div className="empty-panel">{children}</div>;
}

function Table({ columns, rows, empty }) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || row.id}>
              {columns.map((column) => <td key={column.label}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, name, type = "text", required = true, children, ...props }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children || <input name={name} required={required} type={type} {...props} />}
    </label>
  );
}

function PatientProfileForm({ onSubmit, saving, name }) {
  return (
    <section className="management-card">
      <div className="section-heading">
        <div>
          <h2>Create your patient profile</h2>
          <p>Complete your details once to book appointments and access your records.</p>
        </div>
      </div>
      <form className="management-form" onSubmit={onSubmit}>
        <Field label="Full name" name="name" defaultValue={name || ""} autoComplete="name" />
        <Field label="Age" name="age" type="number" min="0" max="120" />
        <Field label="Gender" name="gender">
          <select defaultValue="female" name="gender" required>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
        <Field label="Blood group" name="bloodGroup" required={false} placeholder="For example, O+" />
        <Field label="Address" name="address" required={false} autoComplete="street-address" />
        <button className="primary-action" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}

export default function ManagementPage({ page }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [wards, setWards] = useState([]);
  const [recordPatient, setRecordPatient] = useState("");
  const [record, setRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payingBill, setPayingBill] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      setRecord(null);
      try {
        let response;
        switch (page) {
          case "patients":
            response = await api.get("/patients");
            if (active) setPatients(response.data);
            break;
          case "doctors":
            response = await api.get("/doctors");
            if (active) setDoctors(response.data);
            break;
          case "appointments": {
            if (user.role === "patient") {
              const me = await api.get("/patients/me");
              if (!me.data) {
                if (active) { setNeedsProfile(true); setAppointments([]); }
                break;
              }
              if (active) setNeedsProfile(false);
            }
            const results = await Promise.all([
              api.get("/appointments"),
              api.get("/doctors"),
              user.role === "patient" ? Promise.resolve({ data: [] }) : api.get("/patients"),
            ]);
            if (active) {
              setAppointments(results[0].data);
              setDoctors(results[1].data);
              setPatients(results[2].data);
            }
            break;
          }
          case "records":
            if (user.role === "patient") {
              response = await api.get("/patients/me");
              if (active) {
                setNeedsProfile(!response.data);
                setRecord(response.data);
              }
              break;
            }
            response = await api.get("/patients");
            if (active) setPatients(response.data);
            break;
          case "bills": {
            const requests = [api.get(user.role === "patient" ? "/bills/mine" : "/bills")];
            if (["admin", "receptionist"].includes(user.role)) requests.push(api.get("/patients"));
            const results = await Promise.all(requests);
            if (active) {
              setBills(results[0].data);
              if (results[1]) setPatients(results[1].data);
            }
            break;
          }
          case "lab": {
            const requests = [api.get(user.role === "patient" ? "/lab/mine" : "/lab")];
            if (["admin", "doctor", "receptionist"].includes(user.role)) requests.push(api.get("/patients"));
            const results = await Promise.all(requests);
            if (active) {
              setLabReports(results[0].data);
              if (results[1]) setPatients(results[1].data);
            }
            break;
          }
          case "medicines":
            response = await api.get("/medicines");
            if (active) setMedicines(response.data);
            break;
          case "wards":
            response = await api.get("/wards");
            if (active) setWards(response.data);
            break;
          default:
            break;
        }
      } catch (loadError) {
        if (active) setError(formatError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, user.role, reloadKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const data = page === "patients" || page === "records" ? patients
      : page === "doctors" ? doctors
        : page === "appointments" ? appointments
          : page === "lab" ? labReports
            : page === "medicines" ? medicines
              : page === "wards" ? wards : bills;
    if (!query) return data;
    return data.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [appointments, bills, doctors, labReports, medicines, wards, page, patients, search]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (page === "patients") {
        await api.post("/patients", {
          name: values.name,
          age: Number(values.age),
          gender: values.gender,
          phone: values.phone,
          address: values.address,
          bloodGroup: values.bloodGroup,
        });
        const { data } = await api.get("/patients");
        setPatients(data);
        setSuccess("Patient profile created.");
      } else if (page === "doctors") {
        await api.post("/doctors", {
          name: values.name,
          email: values.email,
          password: values.password,
          specialization: values.specialization,
          phone: values.phone,
        });
        const { data } = await api.get("/doctors");
        setDoctors(data);
        setSuccess("Doctor account and profile created.");
      } else if (page === "appointments") {
        await api.post("/appointments", {
          patientId: user.role === "patient" ? undefined : values.patientId,
          doctorId: values.doctorId,
          date: values.date,
          time: values.time,
        });
        const { data } = await api.get("/appointments");
        setAppointments(data);
        setSuccess("Appointment booked.");
      } else if (page === "records") {
        const { data } = await api.post(`/records/${recordPatient}`, { note: values.note });
        setRecord(data);
        setSuccess("Medical note added to the patient record.");
      } else if (page === "lab") {
        const { data } = await api.post("/lab", {
          patientId: values.patientId,
          testName: values.testName,
          result: values.result,
          status: values.status,
        });
        setLabReports((current) => [data, ...current]);
        setSuccess("Lab report added.");
      } else if (page === "medicines") {
        await api.post("/medicines", {
          name: values.name,
          category: values.category,
          quantity: Number(values.quantity),
          price: Number(values.price),
          expiryDate: values.expiryDate,
          reorderLevel: Number(values.reorderLevel || 10),
        });
        const { data } = await api.get("/medicines");
        setMedicines(data);
        setSuccess("Medicine added.");
      } else if (page === "wards") {
        await api.post("/wards", {
          name: values.name,
          type: values.type,
          bedCount: Number(values.bedCount),
        });
        const { data } = await api.get("/wards");
        setWards(data);
        setSuccess("Ward created.");
      } else if (page === "bills") {
        const { data } = await api.post("/bills", {
          patientId: values.patientId,
          items: [{ description: values.description, amount: Number(values.amount) }],
        });
        setBills((current) => [data, ...current]);
        setSuccess("Bill created.");
      }
      form.reset();
    } catch (submitError) {
      setError(formatError(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function createMyProfile(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const v = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = await api.post("/patients/me", {
        name: String(v.name || "").trim(),
        age: Number(v.age),
        gender: v.gender,
        phone: String(v.phone || "").trim(),
        address: String(v.address || "").trim(),
        bloodGroup: String(v.bloodGroup || "").trim(),
      });
      setNeedsProfile(false);
      setRecord(data);
      setSuccess("Your patient profile is saved and linked to your account.");
      if (page === "appointments") setReloadKey((key) => key + 1);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateAppointment(id, action) {
    setError("");
    setSuccess("");
    try {
      await api.put(`/appointments/${id}/${action}`);
      const { data } = await api.get("/appointments");
      setAppointments(data);
      setSuccess(action === "cancel" ? "Appointment cancelled." : "Appointment marked complete.");
    } catch (actionError) {
      setError(formatError(actionError));
    }
  }

  async function openRecord(patientId) {
    setRecordPatient(patientId);
    setRecord(null);
    setError("");
    try {
      const { data } = await api.get(`/records/${patientId}`);
      setRecord(data);
    } catch (recordError) {
      setError(formatError(recordError));
    }
  }

  async function submitPayment(event, billId) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post(`/bills/${billId}/pay`, { amount: Number(values.amount), method: values.method });
      const { data } = await api.get("/bills");
      setBills(data);
      setPayingBill("");
      setSuccess("Payment recorded.");
    } catch (paymentError) {
      setError(formatError(paymentError));
    }
  }

  const title = titles[page] || "Page";
  const canCreatePatient = ["admin", "receptionist"].includes(user.role);
  const canCreateDoctor = user.role === "admin";
  const canCreateAppointment = ["admin", "receptionist", "patient"].includes(user.role);
  const canCreateBill = ["admin", "receptionist"].includes(user.role);
  const canCreateLab = ["admin", "doctor", "receptionist"].includes(user.role);
  const canManageMedicines = user.role === "admin";
  const canManageWards = user.role === "admin";
  const canAddRecord = ["admin", "doctor"].includes(user.role);

  const patientColumns = [
    { label: "Patient", render: (row) => <div className="table-person"><strong>{row.name}</strong><small>{row._id}</small></div> },
    { label: "Age / gender", render: (row) => `${row.age} / ${row.gender}` },
    { label: "Phone", render: (row) => row.phone },
    { label: "Blood group", render: (row) => row.bloodGroup || "—" },
    { label: "Added", render: (row) => displayDate(row.createdAt) },
  ];
  const doctorColumns = [
    { label: "Doctor", render: (row) => <div className="table-person"><strong>{row.name}</strong><small>{row.phone || "No phone listed"}</small></div> },
    { label: "Specialization", render: (row) => row.specialization },
    { label: "Schedule", render: (row) => row.schedule?.length ? `${row.schedule.length} shifts` : "Schedule not set" },
  ];
  const appointmentColumns = [
    { label: "Patient", render: (row) => <div className="table-person"><strong>{row.patient?.name || "Patient"}</strong><small>{row.patient?.phone || ""}</small></div> },
    { label: "Doctor", render: (row) => <div className="table-person"><strong>{row.doctor?.name || "Doctor"}</strong><small>{row.doctor?.specialization || ""}</small></div> },
    { label: "Date & time", render: (row) => <div className="table-person"><strong>{row.date}</strong><small>{row.time}</small></div> },
    { label: "Status", render: (row) => <span className={`state-pill state-${row.status}`}>{row.status}</span> },
    { label: "Actions", render: (row) => row.status === "booked" ? <div className="table-actions">{["admin", "doctor"].includes(user.role) && <button className="small-action" onClick={() => updateAppointment(row._id, "complete")} type="button">Complete</button>}{["admin", "receptionist", "patient"].includes(user.role) && <button className="small-action danger-action" onClick={() => updateAppointment(row._id, "cancel")} type="button">Cancel</button>}</div> : "—" },
  ];
  const billColumns = [
    { label: "Bill", render: (row) => <div className="table-person"><strong>{row._id}</strong><small>{displayDate(row.createdAt)}</small></div> },
    { label: "Patient", render: (row) => row.patient?.name || "Patient" },
    { label: "Items", render: (row) => row.items?.map((item) => item.description).join(", ") || "—" },
    { label: "Total", render: (row) => `₹${(row.total || 0).toLocaleString()}` },
    { label: "Balance", render: (row) => `₹${Math.max(0, (row.total || 0) - (row.paid || 0)).toLocaleString()}` },
    { label: "Status", render: (row) => <span className={`state-pill state-${row.status}`}>{row.status}</span> },
    { label: "Actions", render: (row) => canCreateBill && row.status !== "paid" ? <button className="small-action" onClick={() => setPayingBill(row._id)} type="button">Record payment</button> : "—" },
  ];
  const labColumns = [
    { label: "Test", render: (row) => <div className="table-person"><strong>{row.testName}</strong><small>{displayDate(row.createdAt)}</small></div> },
    { label: "Patient", render: (row) => row.patient?.name || "Patient" },
    { label: "Result", render: (row) => row.result || "—" },
    { label: "Ordered by", render: (row) => row.orderedBy || "—" },
    { label: "Status", render: (row) => <span className={`state-pill state-${row.status}`}>{row.status}</span> },
  ];
  const medicineColumns = [
    { label: "Medicine", render: (row) => <div className="table-person"><strong>{row.name}</strong><small>{row.category || "—"}</small></div> },
    { label: "Stock", render: (row) => <span className={`state-pill ${row.quantity <= (row.reorderLevel ?? 10) ? "state-cancelled" : "state-completed"}`}>{row.quantity}</span> },
    { label: "Price", render: (row) => `Rs. ${(row.price || 0).toLocaleString()}` },
    { label: "Expiry", render: (row) => row.expiryDate || "—" },
    { label: "Reorder level", render: (row) => row.reorderLevel ?? "—" },
  ];
  const wardColumns = [
    { label: "Ward", render: (row) => <div className="table-person"><strong>{row.name}</strong><small>{row.type}</small></div> },
    { label: "Total beds", render: (row) => row.totalBeds },
    { label: "Available", render: (row) => row.availableBeds },
    { label: "Occupied", render: (row) => row.occupiedBeds },
  ];

  function handleDownloadPdf() {
    const configs = {
      patients: {
        title: "Patients",
        columns: ["Patient", "Age / Gender", "Phone", "Blood group", "Added"],
        rows: filtered.map((r) => [r.name, `${r.age} / ${r.gender}`, r.phone, r.bloodGroup || "-", displayDate(r.createdAt)]),
      },
      doctors: {
        title: "Doctors",
        columns: ["Doctor", "Specialization", "Phone"],
        rows: filtered.map((r) => [r.name, r.specialization, r.phone || "-"]),
      },
      appointments: {
        title: "Appointments",
        columns: ["Patient", "Doctor", "Date", "Time", "Status"],
        rows: filtered.map((r) => [r.patient?.name || "-", r.doctor?.name || "-", r.date, r.time, r.status]),
      },
      bills: {
        title: user.role === "patient" ? "My Bills" : "Billing Records",
        columns: ["Bill ID", "Date", "Patient", "Items", "Total", "Balance", "Status"],
        rows: filtered.map((r) => [
          r._id,
          displayDate(r.createdAt),
          r.patient?.name || "-",
          r.items?.map((i) => i.description).join(", ") || "-",
          `Rs. ${(r.total || 0).toLocaleString()}`,
          `Rs. ${Math.max(0, (r.total || 0) - (r.paid || 0)).toLocaleString()}`,
          r.status,
        ]),
      },
      lab: {
        title: user.role === "patient" ? "My Lab Reports" : "Lab Reports",
        columns: ["Test", "Date", "Patient", "Result", "Ordered by", "Status"],
        rows: filtered.map((r) => [
          r.testName,
          displayDate(r.createdAt),
          r.patient?.name || "-",
          r.result || "-",
          r.orderedBy || "-",
          r.status,
        ]),
      },
      medicines: {
        title: "Pharmacy Stock",
        columns: ["Medicine", "Category", "Stock", "Price", "Expiry", "Reorder level"],
        rows: filtered.map((r) => [r.name, r.category || "-", r.quantity, `Rs. ${(r.price || 0).toLocaleString()}`, r.expiryDate || "-", r.reorderLevel ?? "-"]),
      },
      wards: {
        title: "Wards",
        columns: ["Ward", "Type", "Total beds", "Available", "Occupied"],
        rows: filtered.map((r) => [r.name, r.type, r.totalBeds, r.availableBeds, r.occupiedBeds]),
      },
    };
    const config = configs[page];
    if (!config) return;
    downloadPdf({ ...config, filename: `${page}-report.pdf` });
  }

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <p className="page-kicker">WORKSPACE</p>
          <h1>{title}</h1>
          <p className="page-description">Manage {title.toLowerCase()} and keep your hospital organized.</p>
        </div>
        {["patients", "doctors", "appointments", "bills", "lab", "medicines", "wards"].includes(page) && (
          <button className="primary-action" type="button" onClick={handleDownloadPdf} disabled={loading}>
            Download PDF
          </button>
        )}
      </div>

      {error && <div className="feedback feedback-error" role="alert">{error}</div>}
      {success && <div className="feedback feedback-success" role="status">{success}</div>}

      {page === "patients" && (
        <>
          {canCreatePatient && <section className="management-card"><div className="section-heading"><div><h2>Add a patient</h2><p>Create a patient profile in the directory.</p></div></div>
            <form className="management-form" onSubmit={submit}>
              <Field label="Full name" name="name" />
              <Field label="Age" name="age" type="number" min="0" max="120" />
              <Field label="Gender" name="gender"><select defaultValue="female" name="gender" required><option value="female">Female</option><option value="male">Male</option></select></Field>
              <Field label="Phone" name="phone" type="tel" />
              <Field label="Blood group" name="bloodGroup" required={false} />
              <Field label="Address" name="address" required={false} />
              <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Create patient"}</button>
            </form>
          </section>}
          <section className="management-card">
            <div className="section-heading"><div><h2>Patient directory</h2><p>{loading ? "Loading patient profiles…" : `${patients.length} patient${patients.length === 1 ? "" : "s"} found`}</p></div><input aria-label="Search patients" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" value={search} /></div>
            {loading ? <EmptyState>Loading patients…</EmptyState> : <Table columns={patientColumns} rows={filtered} empty="No patient profiles match your search." />}
          </section>
        </>
      )}

      {page === "doctors" && <section className="management-card">
        {canCreateDoctor && <><div className="section-heading"><div><h2>Add a doctor</h2><p>Create a doctor profile and sign-in account.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            <Field label="Full name" name="name" /><Field label="Email" name="email" type="email" /><Field label="Temporary password" name="password" type="password" minLength="8" /><Field label="Specialization" name="specialization" /><Field label="Phone" name="phone" type="tel" required={false} />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Create doctor"}</button>
          </form><div className="section-divider" /></>}
        <div className="section-heading"><div><h2>Doctor directory</h2><p>{loading ? "Loading doctor profiles…" : `${doctors.length} doctor${doctors.length === 1 ? "" : "s"} found`}</p></div><input aria-label="Search doctors" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors" value={search} /></div>
        {loading ? <EmptyState>Loading doctors…</EmptyState> : <Table columns={doctorColumns} rows={filtered} empty="No doctor profiles found." />}
      </section>}

      {page === "appointments" && <>
        {user.role === "patient" && needsProfile && (
          <PatientProfileForm onSubmit={createMyProfile} saving={saving} name={user.name} />
        )}
        {canCreateAppointment && !needsProfile && <section className="management-card"><div className="section-heading"><div><h2>Book an appointment</h2><p>Choose a patient, doctor, and visit time.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            {user.role !== "patient" && <Field label="Patient" name="patientId"><select defaultValue="" name="patientId" required><option disabled value="">Select patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></Field>}
            <Field label="Doctor" name="doctorId"><select defaultValue="" name="doctorId" required><option disabled value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name} · {doctor.specialization}</option>)}</select></Field>
            <Field label="Date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} />
            <Field label="Time" name="time" type="time" />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Booking…" : "Book appointment"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>Appointment schedule</h2><p>{loading ? "Loading appointments…" : `${appointments.length} appointment${appointments.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search appointments" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search schedule" value={search} /></div>
          {loading ? <EmptyState>Loading appointments…</EmptyState> : <Table columns={appointmentColumns} rows={filtered} empty="No appointments match your search." />}
        </section>
      </>}

      {page === "records" && <>
        {user.role === "patient" && needsProfile && (
          <PatientProfileForm onSubmit={createMyProfile} saving={saving} name={user.name} />
        )}
        {user.role !== "patient" && (
          <section className="management-card"><div className="section-heading"><div><h2>Find a patient record</h2><p>Select a patient to view their medical history.</p></div></div>
            <div className="record-picker"><select aria-label="Select patient record" onChange={(event) => event.target.value && openRecord(event.target.value)} value={recordPatient}><option value="">Select a patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></div>
          </section>
        )}
        {record && <section className="management-card"><div className="section-heading"><div><h2>{record.name}</h2><p>{record.age} years · {record.gender} · Blood group {record.bloodGroup || "not listed"}</p></div></div>
          {canAddRecord && <form className="record-note-form" onSubmit={submit}><Field label="Add a medical note" name="note"><textarea name="note" placeholder="Enter visit notes or medical history…" required rows="3" /></Field><button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Add note"}</button></form>}
          <div className="history-list">{record.history?.length ? record.history.slice().reverse().map((entry, index) => <article className="history-entry" key={`${entry.date}-${index}`}><div><strong>{entry.addedBy || "Care team"}</strong><time>{entry.date ? new Date(entry.date).toLocaleString() : ""}</time></div><p>{entry.note}</p></article>) : <EmptyState>No medical notes have been recorded for this patient.</EmptyState>}</div>
        </section>}
      </>}

      {page === "bills" && <>
        {canCreateBill && <section className="management-card"><div className="section-heading"><div><h2>Create a bill</h2><p>Add a charge to a patient’s account.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            <Field label="Patient" name="patientId"><select defaultValue="" name="patientId" required><option disabled value="">Select patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></Field>
            <Field label="Description" name="description" />
            <Field label="Amount (₹)" name="amount" type="number" min="1" step="0.01" />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Create bill"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>{user.role === "patient" ? "My bills" : "Billing records"}</h2><p>{loading ? "Loading bills…" : `${bills.length} bill${bills.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search bills" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search billing records" value={search} /></div>
          {loading ? <EmptyState>Loading bills…</EmptyState> : <Table columns={billColumns} rows={filtered} empty="No bills match your search." />}
        </section>
        {payingBill && <div className="dialog-backdrop"><section aria-labelledby="payment-title" aria-modal="true" className="payment-dialog" role="dialog"><h2 id="payment-title">Record payment</h2><form className="management-form" onSubmit={(event) => submitPayment(event, payingBill)}><Field label="Amount (₹)" name="amount" type="number" min="0.01" step="0.01" /><Field label="Payment method" name="method"><select defaultValue="cash" name="method"><option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option></select></Field><div className="dialog-actions"><button className="secondary-action" onClick={() => setPayingBill("")} type="button">Cancel</button><button className="primary-action" type="submit">Save payment</button></div></form></section></div>}
      </>}

      {page === "lab" && <>
        {canCreateLab && <section className="management-card"><div className="section-heading"><div><h2>Add a lab report</h2><p>Record a test result for a patient.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            <Field label="Patient" name="patientId"><select defaultValue="" name="patientId" required><option disabled value="">Select patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></Field>
            <Field label="Test name" name="testName" />
            <Field label="Result" name="result" required={false} />
            <Field label="Status" name="status"><select defaultValue="pending" name="status"><option value="pending">Pending</option><option value="completed">Completed</option></select></Field>
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Add report"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>{user.role === "patient" ? "My lab reports" : "Lab reports"}</h2><p>{loading ? "Loading lab reports…" : `${labReports.length} report${labReports.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search lab reports" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search lab reports" value={search} /></div>
          {loading ? <EmptyState>Loading lab reports…</EmptyState> : <Table columns={labColumns} rows={filtered} empty="No lab reports found." />}
        </section>
      </>}

      {page === "medicines" && <>
        {canManageMedicines && <section className="management-card"><div className="section-heading"><div><h2>Add a medicine</h2><p>Add a new medicine to the pharmacy stock.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            <Field label="Medicine name" name="name" />
            <Field label="Category" name="category" required={false} placeholder="For example, Antibiotic" />
            <Field label="Quantity" name="quantity" type="number" min="0" />
            <Field label="Price per unit (Rs.)" name="price" type="number" min="0" step="0.01" />
            <Field label="Expiry date" name="expiryDate" type="date" required={false} />
            <Field label="Reorder level" name="reorderLevel" type="number" min="0" required={false} placeholder="10" />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Add medicine"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>Medicine stock</h2><p>{loading ? "Loading medicines…" : `${medicines.length} medicine${medicines.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search medicines" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search medicines" value={search} /></div>
          {loading ? <EmptyState>Loading medicines…</EmptyState> : <Table columns={medicineColumns} rows={filtered} empty="No medicines found." />}
        </section>
      </>}

      {page === "wards" && <>
        {canManageWards && <section className="management-card"><div className="section-heading"><div><h2>Create a ward</h2><p>Beds are numbered automatically.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            <Field label="Ward name" name="name" />
            <Field label="Type" name="type"><select defaultValue="general" name="type"><option value="general">General</option><option value="icu">ICU</option><option value="private">Private</option><option value="maternity">Maternity</option></select></Field>
            <Field label="Number of beds" name="bedCount" type="number" min="1" />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Saving…" : "Create ward"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>Ward overview</h2><p>{loading ? "Loading wards…" : `${wards.length} ward${wards.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search wards" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search wards" value={search} /></div>
          {loading ? <EmptyState>Loading wards…</EmptyState> : <Table columns={wardColumns} rows={filtered} empty="No wards found." />}
        </section>
      </>}
    </div>
  );
}