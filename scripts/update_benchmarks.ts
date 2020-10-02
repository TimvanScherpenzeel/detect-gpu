import puppeteer from 'puppeteer';
import fs from 'fs';

import { getEntryVersionNumber } from '../src/internal/getEntryVersionNumber';

const URL = `https://gfxbench.com/result.jsp?benchmark=gfx50&test=544&text-filter=&order=median&ff-lmobile=true&ff-smobile=true&os-Android_gl=true&os-Android_vulkan=true&os-iOS_gl=true&os-iOS_metal=true&os-Linux_gl=true&os-OS_X_gl=true&os-OS_X_metal=true&os-Windows_dx=true&os-Windows_dx12=true&os-Windows_gl=true&os-Windows_vulkan=true&pu-dGPU=true&pu-iGPU=true&pu-GPU=true&arch-ARM=true&arch-unknown=true&arch-x86=true&base=device`;

const types = [
  'adreno',
  'apple',
  'mali-t',
  'mali',
  'nvidia',
  'powervr',
  'intel',
  'amd',
  'radeon',
  'nvidia',
  'geforce',
];

const groupBy = (xs: any[], key: number | string) =>
  xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});

const getTypes = <T extends [string]>([renderer]: T) =>
  types.filter((type) => renderer.includes(type));

type BenchmarkRow = {
  device: string;
  gpu: string;
  fps: number;
  mobile: boolean;
  resolution: string;
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const benchmarks = await getBenchmarks();
  await Promise.all(
    [true, false].map((mobile) => exportBenchmarks(benchmarks, mobile))
  );
  await browser.close();

  async function getBenchmarks() {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });
    return <BenchmarkRow[]>await page.evaluate(() =>
      // @ts-ignore
      window.gpuName
        // @ts-ignore
        .map(
          (gpuIndex: number, index: number): Partial<BenchmarkRow> => ({
            // @ts-ignore
            device: window.deviceName[index],
            // @ts-ignore
            gpu: window.gpuNameLookup[gpuIndex]
              .toLowerCase()
              .replace(
                /open source technology center |imagination technologies |™ |nvidia corporation |apple inc\. |advanced micro devices, inc\. | (series|graphics|edition)$|\s*\([^\)]+(\)|$)/g,
                ''
              ),
            fps:
              // @ts-ignore
              window.fpses[index] === ''
                ? undefined
                : // @ts-ignore
                  Math.round(
                    // @ts-ignore
                    Number(window.fpses[index].replace(/[^0-9.]+/g, ''))
                  ),
            // @ts-ignore
            mobile: window.formFactorLookup[
              // @ts-ignore
              window.formFactor[index]
            ].includes('mobile'),
            // @ts-ignore
            resolution: window.screenSizeLookup[window.screenSizes[index]],
          })
        )
        .filter(
          // @ts-ignore
          ({ fps }) => fps !== undefined
        )
    );
  }

  async function exportBenchmarks(rows: BenchmarkRow[], isMobile: boolean) {
    const getOutputFilename = (type: string) =>
      `${isMobile ? 'm' : 'd'}-${type}.json`;
    rows = rows.filter(
      ({ mobile, gpu }: BenchmarkRow) =>
        mobile === isMobile &&
        types.filter((type) => gpu.includes(type)).length > 0
    );
    const rowsByGpu = Object.values(
      groupBy(rows, 'gpu') as {
        [k: string]: BenchmarkRow[];
      }
    );
    return Promise.all([
      ...types.map((type) => {
        const typeModels = rowsByGpu
          .filter(([{ gpu }]) => gpu.includes(type))
          .map((rows) => {
            const { gpu } = rows[0];
            return [
              gpu,
              getEntryVersionNumber(gpu),
              blacklistedModels.find((blacklistedModel) =>
                gpu.includes(blacklistedModel)
              )
                ? 1
                : 0,
              Object.entries(
                rows.reduce(
                  (
                    fpsByResolution: { [k: string]: [string, number] },
                    { resolution, fps, device }
                  ) => {
                    fpsByResolution[resolution] = [device, fps];
                    return fpsByResolution;
                  },
                  {}
                )
              )
                .map(([resolution, [device, fps]]) => {
                  const [width, height] = resolution.split(' x ').map(Number);
                  return isMobile
                    ? ([width, height, fps, device] as const)
                    : ([width, height, fps] as const);
                })
                .sort(([, aW, aH], [, bW, bH]) => aW * aH - bW * bH),
            ];
          });
        if (typeModels.length === 0) return;
        return outputFile(getOutputFilename(type), typeModels);
      }),
      outputFile(getOutputFilename('all'), rowsByGpu),
    ]);
  }
})().catch((err) => {
  throw err;
});

const outputFile = async (name: string, content: any) => {
  const file = `./src/data/${name}`;
  const data = JSON.stringify(content, null, 2);
  await fs.promises.writeFile(file, data);
  console.log(`Exported ${file}`);
};

// GPU BLACKLIST
// https://wiki.mozilla.org/Blocklisting/Blocked_Graphics_Drivers
// https://www.khronos.org/webgl/wiki/BlacklistsAndWhitelists
// https://chromium.googlesource.com/chromium/src/+/master/gpu/config/software_rendering_list.json
// https://chromium.googlesource.com/chromium/src/+/master/gpu/config/gpu_driver_bug_list.json
const blacklistedModels = [
  'radeon hd 6970m',
  'radeon hd 6770m',
  'radeon hd 6490m',
  'radeon hd 6630m',
  'radeon hd 6750m',
  'radeon hd 5750',
  'radeon hd 5670',
  'radeon hd 4850',
  'radeon hd 4870',
  'radeon hd 4670',
  'geforce 9400m',
  'geforce 320m',
  'geforce 330m',
  'geforce gt 130',
  'geforce gt 120',
  'geforce gtx 285',
  'geforce 8600',
  'geforce 9600m',
  'geforce 9400m',
  'geforce 8800 gs',
  'geforce 8800 gt',
  'quadro fx 5',
  'quadro fx 4',
  'radeon hd 2600',
  'radeon hd 2400',
  'radeon r9 200',
  'mali-4',
  'mali-3',
  'mali-2',
  'google swiftshader',
  'sgx543',
  'legacy',
  'sgx 543',
];