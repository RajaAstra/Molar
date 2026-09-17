/**
 * ToothRecordContext — reusable tooth record state management.
 *
 * Provides tooth records scoped to a patient/screening across:
 * - tooth scan
 * - voice charting
 * - clinical history
 * - treatment planning
 * - patient journey
 *
 * Never duplicates tooth data across unrelated components.
 */

import { createContext, useContext, useReducer, useCallback } from 'react';
import { api } from '../api';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const initialState = {
  records: [],        // Array of tooth records
  loading: false,
  error: null,
  lastFetchParams: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, records: action.payload, lastFetchParams: action.params };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_RECORD':
      return { ...state, records: [...state.records, action.payload] };
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ToothRecordContext = createContext(null);

export function ToothRecordProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch records (for dentist: pass { patient_id, screening_id })
  const fetchRecords = useCallback(async (params = {}) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { records } = await api.getToothRecords(params);
      dispatch({ type: 'FETCH_SUCCESS', payload: records, params });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to load records' });
    }
  }, []);

  // Create a new tooth record
  const createRecord = useCallback(async (body) => {
    const { record } = await api.createToothRecord(body);
    dispatch({ type: 'ADD_RECORD', payload: record });
    return record;
  }, []);

  // Update a pending record
  const updateRecord = useCallback(async (id, body) => {
    const { record } = await api.updateToothRecord(id, body);
    dispatch({ type: 'UPDATE_RECORD', payload: record });
    return record;
  }, []);

  // Confirm a record
  const confirmRecord = useCallback(async (id) => {
    const { record } = await api.confirmToothRecord(id);
    dispatch({ type: 'UPDATE_RECORD', payload: record });
    return record;
  }, []);

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  // Grouped by tooth number for easy lookup
  const byTooth = state.records.reduce((acc, r) => {
    if (!acc[r.tooth_number]) acc[r.tooth_number] = [];
    acc[r.tooth_number].push(r);
    return acc;
  }, {});

  return (
    <ToothRecordContext.Provider
      value={{
        ...state,
        byTooth,
        fetchRecords,
        createRecord,
        updateRecord,
        confirmRecord,
        clear,
      }}
    >
      {children}
    </ToothRecordContext.Provider>
  );
}

export function useToothRecords() {
  const ctx = useContext(ToothRecordContext);
  if (!ctx) throw new Error('useToothRecords must be used within a ToothRecordProvider');
  return ctx;
}

export default ToothRecordContext;
