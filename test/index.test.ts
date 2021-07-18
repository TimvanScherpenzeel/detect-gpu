/**
 * @jest-environment jsdom
 */

// Data
import { RENDERER_DESKTOP, RENDERER_MOBILE, RENDERER_TABLET } from './data';

// Application
import { ModelEntry } from '../src';
import { expectGPUResults, getTier } from './utils';

const isDebug = !!process.env.DEBUG;

for (const renderers of [RENDERER_MOBILE, RENDERER_TABLET, RENDERER_DESKTOP]) {
  for (const renderer of renderers) {
    test(`${renderer} -> GPUTier returns a valid tier`, async () => {
      const input = {
        isIpad: /apple.+x/i.test(renderer),
        isMobile: renderers !== RENDERER_DESKTOP,
        renderer,
      };

      const result = await getTier(input);
      const jsonResult = JSON.stringify(result, null, 2);
      const { type, tier } = result;

      if (isDebug) {
        console.log(
          `${tier === 0 ? `TIER 0` : type} -> Input: ${JSON.stringify(
            input,
            null,
            2
          )} - Output: ${jsonResult}`
        );
      }

      expect([0, 1, 2, 3]).toContain(tier);

      expect([
        'WEBGL_UNSUPPORTED',
        'BLOCKLISTED',
        'FALLBACK',
        'BENCHMARK',
      ]).toContain(type);
    });
  }
}

const topTierDesktop =
  'ANGLE (NVIDIA GeForce RTX 2080 Ti Direct3D11 vs_5_0 ps_5_0)';
test(`Top tier desktop: ${topTierDesktop}`, async () => {
  expectGPUResults(
    {
      isMobile: false,
      tier: 3,
      type: 'BENCHMARK',
    },
    await getTier({
      isMobile: false,
      renderer: topTierDesktop,
    })
  );
});

const bottomTierDesktop =
  'ANGLE (AMD Radeon(TM) HD 8280E Direct3D11 vs_5_0 ps_5_0)';

test(`Bottom tier desktop: ${bottomTierDesktop}`, async () => {
  expectGPUResults(
    {
      isMobile: false,
      tier: 0,
      type: 'BENCHMARK',
    },
    await getTier({
      isMobile: false,
      renderer: bottomTierDesktop,
    })
  );
});

