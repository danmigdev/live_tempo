// Login screen component

var LoginComponent = {
  originalHtml: null,

  init: function () {
    var self = this;
    var btn = document.getElementById('btn-google-login');
    this.originalHtml = btn.innerHTML;

    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      signInWithGoogle().then(function (user) {
        if (!user) {
          btn.disabled = false;
          btn.innerHTML = self.originalHtml;
        }
      }).catch(function () {
        btn.disabled = false;
        btn.innerHTML = self.originalHtml;
        showToast('Login error. Please try again.', 'error');
      });
    });
  },

  show: function () {
    showView('view-login');
  }
};
