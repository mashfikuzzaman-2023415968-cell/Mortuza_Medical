import { useEffect, useState, useCallback } from 'react';
import { Loader2, Ambulance, Plus, RefreshCw, CheckCircle2, Clock, Send, Check, X } from 'lucide-react';
import api from '../../api/axios';
import AmbulanceFleetCard from '../../components/AmbulanceFleetCard';
import AmbulanceDispatchTable from '../../components/AmbulanceDispatchTable';
import AmbulanceDispatchForm from '../../components/AmbulanceDispatchForm';

const AMB_STATUSES = ['IN_SERVICE', 'MAINTENANCE', 'RETIRED'];

const EMPTY_ADD = { registration_no: '', model: '', capacity: '', driver_name: '', driver_phone: '', status: 'IN_SERVICE' };

export default function AmbulancePage() {
  const [ambulances, setAmbulances] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Add ambulance
  const [showAddAmb, setShowAddAmb] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [addError, setAddError] = useState('');
  const [savingAdd, setSavingAdd] = useState(false);

  // Inline edit
  const [editingAmbId, setEditingAmbId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Dispatch form toggle
  const [showDispatch, setShowDispatch] = useState(false);

  // Mark returned
  const [returningId, setReturningId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/ambulances'), api.get('/ambulances/dispatches')])
      .then(([ambRes, dispRes]) => {
        setAmbulances(ambRes.data.data || []);
        setDispatches(dispRes.data.data || []);
      })
      .catch(() => setError('Unable to load ambulance data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.get('/patients').then((r) => setPatients(r.data.data || [])).catch(() => {});
  }, [load]);

  // Add ambulance
  const handleAddAmb = async () => {
    setAddError('');
    if (!addForm.registration_no.trim()) { setAddError('Registration number is required.'); return; }
    setSavingAdd(true);
    try {
      await api.post('/ambulances', { ...addForm, capacity: addForm.capacity ? Number(addForm.capacity) : null });
      setShowAddAmb(false);
      setAddForm(EMPTY_ADD);
      load();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add ambulance.');
    } finally {
      setSavingAdd(false);
    }
  };

  // Inline edit
  const startEdit = (amb) => {
    setEditingAmbId(amb.ambulance_id);
    setEditForm({
      registration_no: amb.registration_no,
      model: amb.model || '',
      capacity: amb.capacity || '',
      driver_name: amb.driver_name || '',
      driver_phone: amb.driver_phone || '',
      status: amb.operational_status,
    });
    setEditError('');
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    setEditError('');
    try {
      await api.put(`/ambulances/${editingAmbId}`, {
        ...editForm,
        capacity: editForm.capacity ? Number(editForm.capacity) : null,
      });
      setEditingAmbId(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Mark returned
  const handleReturn = async (dispatchId) => {
    setReturningId(dispatchId);
    try {
      await api.put(`/ambulances/dispatches/${dispatchId}/return`, {});
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Return failed.');
    } finally {
      setReturningId(null);
    }
  };

  // Dispatch success
  const handleDispatchSuccess = (warning) => {
    const msg = warning ? `Dispatched — Note: ${warning}` : 'Ambulance dispatched successfully.';
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
    setShowDispatch(false);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Fleet section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ambulance size={18} className="text-rose-500" />
            <h2 className="text-xl font-semibold text-gray-800">Ambulance Fleet</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 p-1.5"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => { setShowAddAmb((v) => !v); setAddError(''); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} /> Add ambulance
            </button>
            <button
              onClick={() => setShowDispatch((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              <Send size={14} /> Log dispatch
            </button>
          </div>
        </div>

        {/* Add ambulance inline form */}
        {showAddAmb && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">Add new ambulance</h4>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[['registration_no', 'Reg No *'], ['model', 'Model'], ['capacity', 'Capacity'], ['driver_name', 'Driver name'], ['driver_phone', 'Driver phone']].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    value={addForm[k]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [k]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  value={addForm.status}
                  onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {AMB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAmb}
                disabled={savingAdd}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {savingAdd ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
              <button
                onClick={() => setShowAddAmb(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Fleet cards */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="space-y-3">
            {ambulances.map((amb) => (
              <div key={amb.ambulance_id}>
                <AmbulanceFleetCard
                  amb={amb}
                  canEdit={true}
                  onEdit={() => editingAmbId === amb.ambulance_id ? setEditingAmbId(null) : startEdit(amb)}
                />
                {/* Inline edit form below card */}
                {editingAmbId === amb.ambulance_id && (
                  <div className="mt-2 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    {editError && <p className="text-sm text-red-600">{editError}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[['registration_no', 'Reg No'], ['model', 'Model'], ['capacity', 'Capacity'], ['driver_name', 'Driver'], ['driver_phone', 'Phone']].map(([k, l]) => (
                        <div key={k}>
                          <label className="block text-xs text-gray-500 mb-0.5">{l}</label>
                          <input
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                            value={editForm[k]}
                            onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                        <select
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                          value={editForm.status}
                          onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        >
                          {AMB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSave}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                      >
                        {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                      </button>
                      <button
                        onClick={() => setEditingAmbId(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        <X size={12} className="inline mr-1" />Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatch form (toggled) */}
      {showDispatch && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-rose-500" />
              <h3 className="text-base font-semibold text-gray-800">Log Ambulance Dispatch</h3>
            </div>
            <button
              onClick={() => setShowDispatch(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={16} />
            </button>
          </div>
          <AmbulanceDispatchForm
            ambulances={ambulances}
            patients={patients}
            onSuccess={handleDispatchSuccess}
          />
        </div>
      )}

      {/* Dispatch log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-rose-500" />
            <h3 className="text-base font-semibold text-gray-800">Dispatch Log</h3>
          </div>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
        <AmbulanceDispatchTable
          dispatches={dispatches}
          loading={loading}
          canReturn={true}
          onReturn={handleReturn}
          returningId={returningId}
        />
      </div>
    </div>
  );
}
