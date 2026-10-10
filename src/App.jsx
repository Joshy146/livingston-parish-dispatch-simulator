
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const INITIAL_UNITS = [
  { id: "1", callsign: "LPSO-101", agency: "Sheriff", name: "Unit 101", status: "Available", area: "Livingston" },
  { id: "2", callsign: "LPSO-102", agency: "Sheriff", name: "Unit 102", status: "Available", area: "Walker" },
  { id: "3", callsign: "WPD-201", agency: "Walker PD", name: "Unit 201", status: "Available", area: "Walker" },
  { id: "4", callsign: "DSPD-301", agency: "Denham Springs PD", name: "Unit 301", status: "Available", area: "Denham Springs" },
  { id: "5", callsign: "LPFD-401", agency: "Fire", name: "Unit 401", status: "Available", area: "Livingston" },
  { id: "6", callsign: "EMS-501", agency: "EMS", name: "Unit 501", status: "Available", area: "Parishwide" },
];

const INITIAL_CALLS = [
  {
    id: "26-0001",
    type: "Traffic Collision",
    priority: "High",
    location: "LA-447, Livingston",
    area: "Livingston",
    caller: "Simulated caller",
    details: "Two-vehicle collision reported. Injuries unknown.",
    status: "Pending",
    units: [],
    time: new Date().toISOString(),
  },
  {
    id: "26-0002",
    type: "Suspicious Activity",
    priority: "Routine",
    location: "Walker South Road, Walker",
    area: "Walker",
    caller: "Simulated caller",
    details: "Caller reports suspicious activity near a business.",
    status: "Pending",
    units: [],
    time: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: "26-0003",
    type: "Medical Assistance",
    priority: "High",
    location: "LA-16, Denham Springs",
    area: "Denham Springs",
    caller: "Simulated caller",
    details: "Medical assistance requested. Patient condition unknown.",
    status: "Pending",
    units: [],
    time: new Date(Date.now() - 480000).toISOString(),
  },
];

const CALL_TYPES = [
  "Traffic Collision",
  "Medical Assistance",
  "Fire / Smoke",
  "Suspicious Activity",
  "Disturbance",
  "Theft",
  "Welfare Check",
  "Alarm",
  "Road Hazard",
  "Other",
];

const AREAS = [
  "Livingston",
  "Walker",
  "Denham Springs",
  "Watson",
  "Albany",
  "Springfield",
  "Killian",
  "Port Vincent",
  "French Settlement",
  "Holden",
  "Parishwide",
];

const STATUSES = ["Available", "En Route", "On Scene", "Busy", "Out of Service"];
const PRIORITIES = ["Critical", "High", "Routine", "Low"];

function readSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Badge({ children, type = "" }) {
  return <span className={`badge ${type}`}>{children}</span>;
}

