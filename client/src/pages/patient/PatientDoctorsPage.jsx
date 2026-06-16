import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DoctorsReadOnly from '../../components/DoctorsReadOnly';

export default function PatientDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/doctors')
      .then((r) => setDoctors(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DoctorsReadOnly
      doctors={doctors}
      loading={loading}
      showPhone={false}
      title="Our Doctors"
      subtitle="Find a doctor by name or specialization. Contact the reception desk to schedule an appointment."
    />
  );
}
