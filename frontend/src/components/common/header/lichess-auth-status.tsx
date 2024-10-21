
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import styles from './Header.module.css';

export default function LichessAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());
  const { data: lichessData, error } = useSWR('/api/user', fetcher);

  useEffect(() => {
    if (lichessData && lichessData.accessToken) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [lichessData]);

  return (
    <div className={isAuthenticated ? styles.authenticated : styles.unauthenticated}>
      {isAuthenticated ? 'Lichess Connected' : 'Connect to Lichess'}
    </div>
  );
}

