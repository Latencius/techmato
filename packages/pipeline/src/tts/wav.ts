export type WavParts = {
  header: Uint8Array;
  data: Uint8Array;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

export function parseWavDurationSec(buffer: Uint8Array): number {
  const metadata = readWavMetadata(buffer);
  const bytesPerSecond = metadata.sampleRate * metadata.channels * (metadata.bitsPerSample / 8);

  if (bytesPerSecond <= 0) {
    throw new Error("Invalid WAV byte rate");
  }

  return metadata.dataSize / bytesPerSecond;
}

export function splitWav(buffer: Uint8Array): WavParts {
  const metadata = readWavMetadata(buffer);

  return {
    header: buffer.slice(0, metadata.dataOffset),
    data: buffer.slice(metadata.dataOffset, metadata.dataOffset + metadata.dataSize),
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    bitsPerSample: metadata.bitsPerSample,
  };
}

export function concatWav(parts: WavParts[]): Uint8Array {
  const first = parts[0];

  if (!first) {
    throw new Error("Cannot concatenate empty WAV parts");
  }

  for (const part of parts) {
    if (
      part.sampleRate !== first.sampleRate ||
      part.channels !== first.channels ||
      part.bitsPerSample !== first.bitsPerSample
    ) {
      throw new Error("Cannot concatenate WAV files with different formats");
    }
  }

  const dataSize = parts.reduce((sum, part) => sum + part.data.length, 0);
  const output = new Uint8Array(first.header.length + dataSize);
  output.set(first.header, 0);

  let offset = first.header.length;
  for (const part of parts) {
    output.set(part.data, offset);
    offset += part.data.length;
  }

  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  view.setUint32(4, output.length - 8, true);
  view.setUint32(first.header.length - 4, dataSize, true);

  return output;
}

type WavMetadata = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
};

function readWavMetadata(buffer: Uint8Array): WavMetadata {
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
  let dataOffset: number | undefined;

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
      dataOffset = chunkDataOffset;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (
    !sampleRate ||
    !channels ||
    !bitsPerSample ||
    dataOffset === undefined ||
    dataSize === undefined
  ) {
    throw new Error("Invalid WAV missing fmt or data chunk");
  }

  return { sampleRate, channels, bitsPerSample, dataOffset, dataSize };
}

function readAscii(buffer: Uint8Array, offset: number, length: number): string {
  return new TextDecoder("ascii").decode(buffer.subarray(offset, offset + length));
}
