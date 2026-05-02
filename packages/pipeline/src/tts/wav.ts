export function parseWavDurationSec(buffer: Uint8Array): number {
  if (buffer.length < 12) {
    throw new Error("Invalid WAV header");
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  if (readAscii(buffer, 0, 4) !== "RIFF") {
    throw new Error("Invalid WAV RIFF header");
  }

  if (readAscii(buffer, 8, 4) !== "WAVE") {
    throw new Error("Invalid WAV WAVE header");
  }

  let offset = 12;
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let bitsPerSample: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= buffer.length) {
    const chunkId = readAscii(buffer, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkDataOffset + chunkSize > buffer.length) {
      throw new Error(`Invalid WAV chunk size for ${chunkId}`);
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16) {
        throw new Error("Invalid WAV fmt chunk");
      }

      const audioFormat = view.getUint16(chunkDataOffset, true);

      if (audioFormat !== 1) {
        throw new Error(`Unsupported WAV audio format: ${audioFormat}`);
      }

      channels = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    }

    if (chunkId === "data") {
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || dataSize === undefined) {
    throw new Error("Invalid WAV missing fmt or data chunk");
  }

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);

  if (bytesPerSecond <= 0) {
    throw new Error("Invalid WAV byte rate");
  }

  return dataSize / bytesPerSecond;
}

function readAscii(buffer: Uint8Array, offset: number, length: number): string {
  return new TextDecoder("ascii").decode(buffer.subarray(offset, offset + length));
}
