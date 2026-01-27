import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card className="p-6">
        <div className="text-lg font-semibold text-slate-900">Page not found</div>
        <p className="mt-2 text-sm text-slate-600">The page you're looking for doesn't exist.</p>
        <div className="mt-4">
          <Link to="/">
            <Button>Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
