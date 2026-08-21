// Login screen component

var LoginComponent = {
  mode: 'signin', // 'signin' | 'signup'

  init: function () {
    var self = this;
    var form = document.getElementById('login-form');
    var emailInput = document.getElementById('login-email');
    var passwordInput = document.getElementById('login-password');
    var submitBtn = document.getElementById('btn-login-submit');
    var toggleBtn = document.getElementById('btn-toggle-mode');
    var forgotBtn = document.getElementById('btn-forgot-password');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      if (!email || !password) {
        showToast(I18n.t('errorFillFields'), 'error');
        return;
      }

      submitBtn.disabled = true;
      var submitLabel = submitBtn.querySelector('span');
      var originalLabel = submitLabel.textContent;
      submitLabel.textContent = I18n.t('signingIn');

      var action = self.mode === 'signup' ? signUpWithEmail(email, password) : signInWithEmail(email, password);
      action
        .catch(function (error) {
          showToast(self.mapError(error), 'error');
        })
        .then(function () {
          submitBtn.disabled = false;
          submitLabel.textContent = originalLabel;
        });
    });

    toggleBtn.addEventListener('click', function () {
      self.setMode(self.mode === 'signin' ? 'signup' : 'signin');
    });

    forgotBtn.addEventListener('click', function () {
      var email = emailInput.value.trim();
      if (!email) {
        showToast(I18n.t('errorFillFields'), 'error');
        return;
      }
      sendPasswordReset(email)
        .then(function () { showToast(I18n.t('resetEmailSent'), 'success'); })
        .catch(function (error) { showToast(self.mapError(error), 'error'); });
    });
  },

  setMode: function (mode) {
    this.mode = mode;
    var submitLabel = document.querySelector('#btn-login-submit span');
    var toggleBtn = document.getElementById('btn-toggle-mode');
    if (mode === 'signup') {
      submitLabel.textContent = I18n.t('signUp');
      toggleBtn.textContent = I18n.t('haveAccount');
    } else {
      submitLabel.textContent = I18n.t('signIn');
      toggleBtn.textContent = I18n.t('needAccount');
    }
  },

  mapError: function (error) {
    switch (error.code) {
      case 'auth/invalid-email': return I18n.t('errorInvalidEmail');
      case 'auth/weak-password': return I18n.t('errorWeakPassword');
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return I18n.t('errorWrongPassword');
      case 'auth/user-not-found': return I18n.t('errorUserNotFound');
      case 'auth/email-already-in-use': return I18n.t('errorEmailInUse');
      default:
        console.error('Auth error:', error);
        return I18n.t('loginError');
    }
  },

  show: function () {
    document.getElementById('login-form').reset();
    document.getElementById('btn-login-submit').disabled = false;
    this.setMode('signin');
    showView('view-login');
  }
};
