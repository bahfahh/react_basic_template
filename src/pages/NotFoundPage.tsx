import { Link } from 'react-router-dom';
import { buttonClass, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      title="找不到這個頁面"
      action={
        <Link to="/" className={buttonClass('outline')}>
          回首頁
        </Link>
      }
    >
      連結可能已失效，或任務屬於其他帳號。
    </EmptyState>
  );
}
