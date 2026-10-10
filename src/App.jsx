
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const AREAS = [
  "Livingston",
  "Walker",
  "Denham Springs",
  "Watson",
  "Springfield",
  "Albany",
  "French Settlement",
  "Port Vincent",
  "Killian",
  "Holden",
];

const AGENCIES = {
  POLICE: { label: "Law Enforcement", short: "LE", prefix: "LPSO", color: "#60a5fa" },
  FIRE: { label: "Fire Department", short: "FIRE", prefix: "FIRE", color: "#fb7185" },
  EMS: { label: "EMS", short: "EMS", prefix: "EMS", color: "#34d399" },
};

const INCIDENTS = [
  { type: "Traffic Stop", category: "POLICE", priority: "P4", details: "Vehicle stopped for a traffic violation." },
  { type: "Suspicious Person", category: "POLICE", priority: "P3", details: "Caller reports suspicious activity in the area." },
  { type: "Disturbance", category: "POLICE", priority: "P2", details: "Caller reports a disturbance. Further details pending." },
  { type: "Motor Vehicle Crash", category: "POLICE", priority: "P2", details: "Reported vehicle collision. Check for injuries." },
  { type: "Welfare Check", category: "POLICE", priority: "P3", details: "Request to check on a person's welfare." },
  { type: "Structure Fire", category: "FIRE", priority: "P1", details: "Reported structure fire. Confirm conditions on arrival." },
  { type: "Smoke Investigation", category: "FIRE", priority: "P3", details: "Caller reports smoke in the area." },
  { type: "Vehicle Fire", category: "FIRE", priority: "P2", details: "Reported vehicle fire. Approach with caution." },
  { type: "Medical Emergency", category: "EMS", priority: "P2", details: "Medical response requested. Patient details pending." },
  { type: "Breathing Difficulty", category: "EMS", priority: "P1", details: "Caller reports a person experiencing breathing difficulty." },
  { type: "Fall Injury", category: "EMS", priority: "P3", details: "Medical assessment requested following a reported fall." },
  { type: "Vehicle Crash with Injuries", category: "EMS", priority: "P1", details: "Reported crash with possible injuries." },
];

const INITIAL_UNITS = [
  { id: "LPSO-101", agency: "POLICE", area: "Livingston", status: "Available", callId: null },
  { id: "LPSO-102", agency: "POLICE", area: "Walker", status: "Available", callId: null },
  { id: "LPSO-103", agency: "POLICE", area: "Denham Springs", status: "Available", callId: null },
  { id: "LPSO-104", agency: "POLICE", area: "Watson", status: "Available", callId: null },
  { id: "LPSO-105", agency: "POLICE", area: "Albany", status: "Available", callId: null },
  { id: "FIRE-1", agency: "FIRE", area: "Livingston", status: "Available", callId: null },
  { id: "FIRE-2", agency: "FIRE", area: "Denham Springs", status: "Available", callId: null },
  { id: "FIRE-3", agency: "FIRE", area: "Walker", status: "Available", callId: null },
  { id: "EMS-1", agency: "EMS", area: "Livingston", status: "Available", callId: null },
  { id: "EMS-2", agency: "EMS", area: "Denham Springs", status: "Available", callId: null },
  { id: "EMS-3", agency: "EMS", area: "Walker", status: "Available", callId: null },
];

const CALL_STATUSES = ["Pending", "Dispatched", "En Route", "On Scene", "Cleared"];
const UNIT_STATUSES = ["Available", "En Route", "On Scene", "Transporting", "Out of Service"];

function readSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function clock() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function makeId() {
  return `LP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
}

function createCall() {
  const incident = INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
  const area = AREAS[Math.floor(Math.random() * AREAS.length)];
  const road = [
    "LA Highway 16",
    "US Highway 190",
    "LA Highway 42",
    "LA Highway 447",
    "LA Highway 22",
    "LA Highway 1034",
    "LA Highway 1019",
    "I-12",
    "Main Street",
    "Church Street",
    "Florida Boulevard",
    "Range Avenue",
  ][Math.floor(Math.random() * 12)];

  return {
    id: makeId(),
    type: incident.type,
    agency: incident.category,
    priority: incident.priority,
    area,
    location: `${road}, ${area}, LA`,
    details: incident.details,
    status: "Pending",
    units: [],
    created: clock(),
    createdAt: Date.now(),
    notes: [],
  };
}

function initialCalls() {
  return [
    {
      id: "LP-240101",
      type: "Motor Vehicle Crash",
      agency: "POLICE",
      priority: "P2",
      area: "Denham Springs",
      location: "Florida Boulevard, Denham Springs, LA",
      details: "Two-vehicle collision reported. Injuries not confirmed.",
      status: "Dispatched",
      units: ["LPSO-103", "EMS-2"],
      created: clock(),
      createdAt: Date.now() - 180000,
      notes: [],
    },
    {
      id: "LP-240102",
      type: "Medical Emergency",
      agency: "EMS",
      priority: "P2",
      area: "Walker",
      location: "US Highway 190, Walker, LA",
      details: "Medical assistance requested. Patient details pending.",
      status: "En Route",
      units: ["EMS-3"],
      created: clock(),
      createdAt: Date.now() - 90000,
      notes: [],
    },
  ];
}

export default function App() {
  const [calls, setCalls] = useState(() =>
    readSaved("lpds-v2-calls", initialCalls())
  );
  const [units, setUnits] = useState(() =>
    readSaved("lpds-v2-units", INITIAL_UNITS)
  );
  const [radio, setRadio] = useState(() =>
    readSaved("lpds-v2-radio", [
      { id: 1, time: clock(), channel: "DISPATCH", unit: "SYSTEM", message: "Dispatch console initialized." },
      { id: 2, time: clock(), channel: "DISPATCH", unit: "SYSTEM", message: "Simulation mode active. No real emergency services connected." },
    ])
  );
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Active");
  const [agencyFilter, setAgencyFilter] = useState("ALL");
  const [note, setNote] = useState("");
  const [radioMessage, setRadioMessage] = useState("");
  const [radioChannel, setRadioChannel] = useState("DISPATCH");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("lpds-v2-calls", JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    localStorage.setItem("lpds-v2-units", JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem("lpds-v2-radio", JSON.stringify(radio.slice(0, 250)));
  }, [radio]);

  useEffect(() => {
    if (!autoGenerate) return undefined;
    const timer = window.setInterval(() => {
      addCall(true);
    }, 45000);
    return () => window.clearInterval(timer);
  }, [autoGenerate]);

  const selectedCall = calls.find((call) => call.id === selectedId) || null;

  const visibleCalls = useMemo(() => {
    return calls
      .filter((call) => {
        const matchesFilter =
          filter === "All" ||
          (filter === "Active" && call.status !== "Cleared") ||
          (filter === "Pending" && call.status === "Pending") ||
          (filter === "Cleared" && call.status === "Cleared");

        const matchesAgency =
          agencyFilter === "ALL" || call.agency === agencyFilter;

        const text = `${call.id} ${call.type} ${call.area} ${call.location} ${call.details}`.toLowerCase();
        return matchesFilter && matchesAgency && text.includes(search.toLowerCase());
      })
      .sort((a, b) => {
        const priorityOrder = { P1: 1, P2: 2, P3: 3, P4: 4 };
        if (a.status === "Cleared" && b.status !== "Cleared") return 1;
        if (b.status === "Cleared" && a.status !== "Cleared") return -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt - a.createdAt;
      });
  }, [calls, filter, agencyFilter, search]);

  const activeCount = calls.filter((call) => call.status !== "Cleared").length;
  const pendingCount = calls.filter((call) => call.status === "Pending").length;
  const availableCount = units.filter((unit) => unit.status === "Available").length;
  const criticalCount = calls.filter((call) => call.priority === "P1" && call.status !== "Cleared").length;

  function addRadio(message, unit = "DISPATCH", channel = "DISPATCH") {
    setRadio((current) => [
      { id: `${Date.now()}-${Math.random()}`, time: clock(), channel, unit, message },
      ...current,
    ].slice(0, 250));
  }

  function addCall(silent = false) {
    const call = createCall();
    setCalls((current) => [call, ...current]);
    setSelectedId(call.id);
    addRadio(`New ${call.priority} call: ${call.type}, ${call.area}. Call ID ${call.id}.`);
    if (!silent) setNotice(`Created ${call.id}`);
  }

  function updateCall(callId, changes) {
    setCalls((current) =>
      current.map((call) => call.id === callId ? { ...call, ...changes } : call)
    );
  }

  function dispatchSelected() {
    if (!selectedCall) return;
    if (selectedCall.status === "Cleared") return;

    const assigned = selectedCall.units || [];
    const eligible = units.filter(
      (unit) =>
        unit.status === "Available" &&
        unit.agency === selectedCall.agency &&
        !assigned.includes(unit.id)
    );

    if (eligible.length === 0) {
      setNotice(`No available ${AGENCIES[selectedCall.agency].label} units.`);
      return;
    }

    const unit = eligible.find((item) => item.area === selectedCall.area) || eligible[0];
    const newUnits = [...assigned, unit.id];

    setUnits((current) =>
      current.map((item) =>
        item.id === unit.id
          ? { ...item, status: "En Route", callId: selectedCall.id }
          : item
      )
    );

    updateCall(selectedCall.id, {
      units: newUnits,
      status: "En Route",
    });

    addRadio(`${unit.id}, respond to ${selectedCall.type} at ${selectedCall.location}.`, unit.id);
    setNotice(`${unit.id} assigned to ${selectedCall.id}`);
  }

  function assignUnit(unitId) {
    if (!selectedCall || selectedCall.status === "Cleared") return;

    const unit = units.find((item) => item.id === unitId);
    if (!unit || unit.status !== "Available") {
      setNotice("Choose an available unit.");
      return;
    }

    setUnits((current) =>
      current.map((item) =>
        item.id === unitId
          ? { ...item, status: "En Route", callId: selectedCall.id }
          : item
      )
    );

    updateCall(selectedCall.id, {
      units: [...new Set([...(selectedCall.units || []), unitId])],
      status: "En Route",
    });

    addRadio(`${unitId} assigned to ${selectedCall.id}, ${selectedCall.location}.`, unitId);
    setNotice(`${unitId} assigned`);
  }

  function changeCallStatus(status) {
    if (!selectedCall) return;

    if (status === "Cleared") {
      setUnits((current) =>
        current.map((unit) =>
          (selectedCall.units || []).includes(unit.id)
            ? { ...unit, status: "Available", callId: null }
            : unit
        )
      );
      updateCall(selectedCall.id, { status, clearedAt: clock() });
      addRadio(`Incident ${selectedCall.id} cleared. Assigned units available.`);
    } else {
      updateCall(selectedCall.id, { status });
      const nextUnitStatus =
        status === "On Scene" ? "On Scene" :
        status === "En Route" ? "En Route" : null;

      if (nextUnitStatus) {
        setUnits((current) =>
          current.map((unit) =>
            (selectedCall.units || []).includes(unit.id)
              ? { ...unit, status: nextUnitStatus }
              : unit
          )
        );
      }

      addRadio(`Incident ${selectedCall.id} status changed to ${status}.`);
    }

    setNotice(`${selectedCall.id}: ${status}`);
  }

  function changeUnitStatus(unitId, status) {
    const unit = units.find((item) => item.id === unitId);
    if (!unit) return;

    setUnits((current) =>
      current.map((item) =>
        item.id === unitId
          ? { ...item, status, callId: status === "Available" || status === "Out of Service" ? null : item.callId }
          : item
      )
    );

    addRadio(`${unitId} status: ${status}.`, unitId);

    if (status === "Available" || status === "Out of Service") {
      setCalls((current) =>
        current.map((call) =>
          call.id === unit.callId
            ? { ...call, units: call.units.filter((id) => id !== unitId) }
            : call
        )
      );
    }
  }

  function addIncidentNote() {
    if (!selectedCall || !note.trim()) return;
    const entry = { time: clock(), text: note.trim() };
    updateCall(selectedCall.id, {
      notes: [...(selectedCall.notes || []), entry],
    });
    addRadio(`Note added to ${selectedCall.id}: ${note.trim()}`);
    setNote("");
  }

  function sendRadioMessage() {
    if (!radioMessage.trim()) return;
    addRadio(radioMessage.trim(), "DISPATCH", radioChannel);
    setRadioMessage("");
  }

  function resetSimulation() {
    if (!window.confirm("Reset all saved simulation calls, units, and radio traffic?")) return;
    setCalls(initialCalls());
    setUnits(INITIAL_UNITS);
    setRadio([
      { id: Date.now(), time: clock(), channel: "DISPATCH", unit: "SYSTEM", message: "Simulation reset by operator." },
    ]);
    setSelectedId(null);
    setNotice("Simulation reset");
  }

  return (
    <main className="cad-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">LP</div>
          <div>
            <h1>LIVINGSTON PARISH <span>DISPATCH</span></h1>
            <p>SIMULATION & TRAINING CONSOLE</p>
          </div>
        </div>
        <div className="topbar-right">
          <span className="sim-pill"><span /> SIMULATION ONLY</span>
          <div className="clock">{clock()}</div>
        </div>
      </header>

      <div className="warning-banner">
        <strong>TRAINING ENVIRONMENT</strong>
        <span>Fictional calls and units. Not connected to 911 or any real emergency agency.</span>
      </div>

      <section className="stat-grid">
        <Stat label="ACTIVE INCIDENTS" value={activeCount} detail="Open calls" />
        <Stat label="AWAITING DISPATCH" value={pendingCount} detail="Pending calls" accent="amber" />
        <Stat label="AVAILABLE UNITS" value={availableCount} detail={`of ${units.length} tracked units`} accent="green" />
        <Stat label="PRIORITY 1" value={criticalCount} detail="Critical active calls" accent="red" />
      </section>

      {notice && (
        <button className="notice" onClick={() => setNotice("")} title="Dismiss message">
          {notice} <span>×</span>
        </button>
      )}

      <section className="toolbar">
        <div>
          <h2>Dispatch Operations</h2>
          <p>Manage incidents, resources, and simulated radio traffic.</p>
        </div>
        <div className="toolbar-actions">
          <label className="auto-toggle">
            <input type="checkbox" checked={autoGenerate} onChange={(event) => setAutoGenerate(event.target.checked)} />
            Auto-generate calls
          </label>
          <button className="button button-primary" onClick={() => addCall(false)}>＋ New Call</button>
        </div>
      </section>

      <div className="workspace">
        <section className="panel calls-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">INCIDENT MANAGEMENT</span>
              <h3>Call Queue <span className="count">{visibleCalls.length}</span></h3>
            </div>
          </div>

          <div className="filters">
            <input aria-label="Search calls" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search calls, IDs, locations..." />
            <div className="filter-row">
              <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter call status">
                <option value="Active">Active Calls</option>
                <option value="Pending">Pending Only</option>
                <option value="Cleared">Cleared Calls</option>
                <option value="All">All Calls</option>
              </select>
              <select value={agencyFilter} onChange={(event) => setAgencyFilter(event.target.value)} aria-label="Filter agency">
                <option value="ALL">All Agencies</option>
                <option value="POLICE">Law Enforcement</option>
                <option value="FIRE">Fire</option>
                <option value="EMS">EMS</option>
              </select>
            </div>
          </div>

          <div className="call-list">
            {visibleCalls.length === 0 && <div className="empty-state">No calls match these filters.</div>}
            {visibleCalls.map((call) => (
              <button
                key={call.id}
                className={`call-card ${selectedId === call.id ? "selected" : ""} ${call.status === "Cleared" ? "cleared" : ""}`}
                onClick={() => setSelectedId(call.id)}
              >
                <div className="call-card-top">
                  <span className={`priority ${call.priority.toLowerCase()}`}>{call.priority}</span>
                  <span className={`agency-chip ${call.agency.toLowerCase()}`}>{AGENCIES[call.agency].short}</span>
                  <span className="call-time">{call.created}</span>
                </div>
                <strong>{call.type}</strong>
                <span className="call-location">⌖ {call.location}</span>
                <div className="call-card-bottom">
                  <span>{call.id}</span>
                  <span className={`status-text ${call.status.toLowerCase().replaceAll(" ", "-")}`}>{call.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">INCIDENT WORKSPACE</span>
              <h3>{selectedCall ? selectedCall.id : "Select an incident"}</h3>
            </div>
            {selectedCall && <span className={`priority ${selectedCall.priority.toLowerCase()}`}>{selectedCall.priority}</span>}
          </div>

          {!selectedCall ? (
            <div className="empty-detail">
              <div className="empty-icon">⌕</div>
              <h4>No incident selected</h4>
              <p>Select a call from the queue or create a new one to manage its response.</p>
            </div>
          ) : (
            <div className="detail-content">
              <div className="incident-title">
                <span className={`agency-chip ${selectedCall.agency.toLowerCase()}`}>{AGENCIES[selectedCall.agency].label}</span>
                <h2>{selectedCall.type}</h2>
                <p>{selectedCall.details}</p>
              </div>

              <div className="detail-grid">
                <Info label="LOCATION" value={selectedCall.location} />
                <Info label="CALL RECEIVED" value={selectedCall.created} />
                <Info label="STATUS" value={selectedCall.status} />
                <Info label="ASSIGNED UNITS" value={selectedCall.units.length ? selectedCall.units.join(", ") : "None assigned"} />
              </div>

              <div className="section-block">
                <div className="section-title"><h4>Unit Assignment</h4><span>{selectedCall.units.length} assigned</span></div>
                <div className="assign-row">
                  <select id="unit-picker" defaultValue="">
                    <option value="">Select available unit...</option>
                    {units.filter((unit) => unit.status === "Available" && (unit.agency === selectedCall.agency || selectedCall.agency === "POLICE")).map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.id} — {unit.area} ({AGENCIES[unit.agency].short})</option>
                    ))}
                  </select>
                  <button className="button button-primary" onClick={() => {
                    const picker = document.getElementById("unit-picker");
                    if (picker?.value) assignUnit(picker.value);
                  }}>Assign</button>
                </div>
                <button className="button button-secondary full-width" onClick={dispatchSelected}>Auto-assign nearest available unit</button>
              </div>

              <div className="section-block">
                <div className="section-title"><h4>Incident Status</h4></div>
                <div className="status-actions">
                  {CALL_STATUSES.map((status) => (
                    <button key={status} disabled={selectedCall.status === "Cleared" || status === selectedCall.status} className={`status-button ${status === selectedCall.status ? "active" : ""}`} onClick={() => changeCallStatus(status)}>{status}</button>
                  ))}
                </div>
              </div>

              <div className="section-block">
                <div className="section-title"><h4>Incident Notes</h4><span>{(selectedCall.notes || []).length} notes</span></div>
                <div className="note-entry">
                  <input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addIncidentNote()} placeholder="Add a note to this incident..." />
                  <button className="button button-secondary" onClick={addIncidentNote}>Add</button>
                </div>
                {(selectedCall.notes || []).map((entry, index) => (
                  <div className="incident-note" key={`${entry.time}-${index}`}><time>{entry.time}</time><span>{entry.text}</span></div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel units-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RESOURCE MANAGEMENT</span>
            <h3>Unit Status Board <span className="count">{units.length}</span></h3>
          </div>
          <button className="button button-secondary" onClick={() => {
            setUnits((current) => [...current, { id: `LPSO-${101 + current.filter((unit) => unit.agency === "POLICE").length}`, agency: "POLICE", area: "Livingston", status: "Available", callId: null }]);
            addRadio("New simulated law enforcement unit added.");
          }}>＋ Add LE Unit</button>
        </div>

        <div className="unit-table-wrap">
          <table className="unit-table">
            <thead>
              <tr><th>UNIT ID</th><th>AGENCY</th><th>AREA</th><th>STATUS</th><th>ASSIGNED CALL</th><th>CHANGE STATUS</th></tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="unit-id">{unit.id}</td>
                  <td><span className={`agency-chip ${unit.agency.toLowerCase()}`}>{AGENCIES[unit.agency].short}</span></td>
                  <td>{unit.area}</td>
                  <td><span className={`unit-status ${unit.status.toLowerCase().replaceAll(" ", "-")}`}><span />{unit.status}</span></td>
                  <td>{unit.callId || "—"}</td>
                  <td>
                    <select value={unit.status} onChange={(event) => changeUnitStatus(unit.id, event.target.value)} aria-label={`Change status for ${unit.id}`}>
                      {UNIT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel radio-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">COMMUNICATIONS</span>
            <h3>Radio Traffic <span className="count">{radio.length}</span></h3>
          </div>
          <button className="button button-secondary" onClick={() => setRadio([])}>Clear Radio Log</button>
        </div>

        <form className="radio-compose" onSubmit={(event) => { event.preventDefault(); sendRadioMessage(); }}>
          <select value={radioChannel} onChange={(event) => setRadioChannel(event.target.value)} aria-label="Radio channel">
            <option>DISPATCH</option>
            <option>LAW 1</option>
            <option>FIRE</option>
            <option>EMS</option>
          </select>
          <input value={radioMessage} onChange={(event) => setRadioMessage(event.target.value)} placeholder="Enter simulated radio traffic..." />
          <button className="button button-primary" type="submit">Transmit</button>
        </form>

        <div className="radio-log">
          {radio.length === 0 && <div className="empty-state">No radio traffic recorded.</div>}
          {radio.map((entry) => (
            <div className="radio-entry" key={entry.id}>
              <time>{entry.time}</time>
              <span className="radio-channel">{entry.channel}</span>
              <strong>{entry.unit}</strong>
              <p>{entry.message}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="app-footer">
        <span>LPDS · FICTIONAL DISPATCH SIMULATOR</span>
        <button onClick={resetSimulation}>Reset simulation data</button>
      </footer>
    </main>
  );
}

function Stat({ label, value, detail, accent = "" }) {
  return (
    <div className={`stat-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
