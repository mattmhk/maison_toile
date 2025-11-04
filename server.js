const path = require('path');
const express = require('express');
const cors = require('cors');
const { Database } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Database init
const db = new Database(path.join(__dirname, 'data', 'cafe.db'));
db.initialize();

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Availability check
app.get('/api/availability', async (req, res) => {
  const { date, time, partySize } = req.query;
  const parsedPartySize = parseInt(partySize, 10) || 0;

  if (!date || !time || parsedPartySize <= 0) {
    return res.status(400).json({ error: 'Missing or invalid date, time, or partySize' });
  }

  try {
    const { capacity, booked, remaining } = await db.getAvailability({ date, time });
    const available = remaining >= parsedPartySize;
    res.json({ date, time, capacity, booked, remaining, available });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Create reservation
app.post('/api/reservations', async (req, res) => {
  const { name, email, phone, date, time, partySize, notes } = req.body || {};
  const parsedPartySize = parseInt(partySize, 10) || 0;

  if (!name || !phone || !date || !time || parsedPartySize <= 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { remaining } = await db.getAvailability({ date, time });
    if (remaining < parsedPartySize) {
      return res.status(409).json({ error: 'Not enough availability for that time' });
    }

    const reservation = await db.createReservation({
      name,
      email: email || '',
      phone,
      date,
      time,
      partySize: parsedPartySize,
      notes: notes || ''
    });
    res.status(201).json({ ok: true, reservation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// Admin: list reservations
app.get('/api/reservations', async (req, res) => {
  const token = req.header('x-admin-token') || '';
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { date } = req.query;
  try {
    const reservations = await db.listReservations({ date: date || null });
    res.json({ reservations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list reservations' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});


