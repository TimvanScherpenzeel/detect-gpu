/* eslint-disable @typescript-eslint/no-explicit-any */

// Vendor
import puppeteer from 'puppeteer';
import fs from 'fs';

// Application
import { BLOCKLISTED_GPUS } from '../src/internal/blocklistedGPUS';
import { getGPUVersion } from '../src/internal/getGPUVersion';
import { internalBenchmarkResults } from './internalBenchmarkResults';
import { BenchmarkRow } from './types';

// Package
import { version } from '../package.json';

const BENCHMARK_URL = `https://gfxbench.com/result.jsp?benchmark=gfx50&test=544&text-filter=&order=median&ff-lmobile=true&ff-smobile=true&os-Android_gl=true&os-Android_vulkan=true&os-iOS_gl=true&os-iOS_metal=true&os-Linux_gl=true&os-OS_X_gl=true&os-OS_X_metal=true&os-Windows_dx=true&os-Windows_dx12=true&os-Windows_gl=true&os-Windows_vulkan=true&pu-dGPU=true&pu-iGPU=true&pu-GPU=true&arch-ARM=true&arch-unknown=true&arch-x86=true&base=device`;

const TYPES = [
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

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const outputFile = async (name: string, content: any) => {
  const file = `./benchmarks/${name}`;
  const data = JSON.stringify(content);
  await fs.promises.writeFile(file, data);
  console.log(`Exported ${file}`);
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  let benchmarks = await getBenchmarks();
  benchmarks.push(...internalBenchmarkResults);
  benchmarks = benchmarks
    .map((benchmark) => {
      benchmark.gpu = benchmark.gpu
        .toLowerCase()
        .replace(/\s*\([^)]+(\))/g, '')
        .replace(/(\d+)\/[^ ]+/, '$1')
        .replace(
          /x\.org |inc\. |open source technology center |imagination technologies |™ |nvidia corporation |apple inc\. |advanced micro devices, inc\. | series$| edition$| graphics$/g,
          ''
        )
        .replace(/(qualcomm|adreno)[^ ] /g, 'qualcomm ')
        .replace(/qualcomm (qualcomm )+/g, 'qualcomm ')
        .trim();
      benchmark.device = benchmark.device.toLowerCase();
      return benchmark;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  await Promise.all([true, false].map(exportBenchmarks));
  await browser.close();

  async function getBenchmarks() {
    const page = await browser.newPage();

    await page.goto(BENCHMARK_URL, { waitUntil: 'networkidle2' });

    return await page.evaluate((): BenchmarkRow[] => {
      const {
        firstResult,
        deviceName,
        fpses,
        gpuNameLookup,
        screenSizeLookup,
        screenSizes,
        gpuName,
        formFactorLookup,
        formFactor,
      } = (window as unknown) as {
        firstResult: string[];
        deviceName: string[];
        fpses: string[];
        gpuNameLookup: string[];
        screenSizeLookup: string[];
        screenSizes: number[];
        gpuName: number[];
        formFactorLookup: string[];
        formFactor: number[];
      };

      return gpuName
        .map(
          (gpuIndex, index): Optional<BenchmarkRow, 'fps'> => ({
            date: firstResult[index],
            device: deviceName[index].toLowerCase(),
            fps:
              fpses[index] === ''
                ? undefined
                : Math.round(Number(fpses[index].replace(/[^\d.]+/g, ''))),
            gpu: gpuNameLookup[gpuIndex],
            mobile: formFactorLookup[formFactor[index]].includes('mobile'),
            resolution: screenSizeLookup[screenSizes[index]],
          })
        )
        .filter((row): row is BenchmarkRow => row.fps !== undefined);
    });
  }

  async function exportBenchmarks(isMobile: boolean) {
    const getOutputFilename = (type: string) =>
      `${isMobile ? 'm' : 'd'}-${type}.json`;

    const rows = benchmarks.filter(
      ({ mobile, gpu }) =>
        mobile === isMobile &&
        TYPES.filter((type): boolean => gpu.includes(type)).length > 0
    );

    const rowsByGpu = Object.values(
      rows.reduce((groupedByKey, row) => {
        const groupKey = row.gpu;
        (groupedByKey[groupKey] = groupedByKey[groupKey] || []).push(row);
        return groupedByKey;
      }, {} as Record<string, BenchmarkRow[]>)
    );

    return Promise.all([
      ...TYPES.map((type) => {
        const typeModels = rowsByGpu
          .filter(([{ gpu }]) => gpu.includes(type))
          .map((rows) => {
            const { gpu } = rows[0];
            const isBlocklisted = BLOCKLISTED_GPUS.find((blocklistedModel) =>
              gpu.includes(blocklistedModel)
            );

            return [
              gpu,
              getGPUVersion(gpu),
              isBlocklisted ? 1 : 0,
              Object.entries(
                rows.reduce(
                  (
                    fpsByResolution: { [k: string]: [string, number] },
                    { resolution, fps, device }
                  ) => {
                    fpsByResolution[resolution] = [
                      device,
                      isBlocklisted ? -1 : fps,
                    ];
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
                .sort(([aW, aH], [bW, bH]) => aW * aH - bW * bH),
            ];
          });

        if (typeModels.length === 0) {
          return Promise.resolve();
        }

        const output = [version, ...typeModels];

        return outputFile(getOutputFilename(type), output);
      }),
      // outputFile(getOutputFilename(`all-${isMobile ? 'm' : 'd'}`), rowsByGpu),
    ]);
  }
})().catch((err) => {
  throw err;
});
