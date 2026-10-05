// AudioWorklet processor for BpmDetector
// Mixes the microphone input down to mono and posts it in fixed-size batches.

var BATCH_SIZE = 2048;

class BpmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(BATCH_SIZE);
    this.filled = 0;
  }

  process(inputs) {
    var channels = inputs[0];
    if (channels && channels.length) {
      var frames = channels[0].length;
      for (var i = 0; i < frames; i++) {
        var sum = 0;
        for (var c = 0; c < channels.length; c++) sum += channels[c][i];
        this.batch[this.filled++] = sum / channels.length;
        if (this.filled === BATCH_SIZE) {
          this.port.postMessage(this.batch, [this.batch.buffer]);
          this.batch = new Float32Array(BATCH_SIZE);
          this.filled = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('bpm-capture', BpmCaptureProcessor);
