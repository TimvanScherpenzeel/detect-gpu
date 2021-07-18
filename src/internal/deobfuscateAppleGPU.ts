// Vendor
import {
  GL_ARRAY_BUFFER,
  GL_COLOR_BUFFER_BIT,
  GL_FLOAT,
  GL_FRAGMENT_SHADER,
  GL_RGBA,
  GL_STATIC_DRAW,
  GL_TRIANGLES,
  GL_UNSIGNED_BYTE,
  GL_VERTEX_SHADER,
} from 'webgl-constants';

// Internal
import { deviceInfo } from './deviceInfo';

const debug = false ? console.warn : undefined;

// Apple GPU (iOS 12.2+, Safari 14+)
// SEE: https://github.com/pmndrs/detect-gpu/issues/7
// CREDIT: https://medium.com/@Samsy/detecting-apple-a10-iphone-7-to-a11-iphone-8-and-b019b8f0eb87
// CREDIT: https://github.com/Samsy/appleGPUDetection/blob/master/index.js
export const deobfuscateAppleGPU = (
  gl: WebGLRenderingContext,
  renderer: string,
  isMobileTier: boolean
) => {
  let renderers = [renderer];

  if (isMobileTier) {
    const vertexShaderSource = /* glsl */ `
      precision highp float;
      attribute vec3 aPosition;
      varying float vvv;
      void main() {
        vvv = 0.31622776601683794;
        gl_Position = vec4(aPosition, 1.0);
      }
    `;

    const fragmentShaderSource = /* glsl */ `
      precision highp float;
      varying float vvv;
      void main() {
        vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * vvv;
        enc = fract(enc);
        enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
        gl_FragColor = enc;
      }
    `;

    const vertexShader = gl.createShader(GL_VERTEX_SHADER);
    const fragmentShader = gl.createShader(GL_FRAGMENT_SHADER);
    const program = gl.createProgram();

    if (fragmentShader && vertexShader && program) {
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(vertexShader);
      gl.compileShader(fragmentShader);
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);

      gl.linkProgram(program);

      gl.detachShader(program, vertexShader);
      gl.detachShader(program, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      gl.useProgram(program);

      const vertexArray = gl.createBuffer();
      gl.bindBuffer(GL_ARRAY_BUFFER, vertexArray);
      gl.bufferData(
        GL_ARRAY_BUFFER,
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        GL_STATIC_DRAW
      );

      const aPosition = gl.getAttribLocation(program, 'aPosition');
      gl.vertexAttribPointer(aPosition, 3, GL_FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aPosition);

      gl.clearColor(1, 1, 1, 1);
      gl.clear(GL_COLOR_BUFFER_BIT);
      gl.viewport(0, 0, 1, 1);
      gl.drawArrays(GL_TRIANGLES, 0, 3);

      const pixels = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixels);

      gl.deleteProgram(program);
      gl.deleteBuffer(vertexArray);

      renderers =
        ({
          // iPhone 11, 11 Pro, 11 Pro Max (Apple A13 GPU)
          // iPad Pro (Apple A12X GPU)
          // iPhone XS, XS Max, XR (Apple A12 GPU)
          // iPhone 8, 8 Plus (Apple A11 GPU)
          '801621810': deviceInfo?.isIpad
            ? ['apple a12x gpu']
            : [
                'apple a11 gpu',
                'apple a12 gpu',
                'apple a13 gpu',
                'apple a14 gpu',
              ],
          // iPhone SE, 6S, 6S Plus (Apple A9 GPU)
          // iPhone 7, 7 Plus (Apple A10 GPU)
          // iPad Pro (Apple A10X GPU)
          '8016218135': deviceInfo?.isIpad
            ? ['apple a9x gpu', 'apple a10 gpu', 'apple a10x gpu']
            : ['apple a9 gpu', 'apple a10 gpu'],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)[pixels.join('')] || renderers;

      debug?.(
        `iOS 12.2+ obfuscates its GPU type and version, using closest matches: ${renderers}`
      );
    }
  } else {
    debug?.('Safari 14+ obfuscates its GPU type and version, using fallback');
  }

  return renderers;
};
