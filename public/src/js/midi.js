// MIDI Bluetooth controller for song navigation

var MidiController = {
  access: null,
  inputs: [],
  connected: false,
  deviceName: '',
  onNext: null,
  onPrev: null,
  onPulse: null,

  init: function () {
    // Check if Web MIDI is available
    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI not available');
      return;
    }
  },

  connect: function (onNext, onPrev, onPulse) {
    var self = this;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.onPulse = onPulse;

    if (!navigator.requestMIDIAccess) {
      showToast('Web MIDI not supported on this device', 'error');
      return;
    }

    navigator.requestMIDIAccess({ sysex: false }).then(
      function (access) {
        self.access = access;
        self.setupDevices();
        access.onstatechange = function () { self.setupDevices(); };
      },
      function (error) {
        console.error('MIDI access denied:', error);
        showToast('MIDI access denied. Check permissions.', 'error');
      }
    );
  },

  setupDevices: function () {
    var self = this;
    this.inputs = [];
    this.access.inputs.forEach(function (input) {
      self.inputs.push(input);
      input.onmidimessage = function (event) { self.handleMessage(event); };
    });

    if (this.inputs.length > 0) {
      this.connected = true;
      this.deviceName = this.inputs[0].name || 'MIDI Device';
      showToast(this.deviceName + ' connected', 'success');
    } else {
      this.connected = false;
      this.deviceName = '';
    }
  },

  handleMessage: function (event) {
    if (!event.data || event.data.length < 2) return;
    var cmd = event.data[0] & 0xf0;
    var channel = event.data[0] & 0x0f;
    var data1 = event.data[1];
    var data2 = event.data.length > 2 ? event.data[2] : 0;

    // Note On (0x90) with velocity > 0
    if (cmd === 0x90 && data2 > 0) {
      // Low notes (0-60): previous song. High notes (61-127): next song
      if (data1 <= 60 && this.onPrev) this.onPrev();
      else if (data1 > 60 && this.onNext) this.onNext();
    }

    // Control Change (0xB0) - sustain pedal or footswitch
    if (cmd === 0xB0) {
      if (data2 === 127) {
        // CC 64 (sustain): trigger pulse. Other CCs: navigate
        if (data1 === 64 && this.onPulse) this.onPulse();
        else if (data1 < 64 && this.onPrev) this.onPrev();
        else if (data1 >= 64 && this.onNext) this.onNext();
      }
    }

    // Program Change (0xC0)
    if (cmd === 0xC0) {
      if (data1 === 0 && this.onPrev) this.onPrev();
      else if (this.onNext) this.onNext();
    }
  },

  disconnect: function () {
    if (this.access) {
      this.inputs.forEach(function (input) {
        input.onmidimessage = null;
      });
      this.inputs = [];
    }
    this.connected = false;
    this.deviceName = '';
  },

  isConnected: function () {
    return this.connected;
  },

  getDeviceName: function () {
    return this.deviceName;
  }
};
