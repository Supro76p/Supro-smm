
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const toast = document.getElementById('toast');

document.getElementById('year').textContent = new Date().getFullYear();

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

function openModal() {
  modalBackdrop.classList.add('open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  modalBackdrop.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-modal="login"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    openModal();
  });
});

modalClose.addEventListener('click', closeModal);

modalBackdrop.addEventListener('click', event => {
  if (event.target === modalBackdrop) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    showToast(
      `${link.dataset.service} category selected — demo only. Real orders are not enabled yet.`
    );
  });
});

document.getElementById('demoNotice').addEventListener('click', () => {
  showToast('Preview only — account features will be added in Phase 2.');
  closeModal();
});
// Supabase connection
const SUPABASE_URL = 'https://cgkiddhxbkuvdyghlpfc.supabase.co/rest/v1/';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iDXmzZPXb4u1BtkRR1D2QQ_9wR-zsoy';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
