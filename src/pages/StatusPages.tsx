import { Link } from 'react-router'

export function NotAuthorizedPage() {
  return (
    <section>
      <h1>Not authorized</h1>
      <p>You don’t have access to this page. If you think you should, ask your team manager.</p>
      <Link to="/">Go to home</Link>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/">Go to home</Link>
    </section>
  )
}
