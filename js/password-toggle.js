document.addEventListener('DOMContentLoaded', () => {
  // Register
  const toggleRegister = document.getElementById('toggle-register');
  if (toggleRegister) {
    toggleRegister.addEventListener('click', () => {
      const input = toggleRegister.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        toggleRegister.textContent = '🙈';
      } else {
        input.type = 'password';
        toggleRegister.textContent = '👁️';
      }
    });
  }

  // Login
  const toggleLogin = document.getElementById('toggle-login');
  if (toggleLogin) {
    toggleLogin.addEventListener('click', () => {
      const input = toggleLogin.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        toggleLogin.textContent = '👁️';
      } else {
        input.type = 'password';
        toggleLogin.textContent = '👁️‍🗨️';
      }
    });
  }
});