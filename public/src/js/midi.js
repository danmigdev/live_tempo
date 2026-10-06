// MIDI Bluetooth controller for song navigation

var MidiController = {
  access: null,
  inputs: [],
  connected: false,
  deviceName: '',
  connectedIds: {},
  announcedAt: {},
  onNext: null,
  onPrev: null,
  onPulse: null,

  init: function () {
    var self = this;
    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI not available');
      return;
    }

    // Connect once and stay connected
    navigator.requestMIDIAccess({ sysex: false }).then(
      function (access) {
        self.access = access;
        self.setupDevices();
        access.onstatechange = function () { self.setupDevices(); };
      },
      function () {
        console.log('MIDI access denied');
      }
    );
  },

  connect: function (onNext, onPrev, onPulse) {
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.onPulse = onPulse;
  },

  setupDevices: function () {
    var self = this;
    var now = Date.now();
    var available = [];
    this.inputs = [];
    this.access.inputs.forEach(function (input) {
      self.inputs.push(input);
      input.onmidimessage = function (event) { self.handleMessage(event); };
      // Chrome keeps unplugged ports in the map, marked disconnected
      if (input.state !== 'disconnected') available.push(input);
    });

    // statechange fires for every port and state change (inputs, outputs,
    // connected, open) and some USB devices drop and reconnect repeatedly:
    // announce a device when it appears, the same one at most once a minute
    var connectedIds = {};
    available.forEach(function (input) {
      connectedIds[input.id] = true;
      var last = self.announcedAt[input.id];
      if (!self.connectedIds[input.id] && (!last || now - last > 60000)) {
        self.announcedAt[input.id] = now;
        showToast((input.name || 'MIDI Device') + ' connected', 'success');
      }
    });
    this.connectedIds = connectedIds;

    this.connected = available.length > 0;
    this.deviceName = this.connected ? (available[0].name || 'MIDI Device') : '';
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
