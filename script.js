
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


// Authentication system
let authMode = 'login';

const authForm = document.getElementById('authForm');
const fullNameLabel = document.getElementById('fullNameLabel');
const authFullName = document.getElementById('authFullName');
const authTitle = document.getElementById('modalTitle');
const authDescription = document.getElementById('authDescription');
const authSubmit = document.getElementById('authSubmit');
const authSwitchText = document.getElementById('authSwitchText');
const authToggle = document.getElementById('authToggle');

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';

  fullNameLabel.hidden = !isSignup;
  authTitle.textContent = isSignup ? 'Create account.' : 'Welcome back.';
  authDescription.textContent = isSignup
    ? 'Create your Supro SMM account.'
    : 'Sign in to your Supro SMM account.';
  authSubmit.textContent = isSignup ? 'Create account' : 'Sign in';
  authSwitchText.textContent = isSignup
    ? 'Already have an account?'
    : 'New to Supro SMM?';
  authToggle.textContent = isSignup ? 'Sign in' : 'Create an account';
}

authToggle.addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'signup' : 'login');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  authSubmit.disabled = true;

  try {
    if (authMode === 'signup') {
      const fullName = authFullName.value.trim();

      if (!fullName) {
        throw new Error('Please enter your full name.');
      }

      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;

      showToast('Registration submitted. Check your email to confirm.');
      authForm.reset();
      setAuthMode('login');

    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showToast('Signed in successfully.');
      closeModal();
    }

  } catch (error) {
    showToast(error.message || 'Authentication failed.');
  } finally {
    authSubmit.disabled = false;
  }
});
;
// Supabase connection
const SUPABASE_URL = 'https://cgkiddhxbkuvdyghlpfc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iDXmzZPXb4u1BtkRR1D2QQ_9wR-zsoy';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
