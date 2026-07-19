// Login screen component

var LoginComponent = {
  init: function () {
    var btn = document.getElementById('btn-google-login');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = 'Accesso in corso...';
        signInWithGoogle().then(function (user) {
          if (!user) {
            btn.disabled = false;
            btn.textContent = '';
            var span = document.createElement('span');
            span.textContent = 'Accedi con Google';
            btn.appendChild(span);
          }
        }).catch(function () {
          btn.disabled = false;
          showToast('Errore durante l\'accesso. Riprova.', 'error');
        });
      });
    }
  },

  show: function () {
    showView('view-login');
  }
};
