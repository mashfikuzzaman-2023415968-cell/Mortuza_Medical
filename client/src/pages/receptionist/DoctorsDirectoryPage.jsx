import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DoctorsReadOnly from '../../components/DoctorsReadOnly';
import DoctorsAvailableNow from '../../components/DoctorsAvailableNow';

export default function ReceptionDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/doctors')
      .then((r) => setDoctors(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <DoctorsAvailableNow showPhone={true} compact={false} showGenderFilter={true} />
      <DoctorsReadOnly
        doctors={doctors}
        loading={loading}
        showPhone={true}
        title="Doctor Directory"
        subtitle="Search by name or specialization to find the right doctor for a patient's query."
      />
    </div>
  );
}
