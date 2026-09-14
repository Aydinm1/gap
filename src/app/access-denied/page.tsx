import { signOut } from '../login/actions';
export default function Denied() {
  return <main className="mx-auto max-w-lg px-6 py-24"><h1 className="text-3xl font-bold">GAP access required</h1><p className="mt-4 leading-7 text-ink-soft">Use an approved UC Davis Google account. If you believe you should have access, contact your GAP lead.</p><form action={signOut}><button className="mt-6 min-h-11 font-bold text-action">Sign out and switch accounts</button></form></main>;
}
