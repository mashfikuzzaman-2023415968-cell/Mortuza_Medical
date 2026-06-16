import { useEffect, useState } from 'react';
import api from '../../api/axios';
import UnitsReadOnly from '../../components/UnitsReadOnly';

export default function ReceptionUnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/units')
      .then((r) => setUnits(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <UnitsReadOnly
      units={units}
      loading={loading}
      title="Medical Centre Units"
      subtitle="Departments and service units available at Mortuza Medical Centre."
    />
  );
}
