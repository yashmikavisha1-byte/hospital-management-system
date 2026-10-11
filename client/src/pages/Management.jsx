import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";

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
            <tr key={row.id}>
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

export default function ManagementPage({ page }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [recordPatient, setRecordPatient] = useState("");
  const [record, setRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payingBill, setPayingBill] = useState("");

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
              throw new Error("Your account is not linked to a patient profile yet. Ask reception to link your profile.");
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
  }, [page, user.role]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const data = page === "patients" || page === "records" ? patients
      : page === "doctors" ? doctors
        : page === "appointments" ? appointments : bills;
    if (!query) return data;
    return data.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [appointments, bills, doctors, page, patients, search]);

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
          reason: values.reason,
        });
        const { data } = await api.get("/appointments");
        setAppointments(data);
        setSuccess("Appointment booked.");
      } else if (page === "records") {
        const { data } = await api.post(`/records/${recordPatient}`, { note: values.note });
        setRecord(data);
        setSuccess("Medical note added to the patient record.");
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

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <p className="page-kicker">WORKSPACE</p>
          <h1>{title}</h1>
          <p className="page-description">Manage {title.toLowerCase()} and keep your hospital organized.</p>
        </div>
      </div>

      {error && <div className="feedback feedback-error" role="alert">{error}</div>}
      {success && <div className="feedback feedback-success" role="status">{success}</div>}

      {page === "patients" && (
        <>
          {canCreatePatient && <section className="management-card"><div className="section-heading"><div><h2>Add a patient</h2><p>Create a patient profile in the directory.</p></div></div>
            <form className="management-form" onSubmit={submit}>
              <Field label="Full name" name="name" />
              <Field label="Age" name="age" type="number" min="0" max="120" />
              <Field label="Gender" name="gender"><select defaultValue="" name="gender" required><option disabled value="">Choose gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></Field>
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
        {canCreateAppointment && <section className="management-card"><div className="section-heading"><div><h2>Book an appointment</h2><p>Choose a patient, doctor, and visit time.</p></div></div>
          <form className="management-form" onSubmit={submit}>
            {user.role !== "patient" && <Field label="Patient" name="patientId"><select defaultValue="" name="patientId" required><option disabled value="">Select patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></Field>}
            <Field label="Doctor" name="doctorId"><select defaultValue="" name="doctorId" required><option disabled value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name} · {doctor.specialization}</option>)}</select></Field>
            <Field label="Date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} />
            <Field label="Time" name="time" type="time" />
            <Field label="Reason for visit" name="reason" required={false} />
            <button className="primary-action" disabled={saving} type="submit">{saving ? "Booking…" : "Book appointment"}</button>
          </form>
        </section>}
        <section className="management-card"><div className="section-heading"><div><h2>Appointment schedule</h2><p>{loading ? "Loading appointments…" : `${appointments.length} appointment${appointments.length === 1 ? "" : "s"}`}</p></div><input aria-label="Search appointments" className="table-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search schedule" value={search} /></div>
          {loading ? <EmptyState>Loading appointments…</EmptyState> : <Table columns={appointmentColumns} rows={filtered} empty="No appointments match your search." />}
        </section>
      </>}

      {page === "records" && <>
        <section className="management-card"><div className="section-heading"><div><h2>Find a patient record</h2><p>Select a patient to view their medical history.</p></div></div>
          <div className="record-picker"><select aria-label="Select patient record" onChange={(event) => event.target.value && openRecord(event.target.value)} value={recordPatient}><option value="">Select a patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name} · {patient.phone}</option>)}</select></div>
        </section>
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

      {["medicines", "lab", "wards"].includes(page) && (
        <section className="management-card">
          <div className="feature-placeholder"><span aria-hidden="true">{page === "medicines" ? "✚" : page === "lab" ? "⌕" : "▦"}</span><h2>{title} workspace</h2><p>This section needs a backend module before it can display or save real {title.toLowerCase()} data. Other connected pages are available from the menu.</p></div>
        </section>
      )}
    </div>
  );
}
