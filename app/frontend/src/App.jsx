import { useEffect, useState } from 'react';

const box = { border: '1px solid #ccc', borderRadius: 6, padding: 16, marginBottom: 16 };

function EventCard({ ev, reload }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [msg, setMsg] = useState('');

  async function register(e) {
    e.preventDefault();
    const r = await fetch(`/api/events/${ev.id}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setMsg(r.ok ? 'Registration received. Your confirmation email is on its way.' : (await r.json()).error);
    if (r.ok) { setForm({ name: '', email: '' }); reload(); }
  }

  async function uploadImage(e) {
    const data = new FormData();
    data.append('image', e.target.files[0]);
    const r = await fetch(`/api/events/${ev.id}/image`, { method: 'POST', body: data });
    setMsg(r.ok ? 'Image uploaded.' : 'Upload failed.');
    if (r.ok) reload();
  }

  return (
    <div style={box}>
      {ev.image_url && <img src={ev.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 160 }} />}
      <h3>{ev.title}</h3>
      <p>{ev.venue} · {new Date(ev.starts_at).toLocaleDateString()} · {ev.registrations} registered</p>
      <form onSubmit={register}>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{' '}
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{' '}
        <button>Register</button>
      </form>
      <p><label>Event image: <input type="file" accept="image/*" onChange={uploadImage} /></label></p>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const load = () => fetch('/api/events').then((r) => r.json()).then(setEvents);
  useEffect(() => { load(); }, []);

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>CampusHub</h1>
      {events.map((ev) => <EventCard key={ev.id} ev={ev} reload={load} />)}
    </main>
  );
}
