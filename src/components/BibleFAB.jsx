import { BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollVisibility } from '../hooks/useScrollVisibility';

export default function BibleFAB() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollVisible = useScrollVisibility(location.pathname);

  if (location.pathname === '/rules') return null;

  return (
    <button
      type="button"
      className={`bible-fab ${scrollVisible ? 'visible' : 'hidden'}`}
      onClick={() => navigate('/rules')}
      aria-label="Open The Degenerate Bible"
    >
      <BookOpen size={21} strokeWidth={2.2} />
      <span>Bible</span>
    </button>
  );
}
