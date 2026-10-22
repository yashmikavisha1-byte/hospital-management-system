import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
const now = new Date();
const dashboardDate = formatDate(now);
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const currentTime = now.toTimeString().slice(0, 5);

function formatCurrency(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function getRequests(role) {
  const requests = {
    appointments: ["/appointments", "appointments"],
  };

  if (role === "admin") {
    requests.summary = ["/dashboard/summary", "hospital summary"];
  } else if (role === "patient") {
    requests.bills = ["/bills/mine", "bills"];
  } else if (role === "receptionist") {
    requests.bills = ["/bills", "bills"];
    requests.patients = ["/patients", "patients"];
    requests.doctors = ["/doctors", "doctors"];
  }

  return requests;
}

function getCards(role, data) {
  if (role === "admin") {
    return [
      { label: "Patients", value: data.summary?.totalPatients, link: "/patients", note: "Registered in the system" },
      { label: "Doctors", value: data.summary?.totalDoctors, link: "/doctors", note: "Active doctor profiles" },
      { label: "Appointments today", value: data.summary?.appointmentsToday, link: "/appointments", note: "Scheduled visits" },
      {
        label: "Outstanding balance",
        value: data.summary ? formatCurrency(data.summary.unpaidBalance) : null,
        link: "/bills",
        note: "Remaining across all bills",
      },
    ];
  }

  if (role === "doctor") {
    const appointments = data.appointments || [];
    const todaysVisits = appointments.filter(
      (appointment) => appointment.date === today && appointment.status === "booked",
    );
    const upcomingVisits = appointments.filter(
      (appointment) =>
        appointment.status === "booked" &&
        (appointment.date > today || (appointment.date === today && appointment.time >= currentTime)),
    );
    const patients = new Set(
      appointments
        .filter((appointment) => appointment.status !== "cancelled" && appointment.patient?._id)
        .map((appointment) => appointment.patient._id),
    );

    return [
      { label: "Today's appointments", value: data.appointments ? todaysVisits.length : null, link: "/appointments", note: "Booked for today" },
      { label: "Upcoming visits", value: data.appointments ? upcomingVisits.length : null, link: "/appointments", note: "Your booked schedule" },
      { label: "Patients scheduled", value: data.appointments ? patients.size : null, link: "/patients", note: "With an appointment on record" },
    ];
  }

  if (role === "patient") {
    const appointments = data.appointments || [];
    const upcomingVisits = appointments.filter(
      (appointment) =>
        appointment.status === "booked" &&
        (appointment.date > today || (appointment.date === today && appointment.time >= currentTime)),
    );
    const bills = data.bills || [];
    const outstanding = bills.reduce(
      (total, bill) => total + Math.max(0, (bill.total || 0) - (bill.paid || 0)),
      0,
    );

    return [
      { label: "Upcoming appointments", value: data.appointments ? upcomingVisits.length : null, link: "/appointments", note: "Your booked visits" },
      {
        label: "Completed visits",
        value: data.appointments ? appointments.filter((appointment) => appointment.status === "completed").length : null,
        link: "/appointments",
        note: "Visits in your appointment history",
      },
      { label: "Outstanding bills", value: data.bills ? formatCurrency(outstanding) : null, link: "/bills", note: "Remaining balance" },
    ];
  }

  const outstanding = data.bills?.reduce(
    (total, bill) => total + Math.max(0, (bill.total || 0) - (bill.paid || 0)),
    0,
  );
  return [
    { label: "Patients", value: data.patients?.length, link: "/patients", note: "Registered in the system" },
    { label: "Appointments", value: data.appointments?.length, link: "/appointments", note: "Visible appointments" },
    { label: "Doctors", value: data.doctors?.length, link: "/doctors", note: "Available doctor profiles" },
    { label: "Outstanding bills", value: outstanding == null ? null : formatCurrency(outstanding), link: "/bills", note: "Remaining balance" },
  ];
}

function getShortcuts(role) {
  if (role === "doctor") {
    return [
      ["/appointments", "◷", "My appointments", "Review your visit schedule"],
      ["/patients", "+", "Patient directory", "Find patient profiles"],
      ["/records", "▤", "Medical records", "Review and update care records"],
    ];
  }

  if (role === "patient") {
    return [
      ["/appointments", "◷", "My appointments", "Book or review your visits"],
      ["/records", "▤", "My records", "View your medical records"],
      ["/bills", "₹", "My bills", "Review your billing and payments"],
    ];
  }

  if (role === "receptionist") {
    return [
      ["/patients", "+", "Patient directory", "Find and manage patient profiles"],
      ["/appointments", "◷", "Appointments", "Review schedules and visit status"],
      ["/bills", "₹", "Billing center", "View balances and payment records"],
    ];
  }

  return [
    ["/patients", "+", "Patient directory", "Find and manage patient profiles"],
    ["/doctors", "✚", "Doctor directory", "Manage doctor profiles and schedules"],
    ["/medicines", "＋", "Pharmacy", "Review medicine inventory"],
  ];
}

function getHeading(role) {
  if (role === "doctor") {
    return {
      kicker: "CLINICAL WORKSPACE",
      description: "Your appointments and patient schedule at a glance.",
    };
  }
  if (role === "patient") {
    return {
      kicker: "YOUR CARE",
      description: "Keep track of your appointments and billing.",
    };
  }
  if (role === "receptionist") {
    return {
      kicker: "CARE OPERATIONS",
      description: "Here’s what’s happening across your workspace today.",
    };
  }
  return {
    kicker: "HOSPITAL OVERVIEW",
    description: "Here’s what’s happening across your hospital today.",
  };
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      const requests = getRequests(user.role);
      const results = await Promise.all(
        Object.entries(requests).map(async ([key, [path, label]]) => {
          try {
            const response = await api.get(path);
            return { key, label, data: response.data };
          } catch (requestError) {
            return { key, label, error: getErrorMessage(requestError, `Could not load ${label}.`) };
          }
        }),
      );

      if (!active) return;

      const nextData = {};
      const errors = [];
      for (const result of results) {
        if (result.error) {
          errors.push(result.error);
        } else {
          nextData[result.key] = result.data;
        }
      }
      setData(nextData);
      setError(errors.join(" "));
      setLoading(false);
    }

    loadDashboard();
    return () => { active = false; };
  }, [user.role]);

  const heading = getHeading(user.role);
  const cards = getCards(user.role, data);
  const upcoming = (data.appointments || []).filter(
    (appointment) =>
      appointment.status === "booked" &&
      (appointment.date > today || (appointment.date === today && appointment.time >= currentTime)),
  ).slice(0, 5);
  const shortcuts = getShortcuts(user.role);
  const isPatient = user.role === "patient";
  const isDoctor = user.role === "doctor";
  const appointmentHeading = isPatient ? "Your upcoming appointments" : isDoctor ? "Your upcoming visits" : "Upcoming appointments";
  const appointmentDescription = isPatient
    ? "Your booked visits"
    : isDoctor
      ? "Booked visits on your schedule"
      : "Booked visits scheduled from today onward";

  return (
    <div className="management-page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="page-kicker">{heading.kicker}</p>
          <h1>Good to see you, {user.name}</h1>
          <p className="page-description">{heading.description}</p>
        </div>
        <div className="today-chip">{dashboardDate}</div>
      </div>

      {error && <div className="feedback feedback-error" role="alert">{error}</div>}

      <section aria-label="Dashboard summary" className="dashboard-cards">
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
            <h2>{appointmentHeading}</h2>
            <p>{appointmentDescription}</p>
          </div>
          <Link className="text-link" to="/appointments">
            {isPatient ? "Manage appointments" : "View appointments"} <span aria-hidden="true">→</span>
          </Link>
        </div>
        {loading ? (
          <div className="empty-panel">Loading your dashboard…</div>
        ) : !data.appointments && error ? (
          <div className="empty-panel">Appointments could not be loaded.</div>
        ) : upcoming.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {!isPatient && <th>Patient</th>}
                  {!isDoctor && <th>Doctor</th>}
                  <th>Date &amp; time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((appointment) => (
                  <tr key={appointment._id}>
                    {!isPatient && (
                      <td>
                        <strong>{appointment.patient?.name || "Patient"}</strong>
                        <small>{appointment.patient?.phone || ""}</small>
                      </td>
                    )}
                    {!isDoctor && (
                      <td>
                        {appointment.doctor?.name || "Doctor"}
                        <small>{appointment.doctor?.specialization || ""}</small>
                      </td>
                    )}
                    <td>{appointment.date}<small>{appointment.time}</small></td>
                    <td><span className="state-pill state-booked">Booked</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel">
            {isPatient
              ? "You don’t have any upcoming appointments."
              : isDoctor
                ? "You don’t have any upcoming visits."
                : "No upcoming appointments to show."}
          </div>
        )}
      </section>

      <section aria-label="Quick links" className="dashboard-shortcuts">
        {shortcuts.map(([path, icon, title, description]) => (
          <Link key={path} to={path}>
            <span aria-hidden="true" className="shortcut-icon">{icon}</span>
            <span><strong>{title}</strong><small>{description}</small></span>
            <span aria-hidden="true" className="shortcut-arrow">→</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