// expect BENCHMARK results:
for (const { input, expected } of [
  {
    expected: {
      gpu: 'intel uhd graphics 620',
    },
    input: {
      isMobile: false,
      renderer: 'Intel UHD Graphics 620',
    },
  },
  {
    expected: {
      gpu: 'nvidia geforce rtx 2080 ti rev. a',
    },
    input: {
      isMobile: false,
      renderer: 'GeForce RTX 2080 Ti/PCIe/SSE2',
    },
  },
  {
    expected: {
      gpu: 'nvidia geforce rtx 2080 ti',
    },
    input: {
      isMobile: false,
      renderer: 'ANGLE (NVIDIA GeForce RTX 2080 Ti Direct3D11 vs_5_0 ps_5_0)',
    },
  },
  {
    expected: {
      gpu: 'amd radeon rx vega m gh',
    },
    input: {
      isMobile: false,
      renderer: 'ANGLE (Radeon RX Vega M GH Graphics Direct3D11 vs_5_0 ps_5_0)',
    },
  },
  {
    expected: {
      device: 'apple ipad pro (11-inch)',
      gpu: 'apple a12x gpu',
    },
    input: {
      isIpad: true,
      isMobile: true,
      renderer: 'Apple A12X GPU',
      screen: {
        height: 1668,
        width: 2224,
      },
    },
  },
  {
    expected: {
      gpu: 'apple a12x gpu',
    },
    input: {
      isIpad: true,
      isMobile: true,
      renderer: 'Apple A12X GPU',
    },
  },
  {
    expected: {
      gpu: 'apple a9x gpu',
    },
    input: {
      isIpad: true,
      isMobile: true,
      renderer: 'Apple a9x GPU',
    },
  },
  {
    expected: {
      gpu: 'apple a10 gpu',
    },
    input: {
      isMobile: true,
      renderer: 'Apple a10 GPU',
    },
  },
  {
    expected: {
      gpu: 'intel mesa dri intel uhd graphics 630',
    },
    input: {
      isMobile: false,
      renderer: 'Mesa DRI Intel(R) UHD Graphics 630 (Coffeelake 3x8 GT2)',
    },
  },
  {
    expected: {
      gpu: 'nvidia geforce gtx 750 ti',
    },
    input: {
      isMobile: false,
      renderer: 'GeForce GTX 750/PCIe/SSE2',
    },
  },
  {
    expected: {
      gpu: 'nvidia geforce gtx 1060',
    },
    input: {
      isMobile: false,
      renderer: 'GeForce GTX 1060',
    },
  },
  {
    expected: {
      gpu: 'radeon rx 470',
    },
    input: {
      isMobile: false,
      renderer: 'ANGLE (Radeon (TM) RX 470 Series Direct3D11 vs_5_0 ps_5_0)',
    },
  },
  {
    expected: {
      gpu: 'amd radeon hd 6470m',
    },
    input: {
      isMobile: false,
      renderer: 'ANGLE (Radeon (TM) HD 6470M Direct3D9Ex vs_3_0 ps_3_0)',
    },
  },
  {
    expected: {
      gpu: 'nvidia geforce gtx 1060',
    },
    input: {
      isMobile: false,
      renderer: 'ANGLE (NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0)',
    },
  },
  {
    expected: {
      gpu: 'nvidia tegra',
    },
    input: {
      isMobile: true,
      renderer: 'NVIDIA Tegra',
    },
  },
  {
    expected: {
      gpu: 'arm mali-g51',
    },
    input: {
      isMobile: true,
      renderer: 'Mali-G51',
    },
  },
]) {
  test(`${input.renderer} should find ${expected.gpu}`, async () => {
    expectGPUResults(
      {
        type: 'BENCHMARK',
        ...expected,
      },
      await getTier(input)
    );
  });
}

// expect FALLBACK results:
[
  {
    isMobile: true,
    renderer: 'this renderer does not exist',
  },
  {
    isMobile: false,
    renderer: 'this renderer does not exist',
  },
].map((settings) => {
  test(`${settings.renderer} should return FALLBACK`, async () => {
    expectGPUResults(
      {
        gpu: undefined,
        isMobile: settings.isMobile,
        type: 'FALLBACK',
      },
      await getTier(settings)
    );
  });
});

// expect BLOCKLISTED results:
[
  {
    input: {
      isMobile: false,
      renderer: 'ANGLE (ATI Radeon HD 5670 Direct3D11 vs_5_0 ps_5_0)',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'AMD Radeon HD 6970M OpenGL Engine',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'ANGLE (NVIDIA Quadro FX 1500 Direct3D9Ex vs_3_0 ps_3_0)',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'Intel(R) G45/G43 Express Chipset',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'PowerVR SGX 543',
    },
  },
  {
    expected: {
      gpu: 'google swiftshader',
    },
    input: {
      isMobile: false,
      renderer: 'Google SwiftShader',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'Intel GMA X3100 OpenGL Engine',
    },
  },
  {
    input: {
      isMobile: false,
      renderer: 'NVIDIA GeForce GT 120 OpenGL Engine',
    },
  },
].map(({ expected = {}, input }) => {
  test(`${input.renderer} should return BLOCKLISTED`, async () => {
    expectGPUResults(
      {
        ...expected,
        tier: 0,
        type: 'BLOCKLISTED',
      },
      await getTier(input)
    );
  });
});

test(`When queryBenchmarks throws, FALLBACK is returned`, async () => {
  expectGPUResults(
    {
      tier: 1,
      type: 'FALLBACK',
    },
    await getTier({
      loadBenchmarks: async (): Promise<ModelEntry[]> => {
        throw new Error();
      },
      renderer: bottomTierDesktop,
    })
  );
});