function App() {
  const [now, setNow] = useState(new Date());
  const [calls, setCalls] = useState(() => readSaved("lpds-calls", INITIAL_CALLS));
  const [units, setUnits] = useState(() => readSaved("lpds-units", INITIAL_UNITS));
  const [logs, setLogs] = useState(() =>
    readSaved("lpds-logs", [
      { id: 1, time: new Date().toISOString(), message: "Dispatch console initialized." },
      { id: 2, time: new Date().toISOString(), message: "Simulation mode active. Calls are fictional." },
    ])
  );
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showNewCall, setShowNewCall] = useState(false);
  const [newCall, setNewCall] = useState({
    type: "Traffic Collision",
    priority: "Routine",
    area: "Walker",
    location: "",
    details: "",
  });
  const [assignUnit, setAssignUnit] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => localStorage.setItem("lpds-calls", JSON.stringify(calls)), [calls]);
  useEffect(() => localStorage.setItem("lpds-units", JSON.stringify(units)), [units]);
  useEffect(() => localStorage.setItem("lpds-logs", JSON.stringify(logs.slice(0, 100))), [logs]);

  const log = (message) => {
    setLogs((previous) => [
      { id: Date.now() + Math.random(), time: new Date().toISOString(), message },
      ...previous,
    ].slice(0, 100));
  };

  const selectedCall = calls.find((call) => call.id === selectedId) || null;

  const visibleCalls = useMemo(() => {
    return [...calls]
      .filter((call) => {
        const text = `${call.id} ${call.type} ${call.location} ${call.area} ${call.details}`.toLowerCase();
        const matchesSearch = text.includes(search.toLowerCase());
        const matchesFilter =
          filter === "All" ||
          (filter === "Open" && call.status !== "Cleared") ||
          (filter === "Pending" && call.status === "Pending") ||
          (filter === "Active" && ["Accepted", "Dispatched", "In Progress"].includes(call.status)) ||
          (filter === "Cleared" && call.status === "Cleared");
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const rank = { Critical: 0, High: 1, Routine: 2, Low: 3 };
        if (a.status === "Cleared" && b.status !== "Cleared") return 1;
        if (b.status === "Cleared" && a.status !== "Cleared") return -1;
        return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
      });
  }, [calls, search, filter]);

  const openCalls = calls.filter((call) => call.status !== "Cleared").length;
  const availableUnits = units.filter((unit) => unit.status === "Available").length;
  const activeUnits = units.filter((unit) => ["En Route", "On Scene", "Busy"].includes(unit.status)).length;

  function updateCall(id, changes) {
    setCalls((previous) => previous.map((call) => call.id === id ? { ...call, ...changes } : call));
  }

  function acceptCall(call) {
    updateCall(call.id, { status: "Accepted" });
    log(`${call.id} accepted — ${call.type} at ${call.location}.`);
  }

  function dispatchCall() {
    if (!selectedCall) return;
    if (!assignUnit) {
      log(`Dispatch attempt for ${selectedCall.id} needs a unit assignment.`);
      return;
    }

    const unit = units.find((item) => item.id === assignUnit);
    if (!unit) return;

    if (unit.status !== "Available" && unit.status !== "En Route") {
      log(`${unit.callsign} is not available for a new assignment.`);
      return;
    }

    const updatedIds = [...new Set([...selectedCall.units, unit.id])];
    updateCall(selectedCall.id, { status: "Dispatched", units: updatedIds });
    setUnits((previous) => previous.map((item) =>
      item.id === unit.id ? { ...item, status: "En Route", currentCall: selectedCall.id, area: selectedCall.area } : item
    ));
    log(`${unit.callsign} dispatched to ${selectedCall.id}, ${selectedCall.location}.`);
    setAssignUnit("");
  }

  function changeUnitStatus(unitId, status) {
    const unit = units.find((item) => item.id === unitId);
    setUnits((previous) => previous.map((item) => item.id === unitId
      ? { ...item, status, currentCall: status === "Available" || status === "Out of Service" ? null : item.currentCall }
      : item
    ));
    log(`${unit?.callsign || "Unit"} status changed to ${status}.`);
  }

  function clearCall(call) {
    updateCall(call.id, { status: "Cleared" });
    setUnits((previous) => previous.map((unit) =>
      call.units.includes(unit.id)
        ? { ...unit, status: "Available", currentCall: null, area: unit.area }
        : unit
    ));
    log(`${call.id} cleared. Assigned units returned to Available.`);
  }

  function createCall(event) {
    event.preventDefault();
    const id = `26-${String(Date.now()).slice(-6)}`;
    const call = {
      ...newCall,
      id,
      location: newCall.location.trim(),
      details: newCall.details.trim() || "No additional details provided.",
      caller: "Simulated caller",
      status: "Pending",
      units: [],
      time: new Date().toISOString(),
    };
    setCalls((previous) => [call, ...previous]);
    setSelectedId(id);
    setShowNewCall(false);
    setNewCall({ type: "Traffic Collision", priority: "Routine", area: "Walker", location: "", details: "" });
    log(`New ${call.priority.toLowerCase()} priority call created: ${id} — ${call.type}.`);
  }

  function addDemoCall() {
    const samples = [
      { type: "Road Hazard", priority: "Routine", area: "Watson", location: "LA-1019, Watson", details: "Simulated report of debris in the roadway." },
      { type: "Welfare Check", priority: "Low", area: "Albany", location: "US-190, Albany", details: "Simulated request for a welfare check." },
      { type: "Fire / Smoke", priority: "High", area: "Denham Springs", location: "Range Avenue, Denham Springs", details: "Simulated smoke report; details unconfirmed." },
      { type: "Disturbance", priority: "Routine", area: "Livingston", location: "LA-63, Livingston", details: "Simulated disturbance call; situation unknown." },
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const id = `26-${String(Date.now()).slice(-6)}`;
    setCalls((previous) => [{
      ...sample,
      id,
      caller: "Simulated caller",
      status: "Pending",
      units: [],
      time: new Date().toISOString(),
    }, ...previous]);
    setSelectedId(id);
    log(`Simulation generated a new ${sample.type} call: ${id}.`);
  }

  function resetSimulation() {
    if (!window.confirm("Reset all simulated calls, unit statuses, and activity logs? This cannot be undone.")) return;
    setCalls(INITIAL_CALLS);
    setUnits(INITIAL_UNITS);
    setLogs([{ id: Date.now(), time: new Date().toISOString(), message: "Simulation data reset by dispatcher." }]);
    setSelectedId(null);
    log("Simulation reset complete.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span>LP</span></div>
          <div>
            <div className="brand-title">LIVINGSTON PARISH</div>
            <div className="brand-subtitle">DISPATCH SIMULATOR <span className="demo-pill">SIMULATION</span></div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="system-state"><span className="live-dot" /> SYSTEM ONLINE</div>
          <div className="clock">
            <strong>{now.toLocaleTimeString([], { hour12: false })}</strong>
            <span>{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </header>

      <div className="disclaimer">
        <span>ⓘ</span> TRAINING SIMULATION ONLY — All incidents and radio activity are fictional. Not connected to 911 or any public safety agency.
      </div>

      <main className="workspace">
        <section className="stats-grid">
          <div className="stat-card"><span className="stat-label">OPEN CALLS</span><strong>{openCalls.toString().padStart(2, "0")}</strong><span className="stat-note">Awaiting / active</span></div>
          <div className="stat-card"><span className="stat-label">AVAILABLE UNITS</span><strong>{availableUnits.toString().padStart(2, "0")}</strong><span className="stat-note">Ready for assignment</span></div>
          <div className="stat-card"><span className="stat-label">ACTIVE UNITS</span><strong>{activeUnits.toString().padStart(2, "0")}</strong><span className="stat-note">En route / on scene / busy</span></div>
          <div className="stat-card"><span className="stat-label">TOTAL CALLS</span><strong>{calls.length.toString().padStart(2, "0")}</strong><span className="stat-note">This browser session</span></div>
        </section>

        <div className="main-grid">
          <section className="panel calls-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">CALL MANAGEMENT</span><h2>Incident Queue</h2></div>
              <button className="primary-button" onClick={() => setShowNewCall(true)}>＋ New Call</button>
            </div>
            <div className="queue-controls">
              <input aria-label="Search calls" placeholder="Search calls, locations..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select aria-label="Filter calls" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option>All</option><option>Open</option><option>Pending</option><option>Active</option><option>Cleared</option>
              </select>
            </div>
            <div className="call-list">
              {visibleCalls.length === 0 && <div className="empty-state">No calls match your search.</div>}
              {visibleCalls.map((call) => (
                <button className={`call-row ${selectedId === call.id ? "selected" : ""} ${call.status === "Cleared" ? "cleared" : ""}`} key={call.id} onClick={() => { setSelectedId(call.id); setAssignUnit(""); }}>
                  <div className={`priority-bar ${call.priority.toLowerCase()}`} />
                  <div className="call-main">
                    <div className="call-row-top"><strong>{call.type}</strong><Badge type={call.priority.toLowerCase()}>{call.priority}</Badge></div>
                    <div className="call-location"><span>⌖</span> {call.location}</div>
                    <div className="call-meta"><span>{call.id}</span><span>{formatTime(call.time)}</span></div>
                  </div>
                  <div className="call-row-end"><Badge type={call.status.toLowerCase().replaceAll(" ", "-")}>{call.status}</Badge><span className="chevron">›</span></div>
                </button>
              ))}
            </div>
            <div className="panel-footer"><span>{visibleCalls.length} displayed</span><button className="text-button" onClick={addDemoCall}>＋ Generate demo call</button></div>
          </section>

          <section className="panel detail-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">INCIDENT WORKSPACE</span><h2>Call Details</h2></div>
              {selectedCall && <Badge type={selectedCall.status.toLowerCase().replaceAll(" ", "-")}>{selectedCall.status}</Badge>}
            </div>

            {!selectedCall ? (
              <div className="empty-detail"><div className="empty-icon">⌕</div><h3>Select an incident</h3><p>Choose a call from the incident queue to review details and coordinate responding units.</p></div>
            ) : (
              <div className="call-detail">
                <div className="detail-title"><div className={`priority-square ${selectedCall.priority.toLowerCase()}`}>{selectedCall.priority === "Critical" ? "!" : selectedCall.priority === "High" ? "▲" : "●"}</div><div><h3>{selectedCall.type}</h3><span>{selectedCall.id} · Received {formatTime(selectedCall.time)}</span></div></div>
                <div className="detail-fields">
                  <div><span>PRIORITY</span><Badge type={selectedCall.priority.toLowerCase()}>{selectedCall.priority}</Badge></div>
                  <div><span>AREA</span><strong>{selectedCall.area}</strong></div>
                  <div className="full-field"><span>LOCATION</span><strong>{selectedCall.location}</strong></div>
                  <div className="full-field"><span>CALLER</span><strong>{selectedCall.caller}</strong></div>
                  <div className="full-field"><span>CALL DETAILS</span><p>{selectedCall.details}</p></div>
                </div>
                <div className="detail-actions">
                  {selectedCall.status === "Pending" && <button className="primary-button wide" onClick={() => acceptCall(selectedCall)}>Accept Call</button>}
                  {selectedCall.status !== "Cleared" && (
                    <>
                      <label className="field-label" htmlFor="unit-select">ASSIGN A UNIT</label>
                      <div className="assign-row">
                        <select id="unit-select" value={assignUnit} onChange={(event) => setAssignUnit(event.target.value)}>
                          <option value="">Select available unit...</option>
                          {units.filter((unit) => unit.status === "Available" || selectedCall.units.includes(unit.id)).map((unit) => <option key={unit.id} value={unit.id}>{unit.callsign} — {unit.agency}</option>)}
                        </select>
                        <button className="primary-button" onClick={dispatchCall}>Dispatch</button>
                      </div>
                      {selectedCall.units.length > 0 && <div className="assigned-units"><span>ASSIGNED UNITS</span>{selectedCall.units.map((id) => { const unit = units.find((item) => item.id === id); return unit ? <Badge key={id}>{unit.callsign}</Badge> : null; })}</div>}
                      <button className="success-button wide" onClick={() => clearCall(selectedCall)}>✓ Clear Incident</button>
                    </>
                  )}
                  {selectedCall.status === "Cleared" && <p className="cleared-note">This incident has been cleared.</p>}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="lower-grid">
          <section className="panel units-panel">
            <div className="panel-heading"><div><span className="eyebrow">FIELD OPERATIONS</span><h2>Unit Status Board</h2></div><span className="small-counter">{units.length} UNITS</span></div>
            <div className="unit-table-wrap">
              <table className="unit-table">
                <thead><tr><th>CALLSIGN</th><th>AGENCY</th><th>AREA</th><th>STATUS</th></tr></thead>
                <tbody>{units.map((unit) => (
                  <tr key={unit.id}>
                    <td><strong>{unit.callsign}</strong></td><td>{unit.agency}</td><td>{unit.area}</td>
                    <td><select className={`status-select ${unit.status.toLowerCase().replaceAll(" ", "-")}`} aria-label={`${unit.callsign} status`} value={unit.status} onChange={(event) => changeUnitStatus(unit.id, event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="table-note">Example callsigns and unit assignments are fictional and are not official agency identifiers.</p>
          </section>

          <section className="panel map-panel">
            <div className="panel-heading"><div><span className="eyebrow">GEOGRAPHIC OVERVIEW</span><h2>Parish Overview</h2></div><span className="map-tag">SCHEMATIC</span></div>
            <div className="schematic-map">
              <div className="map-grid" />
              <svg className="road-layer" viewBox="0 0 500 310" preserveAspectRatio="none" aria-label="Illustrative road lines">
                <path d="M-20 220 C80 180 140 210 205 150 S360 95 520 120" />
                <path d="M90 -10 C130 70 170 110 190 170 S240 250 260 330" />
                <path d="M-10 70 C100 105 210 45 320 85 S440 190 520 225" />
                <path d="M350 -10 C320 65 360 150 330 210 S360 275 390 330" />
                <path className="main-road" d="M-10 275 C100 245 180 245 250 185 S390 130 520 45" />
                <path className="main-road" d="M40 -10 C65 75 95 140 165 195 S310 255 470 330" />
              </svg>
              <span className="map-place place-livingston">LIVINGSTON</span>
              <span className="map-place place-walker">WALKER</span>
              <span className="map-place place-denham">DENHAM SPRINGS</span>
              <span className="map-place place-watson">WATSON</span>
              {calls.filter((call) => call.status !== "Cleared").slice(0, 5).map((call, index) => <span key={call.id} title={`${call.id}: ${call.type}`} className={`map-marker marker-${index % 5}`} onClick={() => setSelectedId(call.id)}>{call.priority === "Critical" ? "!" : "●"}</span>)}
              <div className="map-watermark">ILLUSTRATIVE MAP · NOT FOR NAVIGATION</div>
            </div>
            <div className="map-legend"><span><i className="legend-dot incident-dot" /> Open incidents</span><span><i className="legend-dot road-dot" /> Major route (illustrative)</span></div>
            <p className="table-note">This is a schematic display, not a live geographic map. Real roads and coordinates will be added in a later stage.</p>
          </section>
        </div>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">COMMUNICATIONS</span><h2>Dispatch Activity Log</h2></div><button className="text-button" onClick={resetSimulation}>Reset simulation</button></div>
          <div className="activity-list">
            {logs.slice(0, 12).map((entry) => <div className="activity-entry" key={entry.id}><span className="activity-time">{formatTime(entry.time)}</span><span className="activity-indicator" /><span>{entry.message}</span></div>)}
          </div>
        </section>

        <footer className="app-footer"><span>LPDS · LIVINGSTON PARISH DISPATCH SIMULATOR</span><span>TRAINING SIMULATION ONLY · NOT AN OFFICIAL SYSTEM</span></footer>
      </main>

      {showNewCall && (
        <div className="modal-backdrop" onClick={() => setShowNewCall(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-call-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">INCIDENT INTAKE</span><h2 id="new-call-title">Create New Call</h2></div><button className="close-button" onClick={() => setShowNewCall(false)} aria-label="Close">×</button></div>
            <p className="modal-note">Create a fictional incident for this simulation.</p>
            <form onSubmit={createCall}>
              <label>Call type<select value={newCall.type} onChange={(event) => setNewCall({ ...newCall, type: event.target.value })}>{CALL_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Priority<select value={newCall.priority} onChange={(event) => setNewCall({ ...newCall, priority: event.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label>Community / area<select value={newCall.area} onChange={(event) => setNewCall({ ...newCall, area: event.target.value })}>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
              <label>Location<input required placeholder="e.g. Walker South Road, Walker" value={newCall.location} onChange={(event) => setNewCall({ ...newCall, location: event.target.value })} /></label>
              <label>Call details<textarea rows="3" placeholder="What did the simulated caller report?" value={newCall.details} onChange={(event) => setNewCall({ ...newCall, details: event.target.value })} /></label>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewCall(false)}>Cancel</button><button type="submit" className="primary-button">Create Incident</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
