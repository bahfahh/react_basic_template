import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <p className="font-semibold">找不到這個頁面</p>
      <Link to="/" className={`${buttonClass('outline')} mt-4`}>
        回懶人包
      </Link>
    </div>
  );
}
