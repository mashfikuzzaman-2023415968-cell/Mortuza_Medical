import { useEffect, useState } from 'react';
import api from '../../api/axios';
import UnitsReadOnly from '../../components/UnitsReadOnly';

export default function PatientUnitsPage() {
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
      title="Medical Centre Services"
      subtitle="The following units and departments are available at the Medical Centre. Visit the reception desk to book an appointment."
    />
  );
}
