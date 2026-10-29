
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [tickets, setTickets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    customer_name: "",
    appliance_type: "Refrigerator",
    issue_description: "",
    priority: "Medium",
    status: "Open",
  });

  const [partForm, setPartForm] = useState({
    part_name: "",
    quantity: 0,
    minimum_stock: 5,
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [ticketResponse, inventoryResponse] = await Promise.all([
        fetch(`${API}/tickets`),
        fetch(`${API}/inventory`),
      ]);

      if (!ticketResponse.ok || !inventoryResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      setTickets(await ticketResponse.json());
      setInventory(await inventoryResponse.json());
    } catch {
      setError("Cannot connect to the backend. Check that FastAPI is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createTicket(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketForm),
      });

      if (!response.ok) {
        throw new Error("Could not create ticket.");
      }

      setShowTicketForm(false);
      setTicketForm({
        customer_name: "",
        appliance_type: "Refrigerator",
        issue_description: "",
        priority: "Medium",
        status: "Open",
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createPart(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...partForm,
          quantity: Number(partForm.quantity),
          minimum_stock: Number(partForm.minimum_stock),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not add inventory item.");
      }

      setShowPartForm(false);
      setPartForm({ part_name: "", quantity: 0, minimum_stock: 5 });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(ticketId, status) {
    try {
      const response = await fetch(
        `${API}/tickets/${ticketId}/status?status=${encodeURIComponent(status)}`,
        { method: "PATCH" }
      );

      if (!response.ok) throw new Error("Status update failed.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const inProgress = tickets.filter((t) => t.status === "In Progress").length;
  const completed = tickets.filter((t) => t.status === "Completed").length;
  const lowStock = inventory.filter(
    (item) => item.quantity < item.minimum_stock
  );

  const filteredTickets = tickets.filter((ticket) =>
    `${ticket.customer_name} ${ticket.appliance_type} ${ticket.issue_description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const navItems = [
    { name: "Dashboard", icon: "▦" },
    { name: "Service Tickets", icon: "▤" },
    { name: "Inventory", icon: "□" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h2>ApplianceOS</h2>
            <span>Service operations</span>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? "active" : ""}`}
              onClick={() => {
                setPage(item.name);
                setSearch("");
                setError("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
              {item.name === "Service Tickets" && tickets.length > 0 && (
                <span className="nav-count">{tickets.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-icon">?</div>
          <div>
            <strong>Operations center</strong>
            <span>Service & inventory</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace / <strong>{page}</strong></div>
          <div className="topbar-right">
            <span className="system-status"><i /> System connected</span>
            <div className="avatar">OP</div>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">SERVICE OPERATIONS</p>
              <h1>{page}</h1>
              <p className="subtitle">
                {page === "Dashboard"
                  ? "Monitor repairs, service requests and spare parts."
                  : page === "Service Tickets"
                  ? "Manage customer service requests and repair progress."
                  : "Track spare parts and monitor stock availability."}
              </p>
            </div>

            <button className="secondary-button" onClick={loadData}>
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading your operational data...</div>
          ) : (
            <>
              {page === "Dashboard" && (
                <>
                  <div className="stats-grid">
                    <StatCard
                      label="Total service tickets"
                      value={tickets.length}
                      detail="All recorded requests"
                      icon="▤"
                      color="blue"
                    />
                    <StatCard
                      label="Open tickets"
                      value={openTickets}
                      detail="Awaiting repair"
                      icon="◷"
                      color="orange"
                    />
                    <StatCard
                      label="In progress"
                      value={inProgress}
                      detail="Currently being handled"
                      icon="⚙"
                      color="purple"
                    />
                    <StatCard
                      label="Completed"
                      value={completed}
                      detail="Repairs completed"
                      icon="✓"
                      color="green"
                    />
                  </div>

                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Recent service tickets</h3>
                          <p>Latest customer repair requests</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setPage("Service Tickets")}
                        >
                          View all →
                        </button>
                      </div>

                      <TicketTable
                        tickets={[...tickets].reverse().slice(0, 5)}
                        onStatusChange={updateStatus}
                      />
                    </section>

                    <section className="panel stock-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Inventory health</h3>
                          <p>Parts requiring attention</p>
                        </div>
                        <span className="alert-count">{lowStock.length}</span>
                      </div>

                      {lowStock.length === 0 ? (
                        <div className="empty-state">
                          <span className="empty-symbol">✓</span>
                          <strong>Stock levels look good</strong>
                          <p>No parts currently need restocking.</p>
                        </div>
                      ) : (
                        lowStock.slice(0, 5).map((item) => (
                          <div className="stock-row" key={item.part_id}>
                            <div className="part-icon">▦</div>
                            <div className="stock-info">
                              <strong>{item.part_name}</strong>
                              <span>Minimum: {item.minimum_stock}</span>
                            </div>
                            <span className="stock-quantity">
                              {item.quantity} left
                            </span>
                          </div>
                        ))
                      )}

                      <button
                        className="full-width-button"
                        onClick={() => setPage("Inventory")}
                      >
                        Manage inventory →
                      </button>
                    </section>
                  </div>
                </>
              )}

              {page === "Service Tickets" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>All service tickets</h3>
                      <p>{tickets.length} recorded requests</p>
                    </div>
                    <button
                      className="primary-button"
                      onClick={() => setShowTicketForm(true)}
                    >
                      + New ticket
                    </button>
                  </div>

                  <input
                    className="search-input"
                    placeholder="Search customer, appliance or issue..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  <TicketTable
                    tickets={filteredTickets}
                    onStatusChange={updateStatus}
                  />
                </section>
              )}

              {page === "Inventory" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Spare parts inventory</h3>
                      <p>{inventory.length} parts tracked</p>
                    </div>
                    <button
                      className="primary-button"
                      onClick={() => setShowPartForm(true)}
                    >
                      + Add spare part
                    </button>
                  </div>

                  <div className="inventory-summary">
                    <div>
                      <span>Total part types</span>
                      <strong>{inventory.length}</strong>
                    </div>
                    <div>
                      <span>Total units</span>
                      <strong>
                        {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                      </strong>
                    </div>
                    <div>
                      <span>Low-stock items</span>
                      <strong className="low-number">{lowStock.length}</strong>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>PART ID</th>
                          <th>PART NAME</th>
                          <th>QUANTITY</th>
                          <th>MINIMUM STOCK</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item) => (
                          <tr key={item.part_id}>
                            <td>#{item.part_id}</td>
                            <td className="customer-cell">{item.part_name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.minimum_stock}</td>
                            <td>
                              <span
                                className={`badge ${
                                  item.quantity < item.minimum_stock
                                    ? "badge-low"
                                    : "badge-completed"
                                }`}
                              >
                                {item.quantity < item.minimum_stock
                                  ? "Low stock"
                                  : "In stock"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inventory.length === 0 && (
                      <p className="empty-table">No inventory items yet.</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </main>

      {showTicketForm && (
        <Modal title="Create service ticket" onClose={() => setShowTicketForm(false)}>
          <form onSubmit={createTicket} className="form-stack">
            <label>
              Customer name
              <input
                required
                minLength={2}
                value={ticketForm.customer_name}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, customer_name: e.target.value })
                }
                placeholder="Enter customer name"
              />
            </label>
            <label>
              Appliance type
              <select
                value={ticketForm.appliance_type}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, appliance_type: e.target.value })
                }
              >
                {["Refrigerator", "Washing Machine", "Air Conditioner", "Microwave"].map(
                  (type) => <option key={type}>{type}</option>
                )}
              </select>
            </label>
            <label>
              Issue description
              <textarea
                required
                minLength={5}
                value={ticketForm.issue_description}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, issue_description: e.target.value })
                }
                placeholder="Describe the issue"
              />
            </label>
            <label>
              Priority
              <select
                value={ticketForm.priority}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, priority: e.target.value })
                }
              >
                {["Low", "Medium", "High"].map(
                  (priority) => <option key={priority}>{priority}</option>
                )}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowTicketForm(false)}>Cancel</button>
              <button type="submit" className="primary-button">Create ticket</button>
            </div>
          </form>
        </Modal>
      )}

      {showPartForm && (
        <Modal title="Add spare part" onClose={() => setShowPartForm(false)}>
          <form onSubmit={createPart} className="form-stack">
            <label>
              Part name
              <input
                required
                minLength={2}
                value={partForm.part_name}
                onChange={(e) =>
                  setPartForm({ ...partForm, part_name: e.target.value })
                }
                placeholder="e.g. Water inlet valve"
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                required
                value={partForm.quantity}
                onChange={(e) =>
                  setPartForm({ ...partForm, quantity: e.target.value })
                }
              />
            </label>
            <label>
              Minimum stock threshold
              <input
                type="number"
                min="0"
                required
                value={partForm.minimum_stock}
                onChange={(e) =>
                  setPartForm({ ...partForm, minimum_stock: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowPartForm(false)}>Cancel</button>
              <button type="submit" className="primary-button">Add part</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <strong className="stat-value">{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function TicketTable({ tickets, onStatusChange }) {
  if (tickets.length === 0) {
    return <div className="empty-table">No service tickets found.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TICKET</th>
            <th>CUSTOMER</th>
            <th>APPLIANCE</th>
            <th>PRIORITY</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.ticket_id}>
              <td className="ticket-id">#{ticket.ticket_id}</td>
              <td className="customer-cell">{ticket.customer_name}</td>
              <td>{ticket.appliance_type}</td>
              <td>
                <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                  {ticket.priority}
                </span>
              </td>
              <td>
                <select
                  className={`status-select status-${ticket.status.replace(" ", "-").toLowerCase()}`}
                  value={ticket.status}
                  onChange={(e) =>
                    onStatusChange(ticket.ticket_id, e.target.value)
                  }
                  aria-label={`Update ticket ${ticket.ticket_id} status`}
                >
                  {["Open", "In Progress", "Completed"].map(
                    (status) => <option key={status}>{status}</option>
                  )}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default App;
