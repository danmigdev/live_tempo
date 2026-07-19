// Login screen component

var LoginComponent = {
  originalHtml: null,

  init: function () {
    var self = this;
    var btn = document.getElementById('btn-google-login');
    this.originalHtml = btn.innerHTML;

    btn.addEventListener('click', function () {
      btn.disabled = true;
      var span = btn.querySelector('span');
      if (span) span.textContent = I18n.t('signingIn');
      signInWithGoogle().then(function (user) {
        // Reset button regardless of outcome
        btn.disabled = false;
        btn.innerHTML = self.originalHtml;
        if (!user) {
          // User closed the popup, nothing to do
        }
      }).catch(function () {
        btn.disabled = false;
        btn.innerHTML = self.originalHtml;
        showToast(I18n.t('loginError'), 'error');
      });
    });
  },

  show: function () {
    var btn = document.getElementById('btn-google-login');
    btn.disabled = false;
    btn.innerHTML = this.originalHtml;
    showView('view-login');
  }
};
