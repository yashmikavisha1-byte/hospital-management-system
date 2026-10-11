import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
const dashboardDate = formatDate(new Date());

export default function Home() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ patients: null, appointments: null, doctors: null, bills: null });
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      const canListPatients = ["admin", "receptionist", "doctor"].includes(user.role);
      const canListDoctors = ["admin", "receptionist", "patient"].includes(user.role);
      const [appointmentsResult, billsResult, patientsResult, doctorsResult] = await Promise.all([
        api.get("/appointments").then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason })),
        api.get(user.role === "patient" ? "/bills/mine" : "/bills").then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason })),
        canListPatients
          ? api.get("/patients").then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }))
          : Promise.resolve(null),
        canListDoctors
          ? api.get("/doctors").then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }))
          : Promise.resolve(null),
      ]);
      if (!active) return;

      if (appointmentsResult.status === "fulfilled") {
        setAppointments(appointmentsResult.value.data);
      } else {
        setError(appointmentsResult.reason.response?.data?.message || "Could not load appointments.");
      }
      setSummary({
        patients: patientsResult?.status === "fulfilled" ? patientsResult.value.data.length : null,
        appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value.data.length : null,
        doctors: doctorsResult?.status === "fulfilled" ? doctorsResult.value.data.length : null,
        bills: billsResult.status === "fulfilled" ? billsResult.value.data : null,
      });
      setLoading(false);
    }
    loadDashboard();
    return () => { active = false; };
  }, [user.role]);

  const outstanding = summary.bills?.reduce(
    (total, bill) => total + Math.max(0, (bill.total || 0) - (bill.paid || 0)),
    0,
  );
  const cards = [
    { label: "Patients", value: summary.patients, link: "/patients", note: "Registered in the system" },
    { label: "Appointments", value: summary.appointments, link: "/appointments", note: "All visible appointments" },
    { label: "Doctors", value: summary.doctors, link: "/doctors", note: "Available doctor profiles" },
    { label: "Outstanding bills", value: outstanding == null ? null : `₹${outstanding.toLocaleString()}`, link: "/bills", note: "Remaining balance" },
  ];
  const upcoming = appointments
    .filter((appointment) => appointment.status === "booked")
    .slice(0, 5);

  return (
    <div className="management-page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="page-kicker">HOSPITAL OVERVIEW</p>
          <h1>Good to see you, {user.name}</h1>
          <p className="page-description">Here’s what’s happening across your workspace today.</p>
        </div>
        <div className="today-chip">{dashboardDate}</div>
      </div>

      {error && <div className="feedback feedback-error" role="alert">{error}</div>}

      <section className="dashboard-cards">
        {cards.map((card) => (
          <Link className="dashboard-card" key={card.label} to={card.link}>
            <span>{card.label}</span>
            <strong>{loading ? "…" : card.value ?? "—"}</strong>
            <small>{card.note}</small>
          </Link>
        ))}
      </section>

      <section className="management-card dashboard-appointments">
        <div className="section-heading">
          <div>
            <h2>Upcoming appointments</h2>
            <p>Booked visits visible to your account</p>
          </div>
          <Link className="text-link" to="/appointments">View appointments <span aria-hidden="true">→</span></Link>
        </div>
        {loading ? (
          <div className="empty-panel">Loading your dashboard…</div>
        ) : upcoming.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Patient</th><th>Doctor</th><th>Date &amp; time</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map((appointment) => (
                  <tr key={appointment._id}>
                    <td><strong>{appointment.patient?.name || "Patient"}</strong><small>{appointment.patient?.phone || ""}</small></td>
                    <td>{appointment.doctor?.name || "Doctor"}<small>{appointment.doctor?.specialization || ""}</small></td>
                    <td>{appointment.date}<small>{appointment.time}</small></td>
                    <td><span className="state-pill state-booked">Booked</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel">No upcoming appointments to show.</div>
        )}
      </section>

      <section className="dashboard-shortcuts">
        <Link to="/patients"><span className="shortcut-icon">+</span><span><strong>Patient directory</strong><small>Find and manage patient profiles</small></span><span className="shortcut-arrow">→</span></Link>
        <Link to="/appointments"><span className="shortcut-icon">◷</span><span><strong>Appointments</strong><small>Review schedules and visit status</small></span><span className="shortcut-arrow">→</span></Link>
        <Link to="/bills"><span className="shortcut-icon">₹</span><span><strong>Billing center</strong><small>View balances and payment records</small></span><span className="shortcut-arrow">→</span></Link>
      </section>
    </div>
  );
}
