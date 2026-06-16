import { useEffect, useState } from 'react';
import api from '../api/axios';

export function usePatientPhoto(patientId) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let objectUrl = null;
    setLoading(true);
    api
      .get(`/patients/${patientId}/photo`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setPhotoUrl(objectUrl);
      })
      .catch(() => setPhotoUrl(null))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [patientId]);

  return { photoUrl, loading };
}
