(() => {
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  async function checkAvailability(data) {
    const params = new URLSearchParams({ date: data.date, time: data.time, partySize: String(data.partySize) });
    const res = await fetch(`/api/availability?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to check availability');
    return res.json();
  }

  async function createReservation(data) {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create reservation');
    }
    return res.json();
  }

  function formToData(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.partySize = parseInt(data.partySize || '0', 10);
    return data;
  }

  // Reservation page
  const reservationForm = qs('#reservation-form');
  if (reservationForm) {
    const availabilityEl = qs('#availability');
    const checkBtn = qs('#check-btn');

    checkBtn.addEventListener('click', async () => {
      availabilityEl.textContent = 'Checking availability…';
      const data = formToData(reservationForm);
      try {
        const result = await checkAvailability(data);
        if (result.available) {
          availabilityEl.textContent = `Available — ${result.remaining} seats remain for ${result.time}.`;
          availabilityEl.classList.remove('error');
        } else {
          availabilityEl.textContent = 'Not available for the selected time. Please try another slot.';
          availabilityEl.classList.add('error');
        }
      } catch (e) {
        availabilityEl.textContent = 'Unable to check availability.';
        availabilityEl.classList.add('error');
      }
    });

    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formToData(reservationForm);
      availabilityEl.textContent = 'Submitting…';
      try {
        const result = await createReservation(data);
        reservationForm.reset();
        availabilityEl.textContent = 'Reservation confirmed. A confirmation has been recorded.';
        availabilityEl.classList.remove('error');
      } catch (e) {
        availabilityEl.textContent = e.message || 'Could not complete reservation.';
        availabilityEl.classList.add('error');
      }
    });
  }

  // Admin page
  const loadBtn = qs('#load-reservations');
  if (loadBtn) {
    const tokenInput = qs('#admin-token');
    const dateInput = qs('#list-date');
    const results = qs('#admin-results');

    loadBtn.addEventListener('click', async () => {
      results.style.display = 'block';
      results.textContent = 'Loading…';
      const params = new URLSearchParams();
      if (dateInput.value) params.set('date', dateInput.value);
      const res = await fetch(`/api/reservations?${params.toString()}`, {
        headers: { 'x-admin-token': tokenInput.value || '' }
      });
      if (!res.ok) {
        results.textContent = 'Unauthorized or failed to load.';
        return;
      }
      const data = await res.json();
      if (!data.reservations || data.reservations.length === 0) {
        results.textContent = 'No reservations found.';
        return;
      }
      results.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Date</th><th>Time</th><th>Name</th><th>Party</th><th>Phone</th><th>Email</th></tr></thead>
            <tbody>
              ${data.reservations.map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.time}</td>
                  <td>${r.name}</td>
                  <td>${r.partySize}</td>
                  <td>${r.phone}</td>
                  <td>${r.email || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    });
  }

  // Reveal on scroll
  const revealEls = qsa('.reveal');
  if (revealEls.length > 0) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el) => io.observe(el));
  }

  // Light parallax for hero background
  const hero = qs('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const y = Math.min(1, window.scrollY / 600);
      hero.style.backgroundPosition = `center ${y * 20}%`;
    }, { passive: true });
  }
})();


