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
        if (!user) {
          btn.disabled = false;
          btn.innerHTML = self.originalHtml;
        }
      }).catch(function () {
        btn.disabled = false;
        btn.innerHTML = self.originalHtml;
        showToast(I18n.t('loginError'), 'error');
      });
    });
  },

  show: function () {
    showView('view-login');
  }
};
